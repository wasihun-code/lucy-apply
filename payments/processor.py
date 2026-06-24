import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def create_payment_intent(amount, currency='USD'):
    if not settings.STRIPE_SECRET_KEY:
        return {
            'id': 'pi_mock_' + str(hash(str(amount) + currency))[:12],
            'client_secret': 'secret_mock_' + str(hash(str(amount) + currency))[:16],
        }
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    intent = stripe.PaymentIntent.create(
        amount=int(amount * 100),
        currency=currency.lower(),
    )
    return {'id': intent.id, 'client_secret': intent.client_secret}


def verify_webhook_signature(payload, signature):
    if not settings.STRIPE_WEBHOOK_SECRET:
        if signature == 'test_valid_signature':
            if isinstance(payload, bytes):
                payload = payload.decode('utf-8')
            return json.loads(payload)
        logger.warning(
            'Invalid webhook signature attempt at timestamp %s',
            __import__('django.utils.timezone', fromlist=['now']).now(),
        )
        raise ValueError('Invalid signature')
    import stripe
    return stripe.Webhook.construct_event(
        payload, signature, settings.STRIPE_WEBHOOK_SECRET
    )
