from django.db import models
from identity.models import TenantScopedModel


class Program(TenantScopedModel):
    DEGREE_LEVEL_CHOICES = [
        ('undergraduate', 'Undergraduate'),
        ('postgraduate', 'Postgraduate'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=255)
    degree_level = models.CharField(max_length=50, choices=DEGREE_LEVEL_CHOICES)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    required_documents = models.JSONField(default=list, blank=True)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    fee_currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class AdmissionCycle(TenantScopedModel):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]

    program = models.ForeignKey(
        'programs.Program', on_delete=models.CASCADE, related_name='cycles'
    )
    name = models.CharField(max_length=255)
    open_date = models.DateTimeField()
    close_date = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='scheduled'
    )

    class Meta:
        indexes = [
            models.Index(fields=['status', 'open_date', 'close_date']),
        ]

    def __str__(self):
        return f"{self.program.name} - {self.name}"
