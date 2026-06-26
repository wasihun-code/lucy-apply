import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import Applicant, UniversityStaff
from universities.models import University
from programs.models import Program, AdmissionCycle
from admissions.models import Application
from documents.models import ApplicationDocument


@pytest.fixture
def university(db):
    return University.objects.create(
        name='Test University',
        description='A test university',
        status='active',
    )


@pytest.fixture
def program(university):
    return Program.objects.create(
        university=university,
        name='BSc Computer Science',
        degree_level='undergraduate',
        description='A CS program',
        required_documents=[
            {'type': 'transcript', 'label': 'Official Transcript'},
            {'type': 'id_document', 'label': 'Passport Copy'},
        ],
        fee_amount=50.00,
        status='published',
    )


@pytest.fixture
def admission_cycle(program):
    return AdmissionCycle.objects.create(
        university=program.university,
        program=program,
        name='Fall 2026',
        open_date=timezone.now(),
        close_date=timezone.now() + timedelta(days=90),
        status='open',
    )


@pytest.fixture
def applicant_user(db):
    return Applicant.objects.create_user(
        email='applicant@test.com',
        full_name='Test Applicant',
        password='securepass123',
        country_of_residence='Ethiopia',
        email_verified=True,
    )


@pytest.fixture
def other_applicant_user(db):
    return Applicant.objects.create_user(
        email='other@test.com',
        full_name='Other Applicant',
        password='securepass123',
        country_of_residence='Kenya',
        email_verified=True,
    )


@pytest.fixture
def application(applicant_user, program, admission_cycle):
    return Application.objects.create(
        applicant=applicant_user,
        program=program,
        admission_cycle=admission_cycle,
        university=program.university,
    )


@pytest.fixture
def existing_document(application):
    return ApplicationDocument.objects.create(
        application=application,
        document_type='transcript',
        university=application.university,
        version=1,
    )


def get_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.fixture
def auth_client(applicant_user):
    client = APIClient()
    token = get_token_for_user(applicant_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def other_auth_client(other_applicant_user):
    client = APIClient()
    token = get_token_for_user(other_applicant_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


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
def other_university(db):
    from universities.models import University
    return University.objects.create(
        name='Other University',
        description='A different university',
        status='active',
    )


@pytest.fixture
def other_staff_officer(other_university):
    return UniversityStaff.objects.create_user(
        email='officer@other.edu',
        full_name='Other Officer',
        password='securepass123',
        university=other_university,
        permission_level='officer',
    )


@pytest.fixture
def officer_client(staff_officer):
    client = APIClient()
    token = get_token_for_user(staff_officer)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def other_officer_client(other_staff_officer):
    client = APIClient()
    token = get_token_for_user(other_staff_officer)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def unauth_client():
    return APIClient()
