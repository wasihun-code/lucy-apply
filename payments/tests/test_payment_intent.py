from rest_framework import status


class TestPaymentIntent:
    def test_missing_docs_returns_400(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/payment-intent/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'MISSING_DOCS'

    def test_closed_cycle_returns_400(self, auth_client, closed_cycle_app):
        response = auth_client.post(
            f'/api/v1/applications/{closed_cycle_app.id}/payment-intent/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'CYCLE_CLOSED'

    def test_success_creates_pending_payment(self, auth_client, application_with_docs):
        response = auth_client.post(
            f'/api/v1/applications/{application_with_docs.id}/payment-intent/',
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'client_secret' in response.data
        assert response.data['client_secret'].startswith('secret_mock_')

        from payments.models import Payment
        payment = Payment.objects.get(application=application_with_docs)
        assert payment.status == 'pending'
        assert payment.amount == payment.application.program.fee_amount

    def test_duplicate_intent_returns_existing(self, auth_client, application_with_docs):
        first = auth_client.post(
            f'/api/v1/applications/{application_with_docs.id}/payment-intent/',
            format='json',
        )
        second = auth_client.post(
            f'/api/v1/applications/{application_with_docs.id}/payment-intent/',
            format='json',
        )
        assert second.status_code == status.HTTP_200_OK
        assert second.data['client_secret'] == first.data['client_secret']

    def test_non_owner_gets_404(self, other_auth_client, application_with_docs):
        response = other_auth_client.post(
            f'/api/v1/applications/{application_with_docs.id}/payment-intent/',
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestPaymentRetrieve:
    def test_get_payment_returns_details(self, auth_client, application_with_payment):
        app = application_with_payment
        response = auth_client.get(
            f'/api/v1/applications/{app.id}/payment/',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'pending'
        assert response.data['amount'] == '50.00'

    def test_get_payment_no_payment_returns_404(self, auth_client, application_with_docs):
        response = auth_client.get(
            f'/api/v1/applications/{application_with_docs.id}/payment/',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
