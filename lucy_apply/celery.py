import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings')

app = Celery('lucy_apply')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
