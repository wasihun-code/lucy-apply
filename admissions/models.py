from django.db import models
from identity.models import TenantScopedModel, TimestampedUUIDModel


class Application(TenantScopedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('admitted', 'Admitted'),
        ('rejected', 'Rejected'),
        ('waitlisted', 'Waitlisted'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    applicant = models.ForeignKey(
        'identity.Applicant', on_delete=models.CASCADE, related_name='applications'
    )
    program = models.ForeignKey(
        'programs.Program', on_delete=models.CASCADE, related_name='applications'
    )
    admission_cycle = models.ForeignKey(
        'programs.AdmissionCycle', on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='draft'
    )
    form_data = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    decision_at = models.DateTimeField(null=True, blank=True)
    decision_by = models.ForeignKey(
        'identity.UniversityStaff', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='decisions',
    )
    offer_response_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['university', 'status']),
            models.Index(fields=['applicant']),
        ]

    def __str__(self):
        return f"{self.applicant.full_name} - {self.program.name}"


class ApplicationStatusHistory(TimestampedUUIDModel):
    CHANGED_BY_CHOICES = [
        ('applicant', 'Applicant'),
        ('university_staff', 'University Staff'),
        ('system', 'System'),
    ]

    application = models.ForeignKey(
        'admissions.Application', on_delete=models.CASCADE, related_name='history'
    )
    from_status = models.CharField(max_length=50, null=True, blank=True)
    to_status = models.CharField(max_length=50)
    changed_by_type = models.CharField(max_length=50, choices=CHANGED_BY_CHOICES)
    changed_by_id = models.CharField(max_length=50, null=True, blank=True)
    reason = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Application status histories'

    def __str__(self):
        return f"{self.application.id}: {self.from_status} → {self.to_status}"
