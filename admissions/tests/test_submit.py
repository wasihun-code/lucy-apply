from rest_framework import status


class TestSubmitApplication:
    def test_submit_without_payment_returns_400(self, auth_client, application_with_docs_no_payment):
        app = application_with_docs_no_payment
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'PAYMENT_REQUIRED'

    def test_submit_without_docs_returns_400(self, auth_client, application_with_pending_payment):
        app = application_with_pending_payment
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'MISSING_DOCS'

    def test_submit_with_docs_and_payment_succeeds(self, auth_client, application_with_docs_and_pending_payment):
        app = application_with_docs_and_pending_payment
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'submitted'

        app.refresh_from_db()
        assert app.status == 'submitted'
        assert app.submitted_at is not None
