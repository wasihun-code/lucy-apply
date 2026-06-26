import pytest
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import UniversityStaff
from universities.models import University


def get_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.mark.django_db
class TestStaffInvite:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def admin_user(self, university):
        return UniversityStaff.objects.create_user(
            email='admin@test.edu',
            full_name='Admin User',
            password='securepass123',
            university=university,
            permission_level='admin',
        )

    @pytest.fixture
    def admin_client(self, admin_user):
        client = APIClient()
        token = get_token_for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_invite_staff_creates_account(self, admin_client, university):
        response = admin_client.post(
            f'/api/v1/universities/{university.id}/staff/',
            {
                'email': 'newstaff@test.edu',
                'full_name': 'New Staff',
                'permission_level': 'officer',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        staff = UniversityStaff.objects.get(email='newstaff@test.edu')
        assert staff.full_name == 'New Staff'
        assert staff.permission_level == 'officer'
        assert staff.university_id == university.id
        assert staff.account_status == 'active'

    def test_invite_creates_invite_token(self, admin_client, university):
        response = admin_client.post(
            f'/api/v1/universities/{university.id}/staff/',
            {
                'email': 'tokenstaff@test.edu',
                'full_name': 'Token Staff',
                'permission_level': 'admin',
            },
            format='json',
        )
        staff = UniversityStaff.objects.get(email='tokenstaff@test.edu')
        token = staff.invite_tokens.filter(used=False).first()
        assert token is not None
        assert token.is_valid()

    def test_duplicate_email_returns_400(self, admin_client, university):
        UniversityStaff.objects.create_user(
            email='dup@test.edu',
            full_name='Existing',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        response = admin_client.post(
            f'/api/v1/universities/{university.id}/staff/',
            {
                'email': 'dup@test.edu',
                'full_name': 'Duplicate',
                'permission_level': 'officer',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_officer_cannot_invite(self, university):
        officer = UniversityStaff.objects.create_user(
            email='officer@test.edu',
            full_name='Officer',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        client = APIClient()
        token = get_token_for_user(officer)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post(
            f'/api/v1/universities/{university.id}/staff/',
            {
                'email': 'shouldfail@test.edu',
                'full_name': 'Should Fail',
                'permission_level': 'officer',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_staff(self, admin_client, university, admin_user):
        officer = UniversityStaff.objects.create_user(
            email='officer@test.edu',
            full_name='Officer',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        response = admin_client.get(
            f'/api/v1/universities/{university.id}/staff/'
        )
        assert response.status_code == status.HTTP_200_OK
        emails = [s['email'] for s in response.data]
        assert admin_user.email in emails
        assert officer.email in emails

    def test_cross_tenant_admin_cannot_invite(self, university):
        other_univ = University.objects.create(name='Other U', status='active')
        other_admin = UniversityStaff.objects.create_user(
            email='otheradmin@test.edu',
            full_name='Other Admin',
            password='securepass123',
            university=other_univ,
            permission_level='admin',
        )
        client = APIClient()
        token = get_token_for_user(other_admin)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post(
            f'/api/v1/universities/{university.id}/staff/',
            {
                'email': 'cross@test.edu',
                'full_name': 'Cross Tenant',
                'permission_level': 'officer',
            },
            format='json',
        )
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


@pytest.mark.django_db
class TestStaffRemove:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def admin_user(self, university):
        return UniversityStaff.objects.create_user(
            email='admin@test.edu',
            full_name='Admin User',
            password='securepass123',
            university=university,
            permission_level='admin',
        )

    @pytest.fixture
    def admin_client(self, admin_user):
        client = APIClient()
        token = get_token_for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    @pytest.fixture
    def target_staff(self, university):
        return UniversityStaff.objects.create_user(
            email='target@test.edu',
            full_name='Target Staff',
            password='securepass123',
            university=university,
            permission_level='officer',
        )

    def test_remove_deactivates_staff(self, admin_client, university, target_staff):
        response = admin_client.delete(
            f'/api/v1/universities/{university.id}/staff_remove/',
            {'staff_id': str(target_staff.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        target_staff.refresh_from_db()
        assert target_staff.account_status == 'deactivated'

    def test_deactivated_staff_cannot_login(self, university, target_staff):
        target_staff.account_status = 'deactivated'
        target_staff.save(update_fields=['account_status'])
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'target@test.edu',
            'password': 'securepass123',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_staff_id_returns_400(self, admin_client, university):
        response = admin_client.delete(
            f'/api/v1/universities/{university.id}/staff_remove/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_officer_cannot_remove(self, university):
        officer = UniversityStaff.objects.create_user(
            email='officer@test.edu',
            full_name='Officer',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        client = APIClient()
        token = get_token_for_user(officer)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.delete(
            f'/api/v1/universities/{university.id}/staff_remove/',
            {'staff_id': str(officer.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
