from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = 'login'

    def get_cache_key(self, request, view):
        email = request.data.get('email', '').lower().strip()
        if email:
            return self.cache_format % {'scope': self.scope, 'ident': email}
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class RegisterRateThrottle(SimpleRateThrottle):
    scope = 'register'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class PasswordResetRateThrottle(SimpleRateThrottle):
    scope = 'password_reset'

    def get_cache_key(self, request, view):
        email = request.data.get('email', '').lower().strip()
        if email:
            return self.cache_format % {'scope': self.scope, 'ident': email}
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class MFARateThrottle(SimpleRateThrottle):
    scope = 'mfa'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return self.cache_format % {
                'scope': self.scope,
                'ident': str(request.user.pk),
            }
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }
