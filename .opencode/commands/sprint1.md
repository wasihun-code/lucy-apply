# Sprint 1 — Django Project Setup + Auth

## What you are building in this sprint

Django project scaffold, custom User model architecture, and the full auth module. This is the foundation every other sprint depends on.

## Dependency check

No dependencies — this is Sprint 1. Start fresh.

## Deliverables

### 1. Django project structure
Create the project root `lucy_apply/` with the following apps (empty for now, just `django-admin startapp` stubs):
- `identity`
- `universities`
- `programs`
- `admissions`
- `documents`
- `payments`
- `notifications`
- `audit`

### 2. Custom User model (CRITICAL — must be done before the first migration)
In `identity/models.py`:
- Abstract base `User(AbstractBaseUser)` with: `email` (unique), `full_name`, `account_status` choices `['active', 'deactivated']`
- `Applicant(User)` concrete model: `country_of_residence`, `date_of_birth` (nullable), `nationality` (nullable), `passport_id_number` (nullable, encrypted via `django-cryptography`), `email_verified` (default False)
- `UniversityStaff(User)` concrete model: `university` FK (will exist once universities app has a model — use string reference `'universities.University'`), `permission_level` choices `['officer', 'admin']`
- `PlatformAdmin(User)` concrete model: no extra fields
- Set `AUTH_USER_MODEL` in `settings.py` — this MUST happen before `python manage.py migrate` is ever run

### 3. Abstract base models (shared infrastructure)
- `TimestampedUUIDModel` abstract base: `id` (UUIDField, primary_key=True, default=uuid4), `created_at` (auto_now_add), `updated_at` (auto_now)
- `TenantScopedModel` abstract base: extends `TimestampedUUIDModel`, adds `university = models.ForeignKey('universities.University', on_delete=models.CASCADE)` — every tenant-scoped model inherits this

### 4. Auth endpoints (FR-1 through FR-3)
Using `djangorestframework-simplejwt`:
- `POST /api/v1/auth/register/` — creates Applicant account, sends verification email
- `POST /api/v1/auth/login/` — simplejwt `TokenObtainPairView`
- `POST /api/v1/auth/verify-email/` — verifies email token, sets `email_verified=True`
- `POST /api/v1/auth/resend-verification/` — resends verification email
- `POST /api/v1/auth/forgot-password/` — triggers password reset email
- `POST /api/v1/auth/reset-password/` — sets new password via reset token
- `POST /api/v1/auth/refresh/` — simplejwt `TokenRefreshView`
- `POST /api/v1/auth/logout/` — blacklists refresh token via simplejwt blacklist app

### 5. MFA stub endpoints (ADR-017)
Using `django-otp`:
- `POST /api/v1/auth/mfa/setup/` — TOTP device enrollment for UniversityStaff/PlatformAdmin
- `POST /api/v1/auth/mfa/verify/` — TOTP code verification

## What NOT to build this sprint
- Do not build University, Program, or any other models yet
- Do not build the frontend (Next.js) yet
- Do not deploy to GCP yet

## Tests required
- Registration creates an unverified Applicant account
- Login returns JWT tokens
- Email verification sets `email_verified=True`
- Unverified applicant cannot submit applications (enforce this at the model/permission level now, even if submission doesn't exist yet — write the permission class `IsEmailVerified` ready to apply later)

## Risk note
**The custom User model pattern in Django has a specific gotcha**: `AUTH_USER_MODEL` must be set before the first `migrate` run. If you have already run `migrate` without it, the database must be reset. Do this first, before anything else.

## Done when
- `python manage.py runserver` starts without errors
- All 10 auth endpoints return expected responses in local testing
- `pytest identity/` passes
