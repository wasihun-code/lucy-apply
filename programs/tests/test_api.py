import pytest
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from django.utils import timezone

from programs.models import AdmissionCycle


@pytest.mark.django_db
class TestProgramPublicAPI:
    def test_list_published_programs(self, published_program, draft_program):
        client = APIClient()
        response = client.get('/api/v1/programs/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['name'] == 'BSc Computer Science'

    def test_draft_program_not_in_list(self, published_program, draft_program):
        client = APIClient()
        response = client.get('/api/v1/programs/')
        ids = [p['id'] for p in response.data['results']]
        assert str(draft_program.id) not in ids

    def test_filter_by_degree_level(self, published_program, university):
        from programs.models import Program
        Program.objects.create(
            university=university,
            name='MSc Engineering',
            degree_level='postgraduate',
            fee_amount=70.00,
            status='published',
        )
        client = APIClient()
        response = client.get('/api/v1/programs/?degree_level=undergraduate')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert all(p['degree_level'] == 'undergraduate' for p in results)

    def test_filter_by_university(self, published_program, draft_program, university):
        client = APIClient()
        response = client.get(f'/api/v1/programs/?university={university.id}')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1

    def test_retrieve_program_detail(self, published_program, open_cycle):
        client = APIClient()
        response = client.get(f'/api/v1/programs/{published_program.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'required_documents' in response.data
        assert 'open_cycles' in response.data
        assert 'university_name' in response.data

    def test_program_list_returns_expected_fields(self, published_program):
        client = APIClient()
        response = client.get('/api/v1/programs/')
        result = response.data['results'][0]
        assert 'id' in result
        assert 'name' in result
        assert 'degree_level' in result
        assert 'university_name' in result
        assert 'fee_amount' in result
        assert 'fee_currency' in result
        assert 'status' in result

    def test_program_detail_includes_open_cycles(self, published_program, open_cycle):
        client = APIClient()
        response = client.get(f'/api/v1/programs/{published_program.id}/')
        assert len(response.data['open_cycles']) == 1
        assert response.data['open_cycles'][0]['name'] == 'Fall 2026'


@pytest.mark.django_db
class TestProgramAdminAPI:
    def test_admin_can_create_program(self, admin_client, university):
        response = admin_client.post(f'/api/v1/universities/{university.id}/programs/', {
            'name': 'New Program',
            'degree_level': 'undergraduate',
            'description': 'Brand new program',
            'fee_amount': '100.00',
            'fee_currency': 'USD',
            'required_documents': [],
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Program'
        assert response.data['degree_level'] == 'undergraduate'

    def test_admin_can_update_program(self, admin_client, draft_program):
        response = admin_client.patch(f'/api/v1/programs/{draft_program.id}/', {
            'name': 'Updated Name',
            'fee_amount': '120.00',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Name'

    def test_admin_can_publish_program(self, admin_client, draft_program):
        response = admin_client.patch(f'/api/v1/programs/{draft_program.id}/status/', {
            'status': 'published',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'published'

    def test_create_program_sets_university_from_parent(self, admin_client, university):
        response = admin_client.post(f'/api/v1/universities/{university.id}/programs/', {
            'name': 'Auto University',
            'degree_level': 'postgraduate',
            'fee_amount': '50.00',
            'required_documents': [],
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Auto University'
        from programs.models import Program
        program = Program.objects.get(name='Auto University', university=university)
        assert program is not None
        assert program.university_id == university.id


@pytest.mark.django_db
class TestProgramOfficerPermissions:
    def test_officer_cannot_create_program(self, officer_client, university):
        response = officer_client.post('/api/v1/programs/', {
            'name': 'Rogue Program',
            'degree_level': 'undergraduate',
            'fee_amount': '50.00',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_officer_cannot_update_program(self, officer_client, draft_program):
        response = officer_client.patch(f'/api/v1/programs/{draft_program.id}/', {
            'name': 'Hacked Name',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_officer_cannot_publish_program(self, officer_client, draft_program):
        response = officer_client.patch(f'/api/v1/programs/{draft_program.id}/status/', {
            'status': 'published',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_officer_can_list_cycles(self, officer_client, published_program, open_cycle):
        response = officer_client.get(f'/api/v1/programs/{published_program.id}/cycles/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', [response.data]) if isinstance(response.data, list) else [response.data]
        assert len(results) >= 1

    def test_officer_cannot_create_cycle(self, officer_client, published_program):
        response = officer_client.post(f'/api/v1/programs/{published_program.id}/cycles/', {
            'name': 'Rogue Cycle',
            'open_date': timezone.now().isoformat(),
            'close_date': (timezone.now() + timedelta(days=30)).isoformat(),
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestProgramCrossTenant:
    def test_other_university_admin_cannot_update_program(self, other_admin_client, draft_program):
        response = other_admin_client.patch(f'/api/v1/programs/{draft_program.id}/', {
            'name': 'Interloper',
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_other_university_admin_cannot_publish_program(self, other_admin_client, draft_program):
        response = other_admin_client.patch(f'/api/v1/programs/{draft_program.id}/status/', {
            'status': 'published',
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_other_university_admin_cannot_create_cycle(self, other_admin_client, published_program):
        response = other_admin_client.post(f'/api/v1/programs/{published_program.id}/cycles/', {
            'name': 'Cross Tenant Cycle',
            'open_date': timezone.now().isoformat(),
            'close_date': (timezone.now() + timedelta(days=30)).isoformat(),
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_cannot_create(self, university):
        client = APIClient()
        response = client.post(f'/api/v1/universities/{university.id}/programs/', {
            'name': 'No Auth',
            'degree_level': 'undergraduate',
            'fee_amount': '50.00',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_other_university_admin_cannot_list_programs(self, other_admin_client, university):
        response = other_admin_client.get(f'/api/v1/universities/{university.id}/programs/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_other_university_admin_cannot_update_cycle(self, other_admin_client, open_cycle):
        response = other_admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/', {
            'name': 'Hacked',
        }, format='json')
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_other_university_admin_cannot_close_cycle(self, other_admin_client, open_cycle):
        response = other_admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/close/')
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_other_university_admin_cannot_archive_cycle(self, other_admin_client, open_cycle):
        open_cycle.status = 'closed'
        open_cycle.save(update_fields=['status'])
        response = other_admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/archive/')
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


@pytest.mark.django_db
class TestCycleAdminAPI:
    def test_admin_can_create_cycle(self, admin_client, published_program):
        response = admin_client.post(f'/api/v1/programs/{published_program.id}/cycles/', {
            'name': 'Fall 2027',
            'open_date': timezone.now().isoformat(),
            'close_date': (timezone.now() + timedelta(days=90)).isoformat(),
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Fall 2027'
        assert response.data['status'] == 'open'

    def test_admin_can_close_open_cycle(self, admin_client, open_cycle):
        response = admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/close/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'closed'

    def test_admin_can_archive_closed_cycle(self, admin_client, open_cycle):
        open_cycle.status = 'closed'
        open_cycle.save(update_fields=['status'])
        response = admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/archive/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'archived'

    def test_cannot_close_scheduled_cycle(self, admin_client, scheduled_cycle):
        response = admin_client.patch(f'/api/v1/admission-cycles/{scheduled_cycle.id}/close/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_archive_open_cycle(self, admin_client, open_cycle):
        response = admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/archive/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cycle_dates_readonly_after_open(self, admin_client, open_cycle):
        response = admin_client.patch(f'/api/v1/admission-cycles/{open_cycle.id}/', {
            'open_date': (timezone.now() + timedelta(days=10)).isoformat(),
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_can_update_scheduled_cycle_dates(self, admin_client, scheduled_cycle):
        new_open = (timezone.now() + timedelta(days=5)).isoformat()
        response = admin_client.patch(f'/api/v1/admission-cycles/{scheduled_cycle.id}/', {
            'open_date': new_open,
        }, format='json')
        assert response.status_code == status.HTTP_200_OK

    def test_list_cycles_on_program(self, admin_client, published_program, open_cycle, scheduled_cycle):
        response = admin_client.get(f'/api/v1/programs/{published_program.id}/cycles/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', [response.data]) if isinstance(response.data, list) else [response.data]


@pytest.mark.django_db
class TestBeatTransition:
    def test_scheduled_to_open(self, scheduled_cycle):
        scheduled_cycle.open_date = timezone.now() - timedelta(hours=1)
        scheduled_cycle.save(update_fields=['open_date'])

        from programs.tasks import auto_transition_cycles
        auto_transition_cycles()

        scheduled_cycle.refresh_from_db()
        assert scheduled_cycle.status == 'open'

    def test_open_to_closed(self, open_cycle):
        open_cycle.close_date = timezone.now() - timedelta(hours=1)
        open_cycle.save(update_fields=['close_date'])

        from programs.tasks import auto_transition_cycles
        auto_transition_cycles()

        open_cycle.refresh_from_db()
        assert open_cycle.status == 'closed'

    def test_scheduled_ignored_when_not_yet_open(self, scheduled_cycle):
        from programs.tasks import auto_transition_cycles
        auto_transition_cycles()

        scheduled_cycle.refresh_from_db()
        assert scheduled_cycle.status == 'scheduled'

    def test_open_ignored_when_not_yet_closed(self, open_cycle):
        from programs.tasks import auto_transition_cycles
        auto_transition_cycles()

        open_cycle.refresh_from_db()
        assert open_cycle.status == 'open'

    def test_double_run_is_idempotent(self, open_cycle):
        open_cycle.close_date = timezone.now() - timedelta(hours=1)
        open_cycle.save(update_fields=['close_date'])

        from programs.tasks import auto_transition_cycles
        auto_transition_cycles()
        auto_transition_cycles()

        open_cycle.refresh_from_db()
        assert open_cycle.status == 'closed'

    def test_does_not_affect_already_closed(self, open_cycle):
        open_cycle.close_date = timezone.now() - timedelta(hours=1)
        open_cycle.status = 'closed'
        open_cycle.save(update_fields=['close_date', 'status'])

        from programs.tasks import auto_transition_cycles
        auto_transition_cycles()

        open_cycle.refresh_from_db()
        assert open_cycle.status == 'closed'