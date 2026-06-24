from django.db import models

from identity.models import TimestampedUUIDModel


class Payment(TimestampedUUIDModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]

    university = models.ForeignKey(
        'universities.University', on_delete=models.CASCADE
    )
    application = models.OneToOneField(
        'admissions.Application', on_delete=models.CASCADE
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    processor_reference = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    refundable = models.BooleanField(default=False)
    initiated_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['application']),
        ]

    def __str__(self):
        return f"Payment {self.id} - {self.application_id} ({self.status})"
