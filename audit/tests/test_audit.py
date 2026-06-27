import pytest
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from identity.models import Applicant, UniversityStaff, PlatformAdmin, StaffInviteToken
from universities.models import University
from programs.models import Program, AdmissionCycle
from admissions.models import Application
from documents.models import ApplicationDocument
from audit.models import AuditLogEntry


def get_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.mark.django_db
class TestAuditLogCreated:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def program(self, university):
        return Program.objects.create(
            university=university,
            name='BSc CS',
            degree_level='undergraduate',
            required_documents=[{'type': 'transcript', 'label': 'Transcript'}],
            fee_amount=50.00,
            status='published',
        )

    @pytest.fixture
    def cycle(self, program):
        from django.utils import timezone
        return AdmissionCycle.objects.create(
            university=program.university,
            program=program,
            name='Fall 2026',
            open_date=timezone.now(),
            close_date=timezone.now() + timezone.timedelta(days=90),
            status='open',
        )

    @pytest.fixture
    def applicant(self):
        return Applicant.objects.create_user(
            email='app@test.com',
            full_name='Applicant',
            password='securepass123',
            country_of_residence='Ethiopia',
            email_verified=True,
        )

    @pytest.fixture
    def application(self, applicant, program, cycle):
        return Application.objects.create(
            applicant=applicant,
            program=program,
            admission_cycle=cycle,
            university=program.university,
        )

    def test_application_status_change_creates_audit_log(self, application):
        from admissions.state_machine import transition_application
        transition_application(application, 'submitted', 'applicant', str(application.applicant.id))
        entry = AuditLogEntry.objects.filter(
            entity_type='application',
            action='application_status_change',
        ).first()
        assert entry is not None
        assert entry.after_state == {'status': 'submitted'}
        assert entry.before_state == {'status': 'draft'}
        assert str(entry.entity_id) == str(application.id)

    def test_document_verify_creates_audit_log(self, application):
        staff = UniversityStaff.objects.create_user(
            email='staff@test.edu', full_name='Staff',
            password='pass123', university=application.university,
            permission_level='officer',
        )
        doc = ApplicationDocument.objects.create(
            application=application,
            document_type='transcript',
            university=application.university,
            version=1,
            status='pending',
        )
        doc.status = 'verified'
        doc.reviewed_by = staff
        doc.save(update_fields=['status', 'reviewed_by'])
        entry = AuditLogEntry.objects.filter(
            action='document_verified',
            entity_type='application_document',
        ).first()
        assert entry is not None
        assert entry.actor_type == 'university_staff'

    def test_university_status_change_creates_audit_log(self, university):
        from rest_framework.test import APIClient
        admin = PlatformAdmin.objects.create_user(
            email='pa@test.com', full_name='PA', password='pass123',
        )
        client = APIClient()
        token = get_token_for_user(admin)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.patch(
            f'/api/v1/universities/{university.id}/status/',
            {'status': 'inactive'}, format='json',
        )
        assert response.status_code == 200
        entry = AuditLogEntry.objects.filter(
            action='university_status_change',
            entity_type='university',
            entity_id=university.id,
        ).first()
        assert entry is not None
        assert entry.before_state == {'status': 'active'}
        assert entry.after_state == {'status': 'inactive'}
        assert entry.actor_type == 'platform_admin'

    def test_staff_invite_creates_audit_log(self, university):
        from rest_framework.test import APIClient
        staff_admin = UniversityStaff.objects.create_user(
            email='admin@test.edu', full_name='Admin',
            password='pass123', university=university,
            permission_level='admin',
        )
        client = APIClient()
        token = get_token_for_user(staff_admin)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post(
            f'/api/v1/universities/{university.id}/staff/',
            {'email': 'newstaff@test.edu', 'full_name': 'New Staff', 'permission_level': 'officer'},
            format='json',
        )
        assert response.status_code == 201
        entry = AuditLogEntry.objects.filter(
            action='staff_invited',
            entity_type='university_staff',
        ).order_by('-created_at').first()
        assert entry is not None
        assert entry.actor_type == 'university_staff'
        assert entry.after_state['email'] == 'newstaff@test.edu'
        assert entry.after_state['account_status'] == 'active'

    def test_staff_deactivation_creates_audit_log(self, university):
        from rest_framework.test import APIClient
        staff_admin = UniversityStaff.objects.create_user(
            email='admin2@test.edu', full_name='Admin2',
            password='pass123', university=university,
            permission_level='admin',
        )
        target = UniversityStaff.objects.create_user(
            email='target@test.edu', full_name='Target',
            password='pass123', university=university,
            permission_level='officer',
        )
        client = APIClient()
        token = get_token_for_user(staff_admin)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.delete(
            f'/api/v1/universities/{university.id}/staff/{target.id}/',
        )
        assert response.status_code == 200
        entry = AuditLogEntry.objects.filter(
            action='staff_deactivated',
            entity_type='university_staff',
            entity_id=target.id,
        ).first()
        assert entry is not None
        assert entry.actor_type == 'university_staff'
        assert entry.before_state == {'account_status': 'active'}
        assert entry.after_state == {'account_status': 'deactivated'}


@pytest.mark.django_db
class TestAuditLogView:
    @pytest.fixture
    def university(self):
        return University.objects.create(name='Test U', status='active')

    @pytest.fixture
    def other_university(self):
        return University.objects.create(name='Other U', status='active')

    @pytest.fixture
    def platform_admin(self):
        return PlatformAdmin.objects.create_user(
            email='admin@platform.com',
            full_name='Platform Admin',
            password='securepass123',
        )

    @pytest.fixture
    def admin_client(self, platform_admin):
        client = APIClient()
        token = get_token_for_user(platform_admin)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    @pytest.fixture
    def staff(self, university):
        return UniversityStaff.objects.create_user(
            email='staff@test.edu', full_name='Staff',
            password='pass123', university=university,
            permission_level='admin',
        )

    @pytest.fixture
    def staff_client(self, staff):
        client = APIClient()
        token = get_token_for_user(staff)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_platform_admin_can_view_all_audit_logs(self, admin_client, university, other_university):
        AuditLogEntry.objects.create(
            actor_type='system', action='test', entity_type='test',
            entity_id=university.id, university=university,
            after_state={'status': 'ok'},
        )
        AuditLogEntry.objects.create(
            actor_type='system', action='test', entity_type='test',
            entity_id=other_university.id, university=other_university,
            after_state={'status': 'ok'},
        )
        response = admin_client.get('/api/v1/admin/audit-log/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_university_admin_can_view_scoped_audit_log(self, staff_client, university, other_university):
        AuditLogEntry.objects.create(
            actor_type='system', action='test', entity_type='test',
            entity_id=university.id, university=university,
            after_state={'status': 'ok'},
        )
        AuditLogEntry.objects.create(
            actor_type='system', action='test', entity_type='test',
            entity_id=other_university.id, university=other_university,
            after_state={'status': 'ok'},
        )
        response = staff_client.get(
            f'/api/v1/universities/{university.id}/audit-log/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
