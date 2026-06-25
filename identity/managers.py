from django.db import models
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, **extra_fields):
        email = self.normalize_email(email).lower()
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, full_name, password, **extra_fields)


class TenantManager(models.Manager):
    def get_queryset(self):
        from identity.threadlocal import get_current_request

        request = get_current_request()
        if (
            request
            and request.user.is_authenticated
            and hasattr(request.user, 'universitystaff')
        ):
            return super().get_queryset().filter(
                university_id=request.user.universitystaff.university_id
            )
        return super().get_queryset()
