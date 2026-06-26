import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch

from identity.models import Applicant, UniversityStaff, PlatformAdmin
from universities.models import University
from programs.models import Program, AdmissionCycle
from admissions.models import Application
from documents.models import ApplicationDocument
from payments.models import Payment


@pytest.fixture(autouse=True)
def patch_celery_tasks():
    with patch('notifications.tasks.send_application_submitted_email.delay'), \
         patch('notifications.tasks.send_decision_email.delay'), \
         patch('notifications.tasks.send_offer_response_email.delay'), \
         patch('notifications.tasks.send_document_flagged_email.delay'), \
         patch('notifications.tasks.send_verification_email.delay'):
        yield


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


@pytest.fixture
def application_with_pending_payment(application):
    Payment.objects.create(
        university=application.university,
        application=application,
        amount=application.program.fee_amount,
        currency='USD',
        processor_reference='secret_mock_pending',
        status='pending',
        initiated_at=timezone.now(),
    )
    return application


@pytest.fixture
def application_with_docs_no_payment(application):
    for req in application.program.required_documents:
        ApplicationDocument.objects.create(
            application=application,
            document_type=req['type'],
            university=application.university,
            status='pending',
            version=1,
        )
    return application


@pytest.fixture
def other_university(db):
    return University.objects.create(
        name='Other University',
        description='A different university',
        status='active',
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
def platform_admin_user(db):
    return PlatformAdmin.objects.create_user(
        email='admin@platform.com',
        full_name='Platform Admin',
        password='securepass123',
    )


@pytest.fixture
def platform_admin_client(platform_admin_user):
    client = APIClient()
    token = get_token_for_user(platform_admin_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def admitted_application(application):
    app = application
    app.status = 'admitted'
    app.submitted_at = timezone.now() - timedelta(days=1)
    app.decision_at = timezone.now()
    app.save(update_fields=['status', 'submitted_at', 'decision_at', 'updated_at'])
    return app


@pytest.fixture
def responded_application(admitted_application):
    app = admitted_application
    app.offer_response_at = timezone.now()
    app.save(update_fields=['offer_response_at', 'updated_at'])
    return app


@pytest.fixture
def application_with_docs_and_pending_payment(application_with_pending_payment):
    app = application_with_pending_payment
    for req in app.program.required_documents:
        ApplicationDocument.objects.create(
            application=app,
            document_type=req['type'],
            university=app.university,
            status='pending',
            version=1,
        )
    return app
