import io
import json

from rest_framework import status


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
