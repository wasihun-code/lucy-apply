from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import Applicant, PlatformAdmin, UniversityStaff
from identity.permissions import MFAVerified
from universities.models import University


def get_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.mark.django_db
class TestMFASetupView:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def staff_user(self, university):
        return UniversityStaff.objects.create_user(
            email='staff@test.edu',
            full_name='Staff User',
            password='securepass123',
            university=university,
            permission_level='officer',
        )

    @pytest.fixture
    def staff_client(self, staff_user):
        client = APIClient()
        token = get_token_for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_first_call_creates_device_and_returns_uri(self, staff_client, staff_user):
        response = staff_client.post('/api/v1/auth/mfa/setup/', format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'provisioning_uri' in response.data
        assert staff_user.totpdevice_set.count() == 1

    def test_second_call_idempotent(self, staff_client, staff_user):
        staff_client.post('/api/v1/auth/mfa/setup/', format='json')
        assert staff_user.totpdevice_set.count() == 1
        response = staff_client.post('/api/v1/auth/mfa/setup/', format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'provisioning_uri' in response.data
        assert staff_user.totpdevice_set.count() == 1

    def test_applicant_allowed(self):
        applicant = Applicant.objects.create_user(
            email='app@test.com', full_name='App',
            password='pass123', country_of_residence='ET',
        )
        client = APIClient()
        token = get_token_for_user(applicant)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post('/api/v1/auth/mfa/setup/', format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'provisioning_uri' in response.data


@pytest.mark.django_db
class TestMFAVerifyView:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def staff_user(self, university):
        return UniversityStaff.objects.create_user(
            email='staff@test.edu',
            full_name='Staff User',
            password='securepass123',
            university=university,
            permission_level='officer',
        )

    @pytest.fixture
    def staff_client(self, staff_user):
        client = APIClient()
        token = get_token_for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    @pytest.fixture
    def device(self, staff_user):
        return TOTPDevice.objects.create(user=staff_user, name='default')

    def test_successful_verify_sets_session(self, staff_client, staff_user, device):
        with patch.object(TOTPDevice, 'verify_token', return_value=True):
            response = staff_client.post(
                '/api/v1/auth/mfa/verify/',
                {'code': '123456'},
                format='json',
            )
            assert response.status_code == status.HTTP_200_OK
            assert response.data['detail'] == 'MFA verified successfully'

    def test_wrong_code_returns_400_with_remaining(self, staff_client, staff_user, device):
        with patch.object(TOTPDevice, 'verify_token', return_value=False):
            response = staff_client.post(
                '/api/v1/auth/mfa/verify/',
                {'code': '000000'},
                format='json',
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert 'remaining_attempts' in response.data

    def test_applicant_allowed(self):
        applicant = Applicant.objects.create_user(
            email='app@test.com', full_name='App',
            password='pass123', country_of_residence='ET',
        )
        client = APIClient()
        token = get_token_for_user(applicant)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post('/api/v1/auth/mfa/verify/', {'code': '123456'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAuthMeMFAFields:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def staff_user(self, university):
        return UniversityStaff.objects.create_user(
            email='staff@test.edu',
            full_name='Staff User',
            password='securepass123',
            university=university,
            permission_level='officer',
        )

    @pytest.fixture
    def admin_user(self):
        return PlatformAdmin.objects.create_user(
            email='admin@platform.com',
            full_name='Platform Admin',
            password='securepass123',
        )

    def test_staff_mfa_enabled_when_device_exists(self, staff_user):
        TOTPDevice.objects.create(user=staff_user, name='default')
        client = APIClient()
        token = get_token_for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['mfa_enabled'] is True

    def test_staff_mfa_verified_when_in_session(self, staff_user):
        TOTPDevice.objects.create(user=staff_user, name='default')
        client = APIClient()
        token = get_token_for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        session = client.session
        session['mfa_verified'] = True
        session.save()
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['mfa_verified'] is True

    def test_staff_mfa_not_verified_when_not_in_session(self, staff_user):
        client = APIClient()
        token = get_token_for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.get('/api/v1/auth/me/')
        assert response.data['mfa_verified'] is False

    def test_applicant_has_no_mfa_fields(self):
        applicant = Applicant.objects.create_user(
            email='app@test.com', full_name='App',
            password='pass123', country_of_residence='ET',
        )
        client = APIClient()
        token = get_token_for_user(applicant)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.get('/api/v1/auth/me/')
        assert 'mfa_enabled' not in response.data
        assert 'mfa_verified' not in response.data


@pytest.mark.django_db
class TestMFAVerifiedPermission:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    def test_staff_with_mfa_verified_passes(self, university):
        staff = UniversityStaff.objects.create_user(
            email='staff@test.edu',
            full_name='Staff User',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = staff
        request.session = {'mfa_verified': True}
        with patch.object(settings, 'TESTING', False):
            perm = MFAVerified()
            assert perm.has_permission(request, None) is True

    def test_staff_without_mfa_verified_denied(self, university):
        staff = UniversityStaff.objects.create_user(
            email='staff@test.edu',
            full_name='Staff User',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = staff
        request.session = {}
        with patch.object(settings, 'TESTING', False):
            perm = MFAVerified()
            assert perm.has_permission(request, None) is False

    def test_testing_setting_bypasses_check(self, university):
        staff = UniversityStaff.objects.create_user(
            email='staff@test.edu',
            full_name='Staff User',
            password='securepass123',
            university=university,
            permission_level='officer',
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = staff
        request.session = {}
        with patch.object(settings, 'TESTING', True):
            perm = MFAVerified()
            assert perm.has_permission(request, None) is True

    def test_applicant_always_passes(self):
        applicant = Applicant.objects.create_user(
            email='app@test.com', full_name='App',
            password='pass123', country_of_residence='ET',
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = applicant
        request.session = {}
        with patch.object(settings, 'TESTING', False):
            perm = MFAVerified()
            assert perm.has_permission(request, None) is True

    def test_unauthenticated_denied(self):
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = AnonymousUser()
        request.session = {}
        with patch.object(settings, 'TESTING', False):
            perm = MFAVerified()
            assert perm.has_permission(request, None) is False
