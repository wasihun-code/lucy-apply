import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from universities.models import University
from programs.models import Program, AdmissionCycle
from identity.models import UniversityStaff


@pytest.fixture
def university(db):
    return University.objects.create(
        name='Test University',
        description='A test university',
        status='active',
    )


@pytest.fixture
def other_university(db):
    return University.objects.create(
        name='Other University',
        description='A different university',
        status='active',
    )


@pytest.fixture
def published_program(university):
    return Program.objects.create(
        university=university,
        name='BSc Computer Science',
        degree_level='undergraduate',
        description='A CS program',
        required_documents=[
            {'type': 'transcript', 'label': 'Official Transcript'},
        ],
        fee_amount=50.00,
        status='published',
    )


@pytest.fixture
def draft_program(university):
    return Program.objects.create(
        university=university,
        name='MSc Data Science',
        degree_level='postgraduate',
        description='A data science program',
        fee_amount=75.00,
        status='draft',
    )


@pytest.fixture
def open_cycle(published_program):
    return AdmissionCycle.objects.create(
        university=published_program.university,
        program=published_program,
        name='Fall 2026',
        open_date=timezone.now(),
        close_date=timezone.now() + timedelta(days=90),
        status='open',
    )


@pytest.fixture
def scheduled_cycle(published_program):
    return AdmissionCycle.objects.create(
        university=published_program.university,
        program=published_program,
        name='Winter 2027',
        open_date=timezone.now() + timedelta(days=30),
        close_date=timezone.now() + timedelta(days=120),
        status='scheduled',
    )


def get_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.fixture
def staff_admin(university):
    return UniversityStaff.objects.create_user(
        email='admin@test.edu',
        full_name='Admin User',
        password='securepass123',
        university=university,
        permission_level='admin',
    )


@pytest.fixture
def staff_officer(university):
    return UniversityStaff.objects.create_user(
        email='officer@test.edu',
        full_name='Officer User',
        password='securepass123',
        university=university,
        permission_level='officer',
    )


@pytest.fixture
def other_staff_admin(other_university):
    return UniversityStaff.objects.create_user(
        email='admin@other.edu',
        full_name='Other Admin',
        password='securepass123',
        university=other_university,
        permission_level='admin',
    )


@pytest.fixture
def admin_client(staff_admin):
    client = APIClient()
    token = get_token_for_user(staff_admin)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def officer_client(staff_officer):
    client = APIClient()
    token = get_token_for_user(staff_officer)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def other_admin_client(other_staff_admin):
    client = APIClient()
    token = get_token_for_user(other_staff_admin)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client