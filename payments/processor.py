import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _stripe_available():
    try:
        import stripe  # noqa
        return True
    except ImportError:
        return False


def is_mock_mode():
    import os
    if os.environ.get('OPENSE_TESTING') == 'true':
        return True
    if not settings.STRIPE_SECRET_KEY:
        return True
    return not _stripe_available()


def create_payment_intent(amount, currency='USD'):
    if is_mock_mode():
        return _mock_intent(amount, currency)
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    intent = stripe.PaymentIntent.create(
        amount=int(amount * 100),
        currency=currency.lower(),
    )
    return {'id': intent.id, 'client_secret': intent.client_secret}


def _mock_intent(amount, currency):
    return {
        'id': 'pi_mock_' + str(hash(str(amount) + currency))[:12],
        'client_secret': 'secret_mock_' + str(hash(str(amount) + currency))[:16],
    }


def verify_webhook_signature(payload, signature):
    if is_mock_mode() or not settings.STRIPE_WEBHOOK_SECRET or not _stripe_available():
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
