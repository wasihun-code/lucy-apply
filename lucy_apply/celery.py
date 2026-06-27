import logging
import os
import traceback

from celery import Celery
from django.conf import settings

logger = logging.getLogger(__name__)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings')

app = Celery('lucy_apply')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


def sentry_celery_failure_handler(task, exc, task_id, args, kwargs, einfo):
    logger.error(
        'Celery task %s (id=%s) failed: %s\nTask args: %r\nTask kwargs: %r\nTraceback:\n%s',
        task.name, task_id, exc, args, kwargs,
        ''.join(traceback.format_tb(einfo.tb)) if einfo else 'N/A',
    )
    # TODO: wire to Sentry in production


app.conf.task_annotations = {
    '*': {'on_failure': sentry_celery_failure_handler},
}