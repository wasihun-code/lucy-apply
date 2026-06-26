from django.db import models
from identity.models import TimestampedUUIDModel


class AuditLogEntry(TimestampedUUIDModel):
    ACTOR_CHOICES = [
        ('applicant', 'Applicant'),
        ('university_staff', 'University Staff'),
        ('platform_admin', 'Platform Admin'),
        ('system', 'System'),
    ]

    actor_type = models.CharField(max_length=50, choices=ACTOR_CHOICES)
    actor_id = models.CharField(max_length=255, null=True, blank=True)
    university = models.ForeignKey(
        'universities.University', null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField()

    class Meta:
        verbose_name_plural = 'Audit log entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['university', 'created_at']),
        ]

    def __str__(self):
        return f'{self.action} on {self.entity_type} ({self.entity_id}) at {self.created_at}'
