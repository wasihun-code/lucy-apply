from unittest.mock import patch

from django.utils import timezone
from rest_framework import status

from documents.models import ApplicationDocument


class TestDecisionReversal:
    def test_reverse_from_admitted(self, officer_client, admitted_application):
        app = admitted_application
        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'under_review', 'reason': 'New evidence provided'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'under_review'

        app.refresh_from_db()
        assert app.status == 'under_review'
        assert app.decision_at is None
        assert app.decision_by is None

    def test_reverse_from_rejected(self, officer_client, application):
        app = application
        app.status = 'rejected'
        app.submitted_at = timezone.now()
        app.decision_at = timezone.now()
        app.save(update_fields=['status', 'submitted_at', 'decision_at', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'under_review', 'reason': 'Appeal accepted'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'under_review'

    def test_reverse_from_waitlisted(self, officer_client, application):
        app = application
        app.status = 'waitlisted'
        app.submitted_at = timezone.now()
        app.decision_at = timezone.now()
        app.save(update_fields=['status', 'submitted_at', 'decision_at', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'under_review', 'reason': 'Spot opened up'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'under_review'

    def test_reversal_blocked_after_offer_response(self, officer_client, responded_application):
        app = responded_application
        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'under_review', 'reason': 'Try to reverse'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already responded' in response.data['error']['message'].lower()

        app.refresh_from_db()
        assert app.status == 'admitted'

    def test_submitted_to_under_review_allowed(self, officer_client, application):
        app = application
        app.status = 'submitted'
        app.submitted_at = timezone.now()
        app.save(update_fields=['status', 'submitted_at', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/applications/{app.id}/status/',
            {'status': 'under_review', 'reason': 'Start review'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK

    def test_reversal_triggers_email(self, officer_client, admitted_application):
        app = admitted_application
        with patch('notifications.tasks.send_decision_reversed_email.delay') as mock:
            response = officer_client.patch(
                f'/api/v1/applications/{app.id}/status/',
                {'status': 'under_review', 'reason': 'Mistaken decision'},
                format='json',
            )
        assert response.status_code == status.HTTP_200_OK
        mock.assert_called_once_with(str(app.id))

    def test_cross_tenant_officer_cannot_reverse(
        self, other_officer_client, admitted_application
    ):
        response = other_officer_client.patch(
            f'/api/v1/applications/{admitted_application.id}/status/',
            {'status': 'under_review', 'reason': 'Cross-tenant attempt'},
            format='json',
        )
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
