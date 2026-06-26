import uuid
import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

from identity.managers import UserManager, TenantManager
from identity.fields import EncryptedCharField


class TimestampedUUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantScopedModel(TimestampedUUIDModel):
    university = models.ForeignKey(
        'universities.University', on_delete=models.CASCADE
    )
    objects = TenantManager()

    class Meta:
        abstract = True


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    account_status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('deactivated', 'Deactivated')],
        default='active',
    )
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email


class Applicant(User):
    country_of_residence = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, null=True, blank=True)
    passport_id_number = EncryptedCharField(
        max_length=100, null=True, blank=True
    )
    email_verified = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Applicant'
        verbose_name_plural = 'Applicants'


class UniversityStaff(User):
    university = models.ForeignKey(
        'universities.University',
        on_delete=models.CASCADE,
        related_name='staff',
    )
    permission_level = models.CharField(
        max_length=20,
        choices=[('officer', 'Officer'), ('admin', 'Admin')],
    )

    class Meta:
        verbose_name = 'University Staff'
        verbose_name_plural = 'University Staff'


class PlatformAdmin(User):
    class Meta:
        verbose_name = 'Platform Admin'
        verbose_name_plural = 'Platform Admins'


class EmailVerificationToken(TimestampedUUIDModel):
    applicant = models.ForeignKey(
        Applicant, on_delete=models.CASCADE, related_name='verification_tokens'
    )
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Email Verification Token'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)


class PasswordResetToken(TimestampedUUIDModel):
    applicant = models.ForeignKey(
        Applicant, on_delete=models.CASCADE, related_name='reset_tokens'
    )
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Password Reset Token'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()


class StaffInviteToken(TimestampedUUIDModel):
    university_staff = models.ForeignKey(
        UniversityStaff, on_delete=models.CASCADE, related_name='invite_tokens'
    )
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=72)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()
