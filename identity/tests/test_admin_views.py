import pytest
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import PlatformAdmin, Applicant, UniversityStaff
from universities.models import University
from programs.models import Program, AdmissionCycle
from admissions.models import Application


def get_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.mark.django_db
class TestPlatformAdminAllUniversities:
    @pytest.fixture
    def admin_user(self):
        return PlatformAdmin.objects.create_user(
            email='admin@platform.com',
            full_name='Platform Admin',
            password='securepass123',
        )

    @pytest.fixture
    def admin_client(self, admin_user):
        client = APIClient()
        token = get_token_for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    @pytest.fixture
    def active_university(self):
        return University.objects.create(name='Active U', status='active')

    @pytest.fixture
    def inactive_university(self):
        return University.objects.create(name='Inactive U', status='inactive')

    def test_platform_admin_sees_all_universities(self, admin_client, active_university, inactive_university):
        response = admin_client.get('/api/v1/universities/')
        assert response.status_code == status.HTTP_200_OK
        names = [u['name'] for u in response.data['results']]
        assert 'Active U' in names
        assert 'Inactive U' in names

    def test_platform_admin_can_update_university_status(self, admin_client, inactive_university):
        response = admin_client.patch(
            f'/api/v1/universities/{inactive_university.id}/status/',
            {'status': 'active'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        inactive_university.refresh_from_db()
        assert inactive_university.status == 'active'

    def test_unauthenticated_user_does_not_see_inactive(self, active_university, inactive_university):
        client = APIClient()
        response = client.get('/api/v1/universities/')
        names = [u['name'] for u in response.data['results']]
        assert 'Active U' in names
        assert 'Inactive U' not in names


@pytest.mark.django_db
class TestPlatformAdminCannotDecide:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def program(self, university):
        return Program.objects.create(
            university=university, name='BSc',
            degree_level='undergraduate', fee_amount=50.00,
        )

    @pytest.fixture
    def cycle(self, program):
        from django.utils import timezone
        return AdmissionCycle.objects.create(
            university=program.university, program=program,
            name='Fall', status='open',
            open_date=timezone.now(),
            close_date=timezone.now() + timezone.timedelta(days=90),
        )

    @pytest.fixture
    def applicant(self):
        return Applicant.objects.create_user(
            email='app@test.com', full_name='App',
            password='pass123', country_of_residence='ET',
            email_verified=True,
        )

    @pytest.fixture
    def application(self, applicant, program, cycle):
        return Application.objects.create(
            applicant=applicant, program=program,
            admission_cycle=cycle, university=program.university,
            status='under_review',
        )

    @pytest.fixture
    def admin_user(self):
        return PlatformAdmin.objects.create_user(
            email='admin@platform.com',
            full_name='Platform Admin',
            password='securepass123',
        )

    @pytest.fixture
    def admin_client(self, admin_user):
        client = APIClient()
        token = get_token_for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_platform_admin_cannot_change_status(self, admin_client, application):
        response = admin_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_platform_admin_cannot_view_application_detail(self, admin_client, application):
        response = admin_client.get(
            f'/api/v1/applications/{application.id}/'
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestPlatformAdminStats:
    @pytest.fixture
    def admin_user(self):
        return PlatformAdmin.objects.create_user(
            email='admin@platform.com',
            full_name='Platform Admin',
            password='securepass123',
        )

    @pytest.fixture
    def admin_client(self, admin_user):
        client = APIClient()
        token = get_token_for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_admin_stats_returns_counts(self, admin_client):
        response = admin_client.get('/api/v1/admin/stats/')
        assert response.status_code == status.HTTP_200_OK
        for key in ('total_applicants', 'total_universities', 'total_programs', 'total_staff'):
            assert key in response.data

    def test_staff_requires_platform_admin(self):
        client = APIClient()
        response = client.get('/api/v1/admin/stats/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_users_requires_platform_admin(self):
        client = APIClient()
        response = client.get('/api/v1/admin/users/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
