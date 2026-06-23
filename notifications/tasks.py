import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def send_test_email(email_address):
    logger.info(f'[test_email] Sending test email to {email_address}')
    return f'Test email pipeline OK for {email_address}'
