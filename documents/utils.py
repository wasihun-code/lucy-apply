import logging
from datetime import timedelta

from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def generate_upload_url(object_key, content_type=None):
    if settings.DEBUG or settings.TESTING:
        return None

    try:
        from google.cloud.storage import Client
        from google.oauth2.service_account import Credentials

        bucket_name = settings.GS_BUCKET_NAME
        client = Client(credentials=Credentials.from_service_account_file(
            settings.GS_CREDENTIALS
        ))
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(object_key)
        url = blob.generate_signed_url(
            version='v4',
            expiration=timedelta(hours=1),
            method='PUT',
            content_type=content_type,
        )
        return url
    except Exception:
        logger.exception('Failed to generate signed URL')
        return None
