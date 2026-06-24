import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ApplicationDocument
from notifications.tasks import send_document_flagged_email

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ApplicationDocument)
def handle_document_flagged(sender, instance, **kwargs):
    if instance.status != 'flagged':
        return

    try:
        send_document_flagged_email.delay(
            instance.application.applicant.email,
            instance.document_type,
            instance.application.program.name,
            str(instance.application_id),
        )
    except Exception as e:
        logger.warning('Failed to dispatch Celery notification for flagged doc: %s', e)
