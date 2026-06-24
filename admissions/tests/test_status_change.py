from django.utils import timezone
from rest_framework import status

from documents.models import ApplicationDocument


class TestManualStatusChange:
    def test_platform_admin_can_issue_decision(
        self, platform_admin_client, application, verified_documents
    ):
        app = application
        app.status = 'under_review'
        app.save(update_fields=['status', 'updated_at'])

        response = platform_admin_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'admitted', 'reason': 'manual test'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'admitted'

        app.refresh_from_db()
        assert app.status == 'admitted'
        assert app.decision_at is not None

    def test_non_platform_admin_blocked(self, auth_client, application):
        response = auth_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_transition_blocked(self, platform_admin_client, application):
        response = platform_admin_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {'status': 'accepted', 'reason': 'skip state'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_status_returns_400(self, platform_admin_client, application):
        response = platform_admin_client.patch(
            f'/api/v1/applications/{application.id}/status/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_decision_blocked_without_verified_docs(
        self, platform_admin_client, application
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

        response = platform_admin_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'admitted'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'required documents not verified' in response.data['error']['message']
