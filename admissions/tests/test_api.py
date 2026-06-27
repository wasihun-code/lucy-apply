import io
import json
from unittest.mock import patch

from rest_framework import status
from django.utils import timezone


class TestCreateDraftApplication:
    def test_creates_draft_successfully(self, auth_client, program, admission_cycle):
        response = auth_client.post('/api/v1/applications/', {
            'program': str(program.id),
            'admission_cycle': str(admission_cycle.id),
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'draft'
        assert str(response.data['program']) == str(program.id)

    def test_unverified_applicant_gets_403(self, unverified_auth_client, program, admission_cycle):
        response = unverified_auth_client.post('/api/v1/applications/', {
            'program': str(program.id),
            'admission_cycle': str(admission_cycle.id),
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_gets_401(self, program, admission_cycle):
        from rest_framework.test import APIClient
        client = APIClient()
        response = client.post('/api/v1/applications/', {
            'program': str(program.id),
            'admission_cycle': str(admission_cycle.id),
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRetrieveApplication:
    def test_applicant_can_retrieve_own(self, auth_client, application):
        response = auth_client.get(f'/api/v1/applications/{application.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(application.id)

    def test_applicant_cannot_retrieve_others(self, other_auth_client, application):
        response = other_auth_client.get(f'/api/v1/applications/{application.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_includes_document_checklist(self, auth_client, application):
        response = auth_client.get(f'/api/v1/applications/{application.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'document_checklist' in response.data
        assert len(response.data['document_checklist']) == 2
        assert response.data['document_checklist'][0]['type'] == 'transcript'
        assert response.data['document_checklist'][0]['uploaded'] is False


class TestUpdateDraftApplication:
    def test_update_form_data(self, auth_client, application):
        response = auth_client.patch(f'/api/v1/applications/{application.id}/', {
            'form_data': {'full_name': 'Updated Name', 'phone': '+251922222222'},
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.form_data['full_name'] == 'Updated Name'

    def test_cannot_update_anothers_application(self, other_auth_client, application):
        response = other_auth_client.patch(f'/api/v1/applications/{application.id}/', {
            'form_data': {'phone': '+251933333333'},
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_concurrent_edit_last_write_wins(self, auth_client, application):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(application.applicant).access_token)
        tab2 = APIClient()
        tab2.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        tab2.patch(f'/api/v1/applications/{application.id}/', {
            'form_data': {'field_a': 'from_tab2'},
        }, format='json')

        response = auth_client.patch(f'/api/v1/applications/{application.id}/', {
            'form_data': {'field_b': 'from_tab1'},
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.form_data['field_a'] == 'from_tab2'
        assert application.form_data['field_b'] == 'from_tab1'


class TestDeleteDraftApplication:
    def test_delete_draft(self, auth_client, application):
        response = auth_client.delete(f'/api/v1/applications/{application.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_cannot_delete_others_draft(self, other_auth_client, application):
        response = other_auth_client.delete(f'/api/v1/applications/{application.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unverified_cannot_delete(self, unverified_auth_client, application):
        response = unverified_auth_client.delete(f'/api/v1/applications/{application.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestHistoryEndpoint:
    def test_history_returns_transitions_in_order(self, auth_client, application):
        from admissions.state_machine import transition_application

        transition_application(
            application, 'submitted', 'applicant', str(application.applicant.id),
            reason='First transition',
        )
        application.refresh_from_db()
        transition_application(
            application, 'under_review', 'university_staff',
            '00000000-0000-0000-0000-000000000001',
            reason='Second transition',
        )

        response = auth_client.get(
            f'/api/v1/applications/{application.id}/history/',
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]['from_status'] == 'draft'
        assert response.data[0]['to_status'] == 'submitted'
        assert response.data[0]['reason'] == 'First transition'
        assert response.data[1]['from_status'] == 'submitted'
        assert response.data[1]['to_status'] == 'under_review'
        assert response.data[1]['reason'] == 'Second transition'

    def test_history_blocked_for_other_applicant(self, other_auth_client, application):
        from admissions.state_machine import transition_application

        transition_application(
            application, 'submitted', 'applicant', str(application.applicant.id),
        )
        response = other_auth_client.get(
            f'/api/v1/applications/{application.id}/history/',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestCelerySignals:
    def test_decision_email_fires_on_admitted(self, application, verified_documents):
        from admissions.state_machine import transition_application

        application.status = 'under_review'
        application.save(update_fields=['status', 'updated_at'])

        with patch('notifications.tasks.send_decision_email.delay') as mock:
            transition_application(
                application, 'admitted', 'university_staff',
                '00000000-0000-0000-0000-000000000001',
            )
            mock.assert_called_once()
            args = mock.call_args[0]
            assert args[0] == application.applicant.email
            assert args[2] == 'admitted'

    def test_offer_response_email_fires_on_accepted(self, admitted_application):
        from admissions.state_machine import transition_application

        app = admitted_application
        app.offer_response_at = timezone.now()
        app.save(update_fields=['offer_response_at', 'updated_at'])

        with patch('notifications.tasks.send_offer_response_email.delay') as mock:
            transition_application(
                app, 'accepted', 'applicant', str(app.applicant.id),
            )
            mock.assert_called_once()
            args = mock.call_args[0]
            assert args[0] == app.applicant.email
            assert args[2] == 'accepted'
