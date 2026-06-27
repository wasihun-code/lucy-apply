import pytest
from rest_framework.test import APIClient
from rest_framework import status

from identity.models import Applicant, UniversityStaff
from universities.models import University


@pytest.mark.django_db
class TestDeactivatedLogin:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def active_applicant(self):
        return Applicant.objects.create_user(
            email='active@test.com',
            full_name='Active User',
            password='securepass123',
            country_of_residence='Ethiopia',
        )

    @pytest.fixture
    def deactivated_applicant(self):
        return Applicant.objects.create_user(
            email='deactivated@test.com',
            full_name='Deactivated User',
            password='securepass123',
            country_of_residence='Ethiopia',
            account_status='deactivated',
        )

    @pytest.fixture
    def deactivated_staff(self, university):
        return UniversityStaff.objects.create_user(
            email='staff@test.com',
            full_name='Deactivated Staff',
            password='securepass123',
            university=university,
            permission_level='officer',
            account_status='deactivated',
        )

    def test_active_applicant_can_login(self, active_applicant):
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'active@test.com',
            'password': 'securepass123',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_deactivated_applicant_returns_403(self, deactivated_applicant):
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'deactivated@test.com',
            'password': 'securepass123',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_deactivated_staff_returns_403(self, deactivated_staff):
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'staff@test.com',
            'password': 'securepass123',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_wrong_password_still_returns_401(self, active_applicant):
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'active@test.com',
            'password': 'wrongpassword',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_nonexistent_email_returns_401(self):
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'noone@test.com',
            'password': 'somepassword',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
