from django.db import models
from identity.models import TenantScopedModel


class ApplicationDocument(TenantScopedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('flagged', 'Flagged'),
    ]

    application = models.ForeignKey(
        'admissions.Application', on_delete=models.CASCADE, related_name='documents'
    )
    document_type = models.CharField(max_length=100)
    file = models.FileField(upload_to='documents/', null=True, blank=True)
    object_key = models.CharField(max_length=500, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    flagged_reason = models.TextField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    reviewed_by = models.ForeignKey(
        'identity.UniversityStaff', null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.application_id} - {self.document_type} (v{self.version})"
