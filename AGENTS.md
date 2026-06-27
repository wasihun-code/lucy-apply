# Lucy Apply — Agent Standing Brief

**Status**: Sprint 11 complete (cross-tenant isolation, edge cases, Celery monitoring). QA suite: 36 scripts, all pass. Pytest: 254 tests, all pass.
Context files in `context/` are the authoritative spec — read before touching that code.

## How to work

- `/sprintN` loads scope from `.opencode/commands/`.
- **Plan mode first** (`opencode.json` plan agent), then **Build mode**.
- Run `@review` after each sprint (tenant-scoping, permissions, state machine).
- Run `@security-check` before payment/auth/document PRs.

## Multi-tenancy (non-negotiable)

1. Tenant-scoped models use `TenantScopedModel` abstract base (adds `university` FK).
2. `TenantManager` is the **default** manager — auto-filters by `request.user.universitystaff.university_id` via `CurrentRequestMiddleware` + threadlocal. Never call `.all()` unscoped on tenant models outside system tasks or PlatformAdmin views.
3. `IsScopedToUniversity` permission class on every UniversityStaff ViewSet.
4. RLS policies via `RunSQL` migrations as third layer.
5. **Cross-tenant data leaks are the #1 severity bug.**

## Role model & auth

Four mutually-exclusive roles: `Applicant` (global, own data), `UniversityStaff Officer/Admin` (tenant-scoped), `PlatformAdmin` (cross-tenant). MFA required for staff/admin.

JWT dual-mode: Bearer header **or** httpOnly cookies (`access_token`, `refresh_token`). Next.js API route at `/api/auth/login/` proxies Django login and sets cookies. NEVER store tokens in localStorage.

Deactivated accounts return HTTP 403 with generic "Invalid credentials" (no info leak).

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

- Base path: `/api/v1/`, DRF ViewSets + DefaultRouter, `@action` for non-CRUD.
- Pagination: `PageNumberPagination`, `page_size=20`, max 100.
- Errors: custom handler → `{"error": {"code": "...", "message": "..."}}`.
- `/payments/webhook/`: `@csrf_exempt` + signature verification only — never JWT auth.
- Fee amount from `program.fee_amount` (server-side) — never from request body.

## Audit & lifecycle

- `AuditLogEntry` via Django signals, not inline in views.
- Never hard-delete: submitted applications, payments, documents (versioned), audit logs.
- Users/staff: soft-delete via `account_status='deactivated'`.
- Each application pays exactly one fee (`Payment.application` is `OneToOneField`).
- Deadline check at `payment.initiated_at`, not `completed_at`.

## MFA (Sprint 10)

- `MFASetupView`: idempotent (returns existing device config on repeat call).
- `MFAVerifyView`: max 5 attempts, then 5-min session lockout. Returns `remaining_attempts` in error.
- `AuthMeView` exposes `mfa_enabled` and `mfa_verified` for staff/admin only.
- `MFAVerified` permission: `TESTING` guard bypasses for pytest; staff/admin must have `request.session['mfa_verified'] == True`.

## Rate limiting (Sprint 10)

4 custom DRF throttle classes in `identity/throttles.py`:
- `LoginRateThrottle` — email-keyed, 5/hour
- `RegisterRateThrottle` — IP-keyed, 5/hour
- `PasswordResetRateThrottle` — email-keyed, 3/hour
- `MFARateThrottle` — user PK/IP, 10/hour

Configured in `settings.py` `DEFAULT_THROTTLE_RATES`. Applied to auth views.

## Security (Sprint 10)

- **Email enumeration fix**: `ForgotPasswordView`, `ResendVerificationView`, `VerifyEmailView` use `.filter().first()` instead of `get_object_or_404()`, return generic messages regardless of email existence.
- **File validation**: `documents/validation.py` — python-magic MIME validation (PDF, JPEG, PNG, TIFF, DOC/DOCX). Fails closed on `ImportError` (returns `False`).
- **GCS signed URLs**: `documents/utils.py` `generate_upload_url()` returns `None` in dev/test.
- **reCAPTCHA v2**: `payments/captcha.py` — enforces `score >= 0.5` threshold, passes `remoteip`.
- **Tokens**: Never log plaintext token values.

## Testing

### pytest
```bash
venv/bin/python -m pytest              # 254 tests, in-memory SQLite
venv/bin/python -m pytest path/to/test  # single test file
```
- Uses `OPENSE_TESTING=true` (set in root `conftest.py`) to enable `TESTING` flag in settings.
- `TESTING=True` controls: Celery eager mode, Stripe validation bypass, MFA bypass.
- Never touches `db.sqlite3` (in-memory DB).

### QA regression (shell scripts against isolated server)
```bash
bash qa/run_all.sh                      # full suite (36 scripts, all pass)
bash qa/teardown.sh                     # cleanup if needed
```
- Uses `settings_qa.py` → `qa_db.sqlite3`. Never touches dev DB.
- Port: auto-selected 8001–8010 via `ss -tln`. Set `QA_PORT` to override.
- `run_all.sh` sets `BASE_URL` and `DJANGO_SETTINGS_MODULE` for all child scripts.
- Seed creds: `admin@lucyapply.com/adminpass123!` (PlatformAdmin), `staffadmin@univ.com/staffpass123!` (staff admin), `alice@test.com/testpass123!` (applicant).

### Dev workflow
```bash
venv/bin/python manage.py runserver     # dev server on db.sqlite3
bash qa/auth/01_register.sh             # against dev server
```

## CI

GitHub Actions (`.github/workflows/ci.yml`): runs `python manage.py check` then `pytest --tb=short` against PostgreSQL 15 + Redis 7. No lint/typecheck stage.

## Docker

`docker-compose.yml`: 6 services — `db` (postgres:15), `redis` (redis:7-alpine), `backend` (gunicorn on 8080), `celery-worker`, `celery-beat`, `frontend` (Next.js on 3000). Stripe env vars required. `libmagic1` installed in `Dockerfile.backend` for python-magic.

## Context files (read before writing that area)

| File | When |
|---|---|
| `context/ARCHITECTURE.md` | Structural decisions |
| `context/DATABASE_SCHEMA.md` | Any model definition |
| `context/API_ROUTES.md` | ViewSet or endpoint |
| `context/PERMISSIONS.md` | Permission classes |
| `context/STATE_MACHINES.md` | Status transitions |
| `context/SECURITY.md` | Auth/payment/document code |

## Misc

- Python 3.12.10 (`.python-version`), Django 6.0.6, DRF 3.17.1, Next.js ~14.2.
- No lint, typecheck, or formatter configured in CI.
- Celery beat auto-transitions admission cycles hourly (`programs.tasks.auto_transition_cycles`).
- Frontend has no TypeScript compilation step in CI — `npx tsc --noEmit` to check manually.
- QA `run_all.sh` auto-detects free ports with `ss -tln` (not `lsof`).
