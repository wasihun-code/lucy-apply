# Lucy Apply — Agent Standing Brief

You are building **Lucy Apply**, an international student admissions platform for Ethiopian universities. Every session starts here. Read this fully before doing anything.

---

## What This Project Is

A multi-tenant web platform serving two sides:
- **Applicants** (international students, anywhere in the world) who discover Ethiopian universities, apply to programs, upload documents, pay fees, and track status.
- **Universities** (2–3 Ethiopian partner institutions for MVP) whose staff manage programs, review applications, and issue decisions.

The long-term vision is to become Ethiopia's national higher-education admissions infrastructure. The immediate goal is a demoable MVP.

---

## Locked Technical Stack — Do NOT deviate from this

| Layer | Technology |
|---|---|
| Backend | Django 5.x + Django REST Framework |
| Frontend | Next.js 14+ (App Router) |
| Database | PostgreSQL 15+ via Django ORM |
| Background jobs | Celery + Redis (Cloud Memorystore) |
| Object storage | Google Cloud Storage via django-storages |
| Auth | djangorestframework-simplejwt + django-otp (MFA) |
| Hosting | Google Cloud Run |
| DB hosting | Cloud SQL (PostgreSQL) |
| CI/CD | GitHub Actions |
| Tenant isolation | Shared DB + university_id + Postgres row-level security |

Do not suggest alternative frameworks, ORMs, or hosting options. These are locked decisions.

---

## Django App Structure — Every model goes in its correct app

```
lucy_apply/          ← Django project root
  identity/          ← User models (Applicant, UniversityStaff, PlatformAdmin, MFADevice)
  universities/      ← University model
  programs/          ← Program, AdmissionCycle models
  admissions/        ← Application, ApplicationStatusHistory models
  documents/         ← ApplicationDocument model
  payments/          ← Payment model
  notifications/     ← Celery tasks only, no persistent models for MVP
  audit/             ← AuditLogEntry model
```

---

## Multi-Tenancy Rules — These are non-negotiable

1. Every tenant-scoped model carries a `university` FK (ForeignKey to `universities.University`).
2. A `TenantScopedModel` abstract base class provides this FK consistently — never add it manually per model.
3. A custom `TenantManager` auto-filters by `request.user.university_id` — it must be the **default** manager on every tenant-scoped model.
4. A `IsScopedToUniversity` DRF permission class is applied via `permission_classes` on every ViewSet serving University Staff.
5. Postgres row-level security policies are the **third** layer — applied via `RunSQL` in migrations.
6. Platform Admin connections bypass RLS via a separate DB role.
7. **Cross-tenant data leaks are the single highest-severity bug class in this codebase.** When in doubt, add the scope check, don't skip it.

---

## Role Model

Four roles, mutually exclusive per account (ADR-004):

| Role | Scope |
|---|---|
| `Applicant` | Global — own data only |
| `UniversityStaff` (Officer) | Tenant-scoped — `permission_level='officer'` |
| `UniversityStaff` (Admin) | Tenant-scoped — `permission_level='admin'` |
| `PlatformAdmin` | Cross-tenant |

MFA (django-otp TOTP) is **required** for UniversityStaff and PlatformAdmin. Never skip this check on protected views.

---

## Application Status State Machine

Valid transitions only — enforce at the model/service level, not just the API:

```
DRAFT → SUBMITTED → UNDER_REVIEW → ADMITTED → ACCEPTED
                               → REJECTED
                               → WAITLISTED
ADMITTED/REJECTED/WAITLISTED → UNDER_REVIEW  (reversal, only before ACCEPTED/DECLINED)
ADMITTED → DECLINED
```

Invalid: any transition out of ACCEPTED or DECLINED. These are immutable once set.

---

## API Conventions

- Base path: `/api/v1/`
- DRF ViewSets + DefaultRouter for all resources
- `@action` decorator for non-CRUD operations (submit, verify, flag, offer-response, etc.)
- Pagination: `PageNumberPagination`, `page_size=20`, max 100
- Filtering: `django-filter` `DjangoFilterBackend`
- Errors: custom exception handler normalizing to `{"error": {"code": "...", "message": "..."}}`
- Webhook endpoint (`/payments/webhook/`): `@csrf_exempt` + signature verification — **never** add JWT auth to this endpoint

---

## Payment Rules

- Application fee is **non-refundable** (ADR-002).
- Each application pays exactly one fee — `Payment.application` is a `OneToOneField`.
- Fee amount comes from `program.fee_amount` on the server — **never trust a client-supplied fee amount**.
- Deadline check: evaluated at `payment.initiated_at`, not `payment.completed_at` (ADR-009).
- Webhook signature must be verified before processing any payment confirmation.

---

## Audit & Soft Delete

- Applications: never hard-delete once Submitted.
- Payments: never delete — financial record.
- ApplicationDocument: never delete — versions retained (FR-22), old versions kept not soft-deleted.
- AuditLogEntry: never delete — defeats its own purpose.
- Users/Staff: soft-delete via `account_status='deactivated'`, never hard-delete.
- Use Django signals to write AuditLogEntry records on status changes — don't put audit writes inside view/viewset logic.

---

## Context Files (always read these before writing code in a given area)

These files live in `/context/` and contain the authoritative specifications:

| File | When to read it |
|---|---|
| `context/ARCHITECTURE.md` | Before any structural decision |
| `context/DATABASE_SCHEMA.md` | Before writing any model |
| `context/API_ROUTES.md` | Before writing any ViewSet or endpoint |
| `context/PERMISSIONS.md` | Before writing any permission class or check |
| `context/STATE_MACHINES.md` | Before writing any status transition logic |
| `context/SECURITY.md` | Before any auth, payment, or document handling code |

---

## How to Behave as a Coding Agent

1. **Plan before building.** Use Plan mode to lay out your approach first, especially for any cross-app change. Only switch to Build mode once the plan is confirmed.
2. **One sprint card at a time.** Don't attempt work from multiple sprints in one session. The sprint card defines the full scope.
3. **Read the context file before writing the model.** Do not rely on memory — read `context/DATABASE_SCHEMA.md` every time you're about to write a model.
4. **Run tests after each significant change.** `pytest` for Django; `next build` for the frontend after structural changes.
5. **Never modify a locked decision.** If you think a locked decision needs revisiting, stop and flag it as a comment — don't quietly work around it.
6. **The `TenantManager` filters automatically — don't add manual `WHERE university_id = ?` in ViewSet `get_queryset` if the manager already handles it.** But verify the manager is actually the default manager first.
