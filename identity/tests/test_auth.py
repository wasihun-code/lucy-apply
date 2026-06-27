import pytest
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import Applicant, EmailVerificationToken, UniversityStaff, PlatformAdmin, StaffInviteToken
from ..permissions import IsEmailVerified
from universities.models import University


@pytest.mark.django_db
class TestRegistration:
    def test_creates_unverified_applicant(self):
        client = APIClient()
        data = {
            'email': 'student@test.com',
            'full_name': 'Test Student',
            'password': 'securepass123',
            'country_of_residence': 'Ethiopia',
        }
        response = client.post('/api/v1/auth/register/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        applicant = Applicant.objects.get(email='student@test.com')
        assert applicant.email_verified is False

    def test_duplicate_email_returns_400(self):
        client = APIClient()
        data = {
            'email': 'student@test.com',
            'full_name': 'Test Student',
            'password': 'securepass123',
            'country_of_residence': 'Ethiopia',
        }
        client.post('/api/v1/auth/register/', data, format='json')
        response = client.post('/api/v1/auth/register/', data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_required_fields_returns_400(self):
        client = APIClient()
        response = client.post(
            '/api/v1/auth/register/', {'email': 'student@test.com'}, format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    def test_returns_jwt_tokens(self):
        Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        client = APIClient()
        response = client.post(
            '/api/v1/auth/login/',
            {'email': 'student@test.com', 'password': 'securepass123'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_wrong_password_returns_401(self):
        Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        client = APIClient()
        response = client.post(
            '/api/v1/auth/login/',
            {'email': 'student@test.com', 'password': 'wrongpassword'},
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestEmailVerification:
    def test_verify_sets_email_verified(self):
        applicant = Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        token = EmailVerificationToken.objects.create(applicant=applicant)
        client = APIClient()
        response = client.post(
            '/api/v1/auth/verify-email/',
            {'email': 'student@test.com', 'token': token.token},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        applicant.refresh_from_db()
        assert applicant.email_verified is True

    def test_expired_token_returns_400(self):
        from django.utils import timezone
        from datetime import timedelta

        applicant = Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        token = EmailVerificationToken.objects.create(
            applicant=applicant,
            expires_at=timezone.now() - timedelta(hours=1),
        )
        client = APIClient()
        response = client.post(
            '/api/v1/auth/verify-email/',
            {'email': 'student@test.com', 'token': token.token},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_token_returns_400(self):
        applicant = Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        client = APIClient()
        response = client.post(
            '/api/v1/auth/verify-email/',
            {'email': applicant.email, 'token': 'invalid-token'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_with_case_insensitive_email(self):
        applicant = Applicant.objects.create_user(
            email='Student@Test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        token = EmailVerificationToken.objects.create(applicant=applicant)
        client = APIClient()
        response = client.post(
            '/api/v1/auth/verify-email/',
            {'email': 'student@test.com', 'token': token.token},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        applicant.refresh_from_db()
        assert applicant.email_verified is True

    def test_verify_with_mixed_case_email_in_request(self):
        applicant = Applicant.objects.create_user(
            email='alice@example.com',
            full_name='Alice',
            password='securepass123',
            country_of_residence='Ethiopia',
        )
        token = EmailVerificationToken.objects.create(applicant=applicant)
        client = APIClient()
        response = client.post(
            '/api/v1/auth/verify-email/',
            {'email': 'ALICE@EXAMPLE.COM', 'token': token.token},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        applicant.refresh_from_db()
        assert applicant.email_verified is True


@pytest.mark.django_db
class TestAuthMe:
    def test_applicant_returns_role(self):
        applicant = Applicant.objects.create_user(
            email='student@test.com', full_name='Test Student',
            password='securepass123', country_of_residence='Ethiopia',
        )
        client = APIClient()
        refresh = RefreshToken.for_user(applicant)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['role'] == 'applicant'
        assert response.data['email'] == 'student@test.com'

    def test_staff_returns_role_with_university(self):
        university = University.objects.create(name='Test U', status='active')
        staff = UniversityStaff.objects.create_user(
            email='staff@test.edu', full_name='Staff',
            password='securepass123', university=university,
            permission_level='officer',
        )
        client = APIClient()
        refresh = RefreshToken.for_user(staff)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['role'] == 'universitystaff'
        assert response.data['university_name'] == 'Test U'
        assert response.data['permission_level'] == 'officer'

    def test_platform_admin_returns_role(self):
        admin = PlatformAdmin.objects.create_user(
            email='admin@platform.com', full_name='Platform Admin',
            password='securepass123',
        )
        client = APIClient()
        refresh = RefreshToken.for_user(admin)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['role'] == 'platformadmin'

    def test_unauthenticated_returns_401(self):
        client = APIClient()
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_set_staff_password_success():
    university = University.objects.create(name='Test U', status='active')
    staff = UniversityStaff.objects.create_user(
        email='staff@test.edu', full_name='New Staff',
        password='', university=university,
        permission_level='officer',
    )
    token = StaffInviteToken.objects.create(university_staff=staff)
    client = APIClient()
    response = client.post('/api/v1/auth/set-staff-password/', {
        'token': token.token,
        'new_password': 'newsecurepass123',
    }, format='json')
    assert response.status_code == status.HTTP_200_OK
    staff.refresh_from_db()
    assert staff.has_usable_password()
    token.refresh_from_db()
    assert token.used is True


@pytest.mark.django_db
def test_set_staff_password_short_password():
    university = University.objects.create(name='Test U', status='active')
    staff = UniversityStaff.objects.create_user(
        email='staff@test.edu', full_name='New Staff',
        password='', university=university,
        permission_level='officer',
    )
    token = StaffInviteToken.objects.create(university_staff=staff)
    client = APIClient()
    response = client.post('/api/v1/auth/set-staff-password/', {
        'token': token.token,
        'new_password': 'short',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_set_staff_password_expired_token():
    from django.utils import timezone
    from datetime import timedelta
    university = University.objects.create(name='Test U', status='active')
    staff = UniversityStaff.objects.create_user(
        email='staff@test.edu', full_name='New Staff',
        password='', university=university,
        permission_level='officer',
    )
    token = StaffInviteToken.objects.create(
        university_staff=staff,
        expires_at=timezone.now() - timedelta(hours=1),
    )
    client = APIClient()
    response = client.post('/api/v1/auth/set-staff-password/', {
        'token': token.token,
        'new_password': 'newsecurepass123',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_set_staff_password_invalid_token():
    client = APIClient()
    response = client.post('/api/v1/auth/set-staff-password/', {
        'token': 'nonexistent-token',
        'new_password': 'newsecurepass123',
    }, format='json')
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_set_staff_password_already_used_token():
    university = University.objects.create(name='Test U', status='active')
    staff = UniversityStaff.objects.create_user(
        email='staff@test.edu', full_name='New Staff',
        password='', university=university,
        permission_level='officer',
    )
    token = StaffInviteToken.objects.create(university_staff=staff, used=True)
    client = APIClient()
    response = client.post('/api/v1/auth/set-staff-password/', {
        'token': token.token,
        'new_password': 'newsecurepass123',
    }, format='json')
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestIsEmailVerifiedPermission:
    def test_blocks_unverified_applicant(self):
        applicant = Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
            email_verified=False,
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = applicant
        perm = IsEmailVerified()
        assert perm.has_permission(request, None) is False

    def test_allows_verified_applicant(self):
        applicant = Applicant.objects.create_user(
            email='student@test.com',
            full_name='Test Student',
            password='securepass123',
            country_of_residence='Ethiopia',
            email_verified=True,
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = applicant
        perm = IsEmailVerified()
        assert perm.has_permission(request, None) is True

    def test_rejects_non_applicant_user(self):
        from ..models import User
        user = User.objects.create_user(
            email='staff@test.com',
            full_name='Staff User',
            password='securepass123',
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = user
        perm = IsEmailVerified()
        assert perm.has_permission(request, None) is False

    def test_rejects_unauthenticated(self):
        factory = APIRequestFactory()
        request = factory.get('/')
        from django.contrib.auth.models import AnonymousUser
        request.user = AnonymousUser()
        perm = IsEmailVerified()
        assert perm.has_permission(request, None) is False
