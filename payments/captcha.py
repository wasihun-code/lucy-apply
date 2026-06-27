import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def verify_recaptcha(token, remote_ip=None):
    if settings.DEBUG or settings.TESTING:
        return True

    import requests

    try:
        data = {
            'secret': settings.RECAPTCHA_SECRET_KEY,
            'response': token,
        }
        if remote_ip:
            data['remoteip'] = remote_ip

        resp = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data=data,
            timeout=5,
        )
        result = resp.json()
        if not result.get('success', False):
            return False
        score = result.get('score', 1.0)
        return score >= 0.5
    except Exception:
        logger.exception('reCAPTCHA verification failed')
        return False
