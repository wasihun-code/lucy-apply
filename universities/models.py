from django.db import models
from identity.models import TimestampedUUIDModel


class University(TimestampedUUIDModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    accreditation_info = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('inactive', 'Inactive'), ('active', 'Active')],
        default='inactive',
    )

    class Meta:
        verbose_name = 'University'
        verbose_name_plural = 'Universities'
        ordering = ['name']

    def __str__(self):
        return self.name
