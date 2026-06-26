import logging

from django.core.mail import send_mail
from django.conf import settings

from celery import shared_task

logger = logging.getLogger(__name__)


def _send_email(subject, message, recipient_email):
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [recipient_email],
        fail_silently=False,
    )


@shared_task
def send_verification_email(applicant_email, verification_url):
    subject = 'Verify your email — Lucy Apply'
    message = f'Please verify your email by visiting:\n{verification_url}'
    _send_email(subject, message, applicant_email)
    logger.info('Verification email sent to %s', applicant_email)


@shared_task
def send_application_submitted_email(applicant_email, program_name, application_id):
    subject = 'Application Submitted — Lucy Apply'
    message = (
        f'Your application to {program_name} has been submitted.\n'
        f'Application ID: {application_id}\n'
        f'You will be notified when the university reviews your application.'
    )
    _send_email(subject, message, applicant_email)
    logger.info('Submission email sent to %s for app %s', applicant_email, application_id)


@shared_task
def send_decision_email(applicant_email, program_name, decision, application_id):
    subject = f'Application {decision.title()} — Lucy Apply'
    message = (
        f'Your application to {program_name} has been {decision}.\n'
        f'Application ID: {application_id}\n'
        f'Please log in to view the details.'
    )
    _send_email(subject, message, applicant_email)
    logger.info('Decision email sent to %s: %s', applicant_email, decision)


@shared_task
def send_offer_response_email(applicant_email, program_name, response, application_id):
    subject = f'Offer {response.title()} — Lucy Apply'
    message = (
        f'You have {response} the offer for {program_name}.\n'
        f'Application ID: {application_id}'
    )
    _send_email(subject, message, applicant_email)
    logger.info('Offer response email sent to %s: %s', applicant_email, response)


@shared_task
def send_decision_reversed_email(application_id):
    from admissions.models import Application
    try:
        app = Application.objects.select_related(
            'applicant', 'program'
        ).get(pk=application_id)
    except Application.DoesNotExist:
        logger.warning('send_decision_reversed_email: application %s not found', application_id)
        return
    subject = 'Decision Reversed — Lucy Apply'
    message = (
        f'A previous decision on your application to {app.program.name} '
        f'has been reversed. Your application is back under review.\n'
        f'Application ID: {application_id}\n'
        f'Please log in to view the latest status.'
    )
    _send_email(subject, message, app.applicant.email)
    logger.info('Decision reversal email sent to %s for app %s', app.applicant.email, application_id)


@shared_task
def send_document_flagged_email(applicant_email, document_type, program_name, application_id):
    subject = 'Document Flagged — Lucy Apply'
    message = (
        f'A document ({document_type}) in your application to {program_name} '
        f'has been flagged. Please log in to re-upload.\n'
        f'Application ID: {application_id}'
    )
    _send_email(subject, message, applicant_email)
    logger.info('Document flagged email sent to %s for %s', applicant_email, document_type)
