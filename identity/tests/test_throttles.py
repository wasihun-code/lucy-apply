from unittest.mock import Mock

from identity.throttles import (
    LoginRateThrottle,
    MFARateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)


class TestLoginRateThrottle:
    def test_cache_key_uses_email_from_data(self):
        throttle = LoginRateThrottle()
        request = Mock()
        request.data = {'email': 'User@Example.com'}
        request.META = {}
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'login' in key
        assert 'user@example.com' in key

    def test_cache_key_falls_back_to_ip_when_email_missing(self):
        throttle = LoginRateThrottle()
        request = Mock()
        request.data = {}
        request.META = {'REMOTE_ADDR': '192.168.1.1'}
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'login' in key

    def test_cache_key_normalizes_email(self):
        throttle = LoginRateThrottle()
        request = Mock()
        request.data = {'email': '  TEST@Example.COM  '}
        request.META = {}
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'test@example.com' in key


class TestRegisterRateThrottle:
    def test_cache_key_uses_ip_ident(self):
        throttle = RegisterRateThrottle()
        request = Mock()
        request.META = {
            'REMOTE_ADDR': '192.168.1.1',
        }
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'register' in key

    def test_cache_key_uses_x_forwarded_for(self):
        throttle = RegisterRateThrottle()
        request = Mock()
        request.META = {
            'REMOTE_ADDR': '192.168.1.1',
            'HTTP_X_FORWARDED_FOR': '10.0.0.1, 10.0.0.2',
        }
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'register' in key


class TestPasswordResetRateThrottle:
    def test_cache_key_uses_email_from_data(self):
        throttle = PasswordResetRateThrottle()
        request = Mock()
        request.data = {'email': 'user@example.com'}
        request.META = {}
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'password_reset' in key
        assert 'user@example.com' in key

    def test_cache_key_falls_back_to_ip_when_email_missing(self):
        throttle = PasswordResetRateThrottle()
        request = Mock()
        request.data = {}
        request.META = {'REMOTE_ADDR': '192.168.1.1'}
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'password_reset' in key


class TestMFARateThrottle:
    def test_cache_key_uses_user_pk_when_authenticated(self):
        throttle = MFARateThrottle()
        user = Mock()
        user.is_authenticated = True
        user.pk = 'user-123-uuid'
        request = Mock()
        request.user = user
        request.META = {
            'REMOTE_ADDR': '192.168.1.1',
        }
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'mfa' in key
        assert 'user-123-uuid' in key

    def test_cache_key_uses_ip_when_not_authenticated(self):
        throttle = MFARateThrottle()
        from django.contrib.auth.models import AnonymousUser
        request = Mock()
        request.user = AnonymousUser()
        request.META = {
            'REMOTE_ADDR': '10.0.0.5',
        }
        key = throttle.get_cache_key(request, None)
        assert key is not None
        assert 'mfa' in key
