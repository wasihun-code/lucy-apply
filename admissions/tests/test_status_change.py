from unittest.mock import patch

from django.utils import timezone
from rest_framework import status

from documents.models import ApplicationDocument


class TestDecisionIssuance:
    def test_officer_can_admit(self, officer_client, application, verified_documents):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'admitted', 'reason': 'Strong credentials'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'admitted'

        app.refresh_from_db()
        assert app.status == 'admitted'
        assert app.decision_at is not None
        assert app.decision_by is not None

    def test_officer_can_reject(self, officer_client, application, verified_documents):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'rejected', 'reason': 'Does not meet requirements'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'rejected'

    def test_officer_can_waitlist(self, officer_client, application, verified_documents):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'waitlisted'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'waitlisted'

    def test_non_staff_blocked(self, auth_client, application):
        response = auth_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_transition_blocked(self, officer_client, application):
        response = officer_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {'status': 'accepted', 'reason': 'skip state'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_status_returns_400(self, officer_client, application):
        response = officer_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_decision_blocked_without_verified_docs(
        self, officer_client, application
    ):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        ApplicationDocument.objects.create(
            application=app,
            document_type='transcript',
            university=app.university,
            status='pending',
            version=1,
        )
        ApplicationDocument.objects.create(
            application=app,
            document_type='id_document',
            university=app.university,
            status='pending',
            version=1,
        )

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'required documents not verified' in response.data['error']['message']

    def test_cross_tenant_officer_cannot_issue_decision(
        self, other_officer_client, application, verified_documents
    ):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        response = other_officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_decision_sets_decision_by(self, officer_client, application, verified_documents, staff_officer):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        app.refresh_from_db()
        assert app.decision_by_id == staff_officer.id
