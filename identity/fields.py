import base64
import hashlib

from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _get_fernet():
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


class EncryptedCharField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 255)
        super().__init__(*args, **kwargs)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        f = _get_fernet()
        return f.decrypt(value.encode()).decode()

    def to_python(self, value):
        if value is None or isinstance(value, str):
            return value
        return str(value)

    def get_prep_value(self, value):
        if value is None:
            return None
        f = _get_fernet()
        return f.encrypt(value.encode()).decode()
