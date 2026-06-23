# Lucy Apply — Database Schema Reference

All models inherit `TimestampedUUIDModel` (id, created_at, updated_at) unless noted.
Tenant-scoped models additionally inherit `TenantScopedModel` (adds `university` FK).

---

## identity.Applicant (global, not tenant-scoped)

```python
email = EmailField(unique=True)
password_hash  # AbstractBaseUser handles this
full_name = CharField(max_length=255)
account_status = CharField(choices=['active', 'deactivated'], default='active')
country_of_residence = CharField(max_length=100)
date_of_birth = DateField(null=True, blank=True)
nationality = CharField(max_length=100, null=True, blank=True)
passport_id_number = CharField(max_length=100, null=True, blank=True)  # field-level encryption
email_verified = BooleanField(default=False)
```

## identity.UniversityStaff (tenant-scoped)

```python
email = EmailField(unique=True)
full_name = CharField(max_length=255)
account_status = CharField(choices=['active', 'deactivated'], default='active')
university = ForeignKey('universities.University', on_delete=CASCADE, related_name='staff')
permission_level = CharField(choices=['officer', 'admin'])
```

## identity.PlatformAdmin (global, not tenant-scoped)

```python
email = EmailField(unique=True)
full_name = CharField(max_length=255)
account_status = CharField(choices=['active', 'deactivated'], default='active')
```

## universities.University (IS the tenant)

```python
name = CharField(max_length=255)
description = TextField(blank=True)
logo = ImageField(upload_to='logos/', storage=GCSStorage(), null=True, blank=True)
accreditation_info = TextField(blank=True)
status = CharField(choices=['inactive', 'active'], default='inactive')
```

## programs.Program (tenant-scoped)

```python
# inherits university FK from TenantScopedModel
name = CharField(max_length=255)
degree_level = CharField(max_length=50)  # 'undergraduate', 'postgraduate'
description = TextField(blank=True)
requirements = TextField(blank=True)
required_documents = JSONField(default=list)
# format: [{"type": "transcript", "label": "Official Transcript"}, ...]
fee_amount = DecimalField(max_digits=10, decimal_places=2)
fee_currency = CharField(max_length=3, default='USD')
status = CharField(choices=['draft', 'published', 'archived'], default='draft')
```

## programs.AdmissionCycle (tenant-scoped)

```python
# inherits university FK from TenantScopedModel (denormalized for RLS)
program = ForeignKey('programs.Program', on_delete=CASCADE, related_name='cycles')
name = CharField(max_length=255)
open_date = DateTimeField()
close_date = DateTimeField()
status = CharField(choices=['scheduled', 'open', 'closed', 'archived'])
# auto-transitioned by Celery beat task, not manually — FR-21
```

## admissions.Application (tenant-scoped)

```python
# inherits university FK from TenantScopedModel (denormalized for RLS)
applicant = ForeignKey('identity.Applicant', on_delete=CASCADE, related_name='applications')
program = ForeignKey('programs.Program', on_delete=CASCADE, related_name='applications')
admission_cycle = ForeignKey('programs.AdmissionCycle', on_delete=CASCADE)
status = CharField(choices=[
    'draft', 'submitted', 'under_review',
    'admitted', 'rejected', 'waitlisted',
    'accepted', 'declined'
], default='draft')
form_data = JSONField(default=dict)
submitted_at = DateTimeField(null=True, blank=True)
decision_at = DateTimeField(null=True, blank=True)
decision_by = ForeignKey('identity.UniversityStaff', null=True, blank=True,
                          on_delete=SET_NULL, related_name='decisions')
offer_response_at = DateTimeField(null=True, blank=True)  # immutable once set
```

## admissions.ApplicationStatusHistory (tenant-scoped via application)

```python
application = ForeignKey('admissions.Application', on_delete=CASCADE, related_name='history')
from_status = CharField(max_length=50, null=True, blank=True)
to_status = CharField(max_length=50)
changed_by_type = CharField(choices=['applicant', 'university_staff', 'system'])
changed_by_id = UUIDField(null=True, blank=True)
reason = TextField(blank=True)
```

Note: No university FK directly — tenant scope inherited via application.

## documents.ApplicationDocument (tenant-scoped via application)

```python
application = ForeignKey('admissions.Application', on_delete=CASCADE, related_name='documents')
document_type = CharField(max_length=100)  # matches a key from program.required_documents
file = FileField(upload_to='documents/', storage=GCSStorage())
status = CharField(choices=['pending', 'verified', 'flagged'], default='pending')
flagged_reason = TextField(blank=True, null=True)
version = PositiveIntegerField(default=1)  # increment on re-upload; old versions retained
reviewed_by = ForeignKey('identity.UniversityStaff', null=True, blank=True,
                          on_delete=SET_NULL)
reviewed_at = DateTimeField(null=True, blank=True)
```

## payments.Payment (tenant-scoped via application)

```python
application = OneToOneField('admissions.Application', on_delete=CASCADE)
# OneToOneField enforces one payment per application at DB level (ADR-003)
amount = DecimalField(max_digits=10, decimal_places=2)
currency = CharField(max_length=3, default='USD')
processor_reference = CharField(max_length=255, blank=True)
status = CharField(choices=['pending', 'succeeded', 'failed'], default='pending')
refundable = BooleanField(default=False)  # ADR-002: non-refundable
initiated_at = DateTimeField()  # ADR-009: deadline check uses this, not completed_at
completed_at = DateTimeField(null=True, blank=True)
```

## audit.AuditLogEntry

```python
actor_type = CharField(choices=['applicant', 'university_staff', 'platform_admin', 'system'])
actor_id = UUIDField(null=True, blank=True)
university = ForeignKey('universities.University', null=True, blank=True,
                         on_delete=SET_NULL)  # null for platform-level actions
action = CharField(max_length=100)  # e.g. 'decision_issued', 'document_flagged'
entity_type = CharField(max_length=50)
entity_id = UUIDField()  # NOT a strict FK — must survive even if referenced row changes
before_state = JSONField(null=True, blank=True)
after_state = JSONField()
# Note: AuditLogEntry has id + created_at only (no updated_at — audit records are immutable)
```

---

## Key Indexes (must exist in migrations)

```python
# Application review queue — most frequent staff-side query
Index(fields=['university', 'status'])  # on Application

# Applicant dashboard
Index(fields=['applicant'])  # on Application

# Cycle auto-transition job (FR-21)
Index(fields=['status', 'open_date', 'close_date'])  # on AdmissionCycle

# Audit log filtered view
Index(fields=['university', 'created_at'])  # on AuditLogEntry
```

---

## Row-Level Security (apply as RunSQL migrations)

```sql
-- Apply to: programs_program, programs_admissioncycle, admissions_application,
-- documents_applicationdocument, payments_payment, identity_universitystaff

ALTER TABLE admissions_application ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON admissions_application
  USING (university_id = current_setting('app.current_university_id')::uuid);

-- Django middleware sets this per request for UniversityStaff users
-- Platform Admin uses a separate DB role that bypasses RLS
```
