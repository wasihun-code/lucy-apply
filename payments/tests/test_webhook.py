import json
from datetime import timedelta

from django.utils import timezone
from rest_framework import status


WEBHOOK_URL = '/api/v1/payments/webhook/'


def json_response(response):
    return json.loads(response.content)


class TestWebhookSignatureVerification:
    def test_valid_signature_updates_payment(self, auth_client, application_with_payment):
        app = application_with_payment
        payload = json.dumps({
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_mock_123',
                    'client_secret': 'secret_mock_test123',
                },
            },
        })
        response = auth_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_valid_signature',
        )
        assert response.status_code == status.HTTP_200_OK
        assert json_response(response)['status'] == 'succeeded'

        app.payment.refresh_from_db()
        assert app.payment.status == 'succeeded'
        assert app.payment.completed_at is not None

    def test_invalid_signature_returns_400(self, auth_client, application_with_payment):
        payload = json.dumps({
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_mock_123'}},
        })
        response = auth_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert json_response(response)['error'] == 'Invalid signature'

    def test_missing_signature_returns_400(self, auth_client, application_with_payment):
        payload = json.dumps({
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_mock_123'}},
        })
        response = auth_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert json_response(response)['error'] == 'Missing signature'

    def test_duplicate_event_returns_already_processed(self, auth_client, application_with_payment):
        app = application_with_payment
        app.payment.status = 'succeeded'
        app.payment.completed_at = timezone.now()
        app.payment.save()

        payload = json.dumps({
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_mock_123',
                    'client_secret': 'secret_mock_test123',
                },
            },
        })
        response = auth_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_valid_signature',
        )
        assert response.status_code == status.HTTP_200_OK
        assert json_response(response)['status'] == 'already_processed'

    def test_failed_payment_event(self, auth_client, application_with_payment):
        payload = json.dumps({
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_mock_123',
                    'client_secret': 'secret_mock_test123',
                },
            },
        })
        response = auth_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_valid_signature',
        )
        assert response.status_code == status.HTTP_200_OK
        assert json_response(response)['status'] == 'failed'

        application_with_payment.payment.refresh_from_db()
        assert application_with_payment.payment.status == 'failed'

    def test_unhandled_event_type(self, auth_client, application_with_payment):
        payload = json.dumps({
            'type': 'payment_intent.created',
            'data': {'object': {'id': 'pi_mock_123'}},
        })
        response = auth_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_valid_signature',
        )
        assert response.status_code == status.HTTP_200_OK
        assert json_response(response)['status'] == 'unhandled_event_type'
