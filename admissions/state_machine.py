from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import ApplicationStatusHistory

VALID_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['under_review'],
    'under_review': ['admitted', 'rejected', 'waitlisted'],
    'admitted': ['accepted', 'declined', 'under_review'],
    'rejected': ['under_review'],
    'waitlisted': ['under_review'],
    'accepted': [],
    'declined': [],
}

DECISION_STATES = ['admitted', 'rejected', 'waitlisted']


def transition_application(application, new_status, actor_type, actor_id, reason=''):
    if new_status not in VALID_TRANSITIONS.get(application.status, []):
        raise ValidationError(
            f"Cannot transition from '{application.status}' to '{new_status}'"
        )

    if application.status == 'under_review' and new_status in DECISION_STATES:
        required_types = [
            d.get('type') for d in application.program.required_documents
        ]
        if required_types:
            verified_types = set(
                application.documents.filter(
                    document_type__in=required_types,
                    status='verified',
                ).values_list('document_type', flat=True)
            )
            missing = [t for t in required_types if t not in verified_types]
            if missing:
                raise ValidationError(
                    f"Cannot issue a decision: required documents not verified: {', '.join(missing)}"
                )

    from_status = application.status
    application.status = new_status

    update_fields = ['status']

    if from_status == 'draft' and new_status == 'submitted':
        application.submitted_at = timezone.now()
        update_fields.append('submitted_at')
    elif from_status == 'admitted' and new_status in ('accepted', 'declined'):
        application.offer_response_at = timezone.now()
        update_fields.append('offer_response_at')

    if new_status in ('admitted', 'rejected', 'waitlisted') and from_status != new_status:
        application.decision_at = timezone.now()
        update_fields.append('decision_at')

    if new_status == 'under_review' and from_status in ('admitted', 'rejected', 'waitlisted'):
        application.decision_at = None
        application.decision_by = None
        update_fields.extend(['decision_at', 'decision_by'])

    application.save(update_fields=update_fields)

    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=from_status,
        to_status=new_status,
        changed_by_type=actor_type,
        changed_by_id=str(actor_id) if actor_id else None,
        reason=reason,
    )
