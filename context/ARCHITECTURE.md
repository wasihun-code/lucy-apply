# Lucy Apply — Architecture Reference

## Stack (locked — do not modify)

| Layer | Technology |
|---|---|
| Backend framework | Django 5.x + Django REST Framework |
| Frontend | Next.js 14+ (App Router, TypeScript) |
| Database | PostgreSQL 15+ |
| ORM | Django ORM |
| Background jobs | Celery 5.x + Redis |
| Object storage | Google Cloud Storage via django-storages |
| Authentication | djangorestframework-simplejwt + django-otp |
| Hosting | Google Cloud Run |
| DB hosting | Cloud SQL for PostgreSQL |
| CI/CD | GitHub Actions |

## Django App Boundaries

```
lucy_apply/                     ← Django project
├── identity/                   ← User models, auth logic
│   ├── models.py               ← User, Applicant, UniversityStaff, PlatformAdmin
│   ├── views.py                ← Auth endpoints (register, login, verify, mfa)
│   ├── serializers.py
│   └── permissions.py         ← IsApplicant, IsUniversityStaff, IsPlatformAdmin,
│                                  IsEmailVerified, IsScopedToUniversity
├── universities/
│   └── models.py               ← University
├── programs/
│   └── models.py               ← Program, AdmissionCycle
├── admissions/
│   └── models.py               ← Application, ApplicationStatusHistory
├── documents/
│   └── models.py               ← ApplicationDocument
├── payments/
│   └── models.py               ← Payment
│   └── views.py                ← PaymentIntentView, WebhookView (@csrf_exempt)
├── notifications/              ← Celery tasks ONLY, no models
│   └── tasks.py
└── audit/
    └── models.py               ← AuditLogEntry
    └── signals.py              ← Signal handlers writing audit entries
```

## Abstract Base Classes

```python
# Every model uses TimestampedUUIDModel
class TimestampedUUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

# Every tenant-scoped model uses TenantScopedModel
class TenantScopedModel(TimestampedUUIDModel):
    university = models.ForeignKey('universities.University', on_delete=models.CASCADE)
    objects = TenantManager()  # filters by current university automatically
    class Meta:
        abstract = True
```

## Multi-Tenancy Layers (all three must be present)

1. **TenantManager** (default manager, Django-level)
2. **IsScopedToUniversity** permission class (DRF-level)  
3. **Postgres RLS policy** (database-level, applied via RunSQL migration)

## API Base URL

All endpoints: `/api/v1/`
DRF DefaultRouter registers all ViewSets.

## Background Jobs

- Celery handles: email sending, admission cycle auto-transitions (FR-21)
- Triggered via Django signals on model saves (not inline in views)
- Broker: Redis
- Beat scheduler: `django-celery-beat` (DatabaseScheduler)
