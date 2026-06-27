import pytest
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import Applicant, UniversityStaff
from universities.models import University
from programs.models import Program, AdmissionCycle
from admissions.models import Application
from documents.models import ApplicationDocument
from audit.models import AuditLogEntry


def _token(user):
    return str(RefreshToken.for_user(user).access_token)


@pytest.fixture
def univ_a(db):
    return University.objects.create(name='University A', status='active')


@pytest.fixture
def univ_b(db):
    return University.objects.create(name='University B', status='active')


@pytest.fixture
def univ_a_officer(univ_a):
    return UniversityStaff.objects.create_user(
        email='officer-a@test.edu', full_name='Officer A',
        password='pass123', university=univ_a, permission_level='officer',
    )


@pytest.fixture
def univ_b_officer(univ_b):
    return UniversityStaff.objects.create_user(
        email='officer-b@test.edu', full_name='Officer B',
        password='pass123', university=univ_b, permission_level='officer',
    )


@pytest.fixture
def univ_a_admin(univ_a):
    return UniversityStaff.objects.create_user(
        email='admin-a@test.edu', full_name='Admin A',
        password='pass123', university=univ_a, permission_level='admin',
    )


@pytest.fixture
def univ_b_admin(univ_b):
    return UniversityStaff.objects.create_user(
        email='admin-b@test.edu', full_name='Admin B',
        password='pass123', university=univ_b, permission_level='admin',
    )


@pytest.fixture
def applicant_user(db):
    return Applicant.objects.create_user(
        email='applicant@test.com', full_name='Applicant',
        password='pass123', country_of_residence='ET', email_verified=True,
    )


@pytest.fixture
def univ_b_program(univ_b):
    return Program.objects.create(
        university=univ_b, name='BSc Physics', degree_level='undergraduate',
        description='Physics program',
        required_documents=[{'type': 'transcript', 'label': 'Transcript'}],
        fee_amount=50.00, status='published',
    )


@pytest.fixture
def univ_b_cycle(univ_b, univ_b_program):
    return AdmissionCycle.objects.create(
        university=univ_b, program=univ_b_program, name='Fall 2026',
        open_date=timezone.now(),
        close_date=timezone.now() + timedelta(days=90),
        status='open',
    )


@pytest.fixture
def univ_b_application(applicant_user, univ_b_program, univ_b_cycle, univ_b):
    return Application.objects.create(
        applicant=applicant_user, program=univ_b_program,
        admission_cycle=univ_b_cycle, university=univ_b,
        status='draft',
    )


@pytest.fixture
def univ_b_document(univ_b_application, univ_b):
    return ApplicationDocument.objects.create(
        application=univ_b_application, document_type='transcript',
        university=univ_b, status='pending', version=1,
    )


@pytest.fixture
def univ_a_client(univ_a_officer):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(univ_a_officer)}')
    return client


@pytest.fixture
def univ_b_client(univ_b_officer):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(univ_b_officer)}')
    return client


@pytest.fixture
def univ_a_admin_client(univ_a_admin):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(univ_a_admin)}')
    return client


@pytest.fixture
def univ_b_admin_client(univ_b_admin):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(univ_b_admin)}')
    return client


@pytest.mark.django_db
class TestCrossTenantApplicationAccess:
    def test_officer_cannot_access_other_university_application(
        self, univ_a_client, univ_b_application,
    ):
        response = univ_a_client.get(
            f'/api/v1/applications/{univ_b_application.id}/'
        )
        assert response.status_code in (403, 404)

    def test_officer_cannot_see_other_university_review_queue(
        self, univ_a_client, univ_b,
    ):
        response = univ_a_client.get(
            f'/api/v1/universities/{univ_b.id}/applications/'
        )
        assert response.status_code in (403, 404)

    def test_officer_cannot_issue_decision_on_other_university(
        self, univ_a_client, univ_b_application,
    ):
        univ_b_application.status = 'under_review'
        univ_b_application.save(update_fields=['status'])
        response = univ_a_client.patch(
            f'/api/v1/applications/{univ_b_application.id}/status/',
            {'status': 'admitted'}, format='json',
        )
        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestCrossTenantDocumentAccess:
    def test_officer_cannot_verify_other_university_document(
        self, univ_a_client, univ_b_document,
    ):
        response = univ_a_client.patch(
            f'/api/v1/documents/{univ_b_document.id}/verify/'
        )
        assert response.status_code in (403, 404)

    def test_officer_cannot_flag_other_university_document(
        self, univ_a_client, univ_b_document,
    ):
        response = univ_a_client.patch(
            f'/api/v1/documents/{univ_b_document.id}/flag/',
            {'reason': 'Bad doc'}, format='json',
        )
        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestCrossTenantProgramAccess:
    def test_admin_cannot_edit_other_university_program(
        self, univ_a_admin_client, univ_b_program,
    ):
        response = univ_a_admin_client.patch(
            f'/api/v1/programs/{univ_b_program.id}/',
            {'name': 'hacked'}, format='json',
        )
        assert response.status_code in (403, 404)

    def test_admin_cannot_create_program_for_other_university(
        self, univ_a_admin_client, univ_b,
    ):
        response = univ_a_admin_client.post(
            f'/api/v1/universities/{univ_b.id}/programs/',
            {'name': 'Rogue', 'degree_level': 'undergraduate', 'fee_amount': '50.00'},
            format='json',
        )
        assert response.status_code in (403, 404)

    def test_admin_cannot_list_other_university_programs(
        self, univ_a_admin_client, univ_b,
    ):
        response = univ_a_admin_client.get(
            f'/api/v1/universities/{univ_b.id}/programs/'
        )
        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestCrossTenantCycleAccess:
    @pytest.fixture
    def univ_b_cycle(self, univ_b, univ_b_program):
        return AdmissionCycle.objects.create(
            university=univ_b, program=univ_b_program, name='Fall 2026',
            open_date=timezone.now(),
            close_date=timezone.now() + timedelta(days=90),
            status='open',
        )

    def test_admin_cannot_update_other_university_cycle(
        self, univ_a_admin_client, univ_b_cycle,
    ):
        response = univ_a_admin_client.patch(
            f'/api/v1/admission-cycles/{univ_b_cycle.id}/',
            {'name': 'hacked'}, format='json',
        )
        assert response.status_code in (403, 404)

    def test_admin_cannot_close_other_university_cycle(
        self, univ_a_admin_client, univ_b_cycle,
    ):
        response = univ_a_admin_client.patch(
            f'/api/v1/admission-cycles/{univ_b_cycle.id}/close/'
        )
        assert response.status_code in (403, 404)

    def test_admin_cannot_create_cycle_for_other_university_program(
        self, univ_a_admin_client, univ_b_program,
    ):
        response = univ_a_admin_client.post(
            f'/api/v1/programs/{univ_b_program.id}/cycles/',
            {'name': 'Rogue Cycle',
             'open_date': timezone.now().isoformat(),
             'close_date': (timezone.now() + timedelta(days=30)).isoformat()},
            format='json',
        )
        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestCrossTenantStaffAccess:
    def test_admin_cannot_invite_staff_for_other_university(
        self, univ_a_admin_client, univ_b,
    ):
        response = univ_a_admin_client.post(
            f'/api/v1/universities/{univ_b.id}/staff/',
            {'email': 'rogue@test.edu', 'full_name': 'Rogue',
             'permission_level': 'officer'},
            format='json',
        )
        assert response.status_code in (403, 404)

    def test_admin_cannot_list_other_university_staff(
        self, univ_a_admin_client, univ_b,
    ):
        response = univ_a_admin_client.get(
            f'/api/v1/universities/{univ_b.id}/staff/'
        )
        assert response.status_code in (403, 404)

    def test_admin_cannot_remove_other_university_staff(
        self, univ_a_admin_client, univ_b, univ_b_officer,
    ):
        response = univ_a_admin_client.delete(
            f'/api/v1/universities/{univ_b.id}/staff/{univ_b_officer.id}/'
        )
        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestCrossTenantAuditLog:
    def test_admin_cannot_view_other_university_audit_log(
        self, univ_a_admin_client, univ_b,
    ):
        response = univ_a_admin_client.get(
            f'/api/v1/universities/{univ_b.id}/audit-log/'
        )
        assert response.status_code in (403, 404)
