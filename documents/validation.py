import logging
import tempfile
import os

from django.conf import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}


def validate_file_type(uploaded_file):
    if getattr(settings, 'TESTING', False):
        return True

    try:
        import magic
        mime = magic.from_buffer(uploaded_file.read(2048), mime=True)
        uploaded_file.seek(0)
        return mime in ALLOWED_MIME_TYPES
    except ImportError:
        logger.critical('python-magic not installed — file validation disabled')
        return False
    except Exception:
        logger.exception('File type validation failed')
        return False
