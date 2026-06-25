import logging

from celery import shared_task
from django.utils import timezone

from .models import AdmissionCycle

logger = logging.getLogger(__name__)


@shared_task
def auto_transition_cycles():
    now = timezone.now()

    scheduled = AdmissionCycle.objects.filter(
        status='scheduled', open_date__lte=now
    )
    for cycle in scheduled:
        logger.info('Transitioned cycle %s: scheduled -> open', cycle.id)
    scheduled.update(status='open')

    open_cycles = AdmissionCycle.objects.filter(
        status='open', close_date__lte=now
    )
    for cycle in open_cycles:
        logger.info('Transitioned cycle %s: open -> closed', cycle.id)
    open_cycles.update(status='closed')