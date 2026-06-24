from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Application
from notifications.tasks import (
    send_application_submitted_email,
    send_decision_email,
    send_offer_response_email,
)


@receiver(post_save, sender=Application)
def handle_application_status_change(sender, instance, **kwargs):
    update_fields = kwargs.get('update_fields')
    if update_fields is not None and 'status' not in update_fields:
        return

    status = instance.status
    applicant_email = instance.applicant.email
    program_name = instance.program.name
    app_id = str(instance.id)

    if status == 'submitted':
        send_application_submitted_email.delay(applicant_email, program_name, app_id)
    elif status in ('admitted', 'rejected', 'waitlisted'):
        send_decision_email.delay(applicant_email, program_name, status, app_id)
    elif status in ('accepted', 'declined'):
        send_offer_response_email.delay(applicant_email, program_name, status, app_id)
