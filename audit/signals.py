import logging

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import AuditLogEntry

logger = logging.getLogger(__name__)


def _serialize(obj):
    if obj is None:
        return None
    if hasattr(obj, 'id'):
        return str(obj.id)
    return str(obj)


@receiver(pre_save, sender='admissions.Application')
def audit_application_status_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        original = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    if original.status == instance.status:
        return
    actor_type = 'system'
    actor_id = None
    history = instance.history.order_by('-created_at').first()
    if history:
        actor_type = history.changed_by_type
        actor_id = history.changed_by_id
    AuditLogEntry.objects.create(
        actor_type=actor_type,
        actor_id=actor_id,
        university=instance.university,
        action='application_status_change',
        entity_type='application',
        entity_id=instance.id,
        before_state={'status': original.status},
        after_state={'status': instance.status},
    )


@receiver(pre_save, sender='documents.ApplicationDocument')
def audit_document_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    update_fields = kwargs.get('update_fields')
    if update_fields is not None:
        relevant = {'status', 'flagged_reason'} & set(update_fields)
        if not relevant:
            return
    try:
        original = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    if original.status == instance.status and original.flagged_reason == instance.flagged_reason:
        return
    action = 'document_verified' if instance.status == 'verified' else 'document_flagged'
    before = {'status': original.status}
    if original.flagged_reason:
        before['flagged_reason'] = original.flagged_reason
    after = {'status': instance.status}
    if instance.flagged_reason:
        after['flagged_reason'] = instance.flagged_reason
    staff_id = str(instance.reviewed_by_id) if instance.reviewed_by_id else None
    AuditLogEntry.objects.create(
        actor_type='university_staff',
        actor_id=staff_id,
        university=instance.university,
        action=action,
        entity_type='application_document',
        entity_id=instance.id,
        before_state=before,
        after_state=after,
    )


@receiver(pre_save, sender='payments.Payment')
def audit_payment_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    update_fields = kwargs.get('update_fields')
    if update_fields is not None and 'status' not in update_fields:
        return
    try:
        original = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    if original.status == instance.status:
        return
    actor_type = 'system'
    actor_id = None
    if hasattr(instance, 'application') and instance.application:
        app = instance.application
        if app.status == 'submitted' and instance.status == 'succeeded':
            history = app.history.filter(to_status='submitted').order_by('-created_at').first()
            if history:
                actor_type = history.changed_by_type
                actor_id = history.changed_by_id
    AuditLogEntry.objects.create(
        actor_type=actor_type,
        actor_id=actor_id,
        university=instance.university,
        action='payment_status_change',
        entity_type='payment',
        entity_id=instance.id,
        before_state={'status': original.status},
        after_state={'status': instance.status},
    )
