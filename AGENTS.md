# Lucy Apply — Agent Standing Brief

**No implementation code exists yet.** This repo is pure scaffolding: context docs, opencode config, sprint commands. Sprint 1 builds the Django project from scratch. PLAYBOOK.md documents the human's end-to-end workflow — read it once.

## How to work

- `/sprintN` (N=1..11) loads sprint scope from `.opencode/commands/`.
- Always **Plan mode first** (read-only, `opencode.json` plan agent), then **Build mode**.
- Run `@review` after each sprint (tenant-scoping, permissions, state machine).
- Run `@security-check` before payment/auth/document PRs.
- Context files in `/context/` are the authoritative spec for each area — read before touching that code.

## Locked stack

| Layer | Choice |
|---|---|
| Backend | Django 5.x + Django REST Framework |
| Frontend | Next.js 14+ (App Router) |
| Database | PostgreSQL 15+ via Django ORM |
| Background jobs | Celery + Redis (Cloud Memorystore) |
| Object storage | GCS via django-storages |
| Auth | simplejwt + django-otp (MFA) |
| Hosting | Cloud Run + Cloud SQL |
| CI/CD | GitHub Actions |
| Tenant isolation | Shared DB + university_id + RLS |

Do not suggest alternatives. These are locked.

## Django apps

```
lucy_apply/
  identity/       ← User models (Applicant, UniversityStaff, PlatformAdmin)
  universities/   ← University model
  programs/       ← Program, AdmissionCycle
  admissions/     ← Application, ApplicationStatusHistory
  documents/      ← ApplicationDocument
  payments/       ← Payment model
  notifications/  ← Celery tasks only (no persistent models for MVP)
  audit/          ← AuditLogEntry
```

## Multi-tenancy (non-negotiable)

1. Tenant-scoped models use `TenantScopedModel` abstract base (adds `university` FK) — never add manually.
2. `TenantManager` is the **default** manager — auto-filters by `request.user.university_id`.
3. `IsScopedToUniversity` permission class on every UniversityStaff ViewSet.
4. RLS policies via `RunSQL` migrations as third layer. Platform Admin bypasses via separate DB role.
5. **Cross-tenant data leaks are the #1 severity bug.** When in doubt, add the scope check.

## Role model

Four mutually-exclusive roles: `Applicant` (global, own data), `UniversityStaff Officer/Admin` (tenant-scoped), `PlatformAdmin` (cross-tenant). MFA required for staff and admin.

## Application state machine

```
draft → submitted → under_review → admitted → accepted
                                    → rejected
                                    → waitlisted
admitted/rejected/waitlisted → under_review (reversal, before applicant responds)
admitted → declined
```

Immutable: `accepted` and `declined`. All transitions go through `transition_application()` in `admissions/state_machine.py` — never write `application.status = x` directly. Decisioning precondition: all required docs must be `verified`.

## API conventions

- Base path: `/api/v1/`, DRF ViewSets + DefaultRouter, `@action` for non-CRUD actions.
- Pagination: `PageNumberPagination`, `page_size=20`, max 100.
- Filtering: `django-filter` `DjangoFilterBackend`.
- Errors: custom handler → `{"error": {"code": "...", "message": "..."}}`.
- `/payments/webhook/`: `@csrf_exempt` + signature verification **only** — never JWT auth.
- Fee amount from `program.fee_amount` (server-side) — never from request body.

## Audit & lifecycle

- AuditLogEntry via Django signals, not inline in views.
- Never hard-delete: Submitted applications, payments, documents (versioned), audit logs.
- Users/staff: soft-delete via `account_status='deactivated'`.
- Each application pays exactly one fee (`Payment.application` is `OneToOneField`).
- Deadline check at `payment.initiated_at`, not `completed_at` (ADR-009).

## Context files (read before writing that area)

| File | When |
|---|---|
| `context/ARCHITECTURE.md` | Structural decisions |
| `context/DATABASE_SCHEMA.md` | Any model definition |
| `context/API_ROUTES.md` | ViewSet or endpoint |
| `context/PERMISSIONS.md` | Permission classes |
| `context/STATE_MACHINES.md` | Status transitions |
| `context/SECURITY.md` | Auth/payment/document code |

## Database Isolation (non-negotiable)

The QA regression suite and pytest **must never** touch the development database (`db.sqlite3`).

### QA Suite (`qa/run_all.sh`)
- Uses `lucy_apply/settings_qa.py` which sets `DATABASES` to `qa_db.sqlite3`
- `run_all.sh` orchestrates: setup_db → seed data → start server (port 8001) → run tests → teardown
- `DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa` is exported so all child shells use the QA DB
- The QA database is deleted on teardown — each run starts fresh
- Individual test scripts (run directly, not via `run_all.sh`) use the dev server/dev DB as before

### pytest
- Uses Django's built-in test runner with an in-memory SQLite database
- Never touches `db.sqlite3` — verified by unchanged timestamp before/after runs
- 179 tests all pass in isolation

### Running
```bash
# Full isolated QA regression (creates/starts/tests/cleans up)
bash qa/run_all.sh

# pytest (always isolated via in-memory DB)
venv/bin/python -m pytest

# Dev workflow (runs against dev DB — for individual script debugging)
# 1. Start dev server:  venv/bin/python manage.py runserver
# 2. Run a script:      bash qa/auth/01_register.sh
```
