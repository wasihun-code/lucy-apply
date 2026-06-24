import json
import logging

from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from .models import Payment
from .processor import verify_webhook_signature

try:
    import stripe
    SignatureVerificationError = stripe.error.SignatureVerificationError
except ImportError:
    SignatureVerificationError = type('SignatureVerificationError', (ValueError,), {})

logger = logging.getLogger(__name__)


@csrf_exempt
def payment_webhook(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    signature = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    if not signature:
        logger.warning('Missing Stripe-Signature header at %s', timezone.now())
        return JsonResponse({'error': 'Missing signature'}, status=400)

    try:
        event = verify_webhook_signature(request.body, signature)
    except (ValueError, SignatureVerificationError):
        logger.warning('Invalid webhook signature at %s', timezone.now())
        return JsonResponse({'error': 'Invalid signature'}, status=400)

    event_type = event.get('type', '')
    data_object = event.get('data', {}).get('object', {})

    if event_type == 'payment_intent.succeeded':
        payment_intent_id = data_object.get('id', '')
        client_secret = data_object.get('client_secret', '')

        payment = _find_payment(payment_intent_id, client_secret)
        if payment:
            if payment.status == 'succeeded':
                return JsonResponse({'status': 'already_processed'})
            payment.status = 'succeeded'
            payment.completed_at = timezone.now()
            payment.save(update_fields=['status', 'completed_at', 'updated_at'])
            logger.info('Payment %s succeeded for application %s', payment.id, payment.application_id)
            return JsonResponse({'status': 'succeeded'})

    elif event_type == 'payment_intent.payment_failed':
        payment_intent_id = data_object.get('id', '')
        client_secret = data_object.get('client_secret', '')

        payment = _find_payment(payment_intent_id, client_secret)
        if payment:
            payment.status = 'failed'
            payment.save(update_fields=['status', 'updated_at'])
            logger.info('Payment %s failed for application %s', payment.id, payment.application_id)
            return JsonResponse({'status': 'failed'})

    return JsonResponse({'status': 'unhandled_event_type'})


def _find_payment(payment_intent_id, client_secret):
    payment = Payment.objects.filter(
        processor_reference=client_secret,
    ).first()
    if payment:
        return payment
    payment = Payment.objects.filter(
        processor_reference=payment_intent_id,
    ).first()
    return payment
