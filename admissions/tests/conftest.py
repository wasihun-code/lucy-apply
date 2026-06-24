import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import Applicant
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
def unverified_applicant(db):
    return Applicant.objects.create_user(
        email='unverified@test.com',
        full_name='Unverified Applicant',
        password='securepass123',
        country_of_residence='Ethiopia',
        email_verified=False,
    )


@pytest.fixture
def application(applicant_user, program, admission_cycle):
    return Application.objects.create(
        applicant=applicant_user,
        program=program,
        admission_cycle=admission_cycle,
        university=program.university,
        form_data={'full_name': 'Test Applicant', 'phone': '+251911111111'},
    )


@pytest.fixture
def verified_documents(application):
    for req in application.program.required_documents:
        ApplicationDocument.objects.create(
            application=application,
            document_type=req['type'],
            university=application.university,
            status='verified',
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
def unverified_auth_client(unverified_applicant):
    client = APIClient()
    token = get_token_for_user(unverified_applicant)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client
