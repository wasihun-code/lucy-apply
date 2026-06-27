# Staging Smoke Test Checklist

Run through each check on the staging environment **before** approving the production deploy.

## Public pages
- [ ] `GET /api/v1/universities/` returns list of active universities (unauthenticated)
- [ ] `GET /api/v1/programs/` returns published programs
- [ ] `GET /api/v1/programs/{id}/` returns program detail with open_cycles

## Applicant flow
- [ ] `POST /api/v1/auth/register/` creates applicant (201)
- [ ] `POST /api/v1/auth/verify-email/` verifies email (200)
- [ ] `POST /api/v1/auth/login/` returns JWT tokens (200)
- [ ] `POST /api/v1/applications/` creates draft (201)
- [ ] `PATCH /api/v1/applications/{id}/` saves form_data (200)
- [ ] `POST /api/v1/applications/{id}/documents/` uploads file (201)
- [ ] `POST /api/v1/applications/{id}/payment-intent/` creates pending payment (200)
- [ ] `POST /api/v1/applications/{id}/submit/` transitions to submitted (200)

## Staff flow (with MFA)
- [ ] `POST /api/v1/auth/login/` returns tokens for staff user (200)
- [ ] `POST /api/v1/auth/mfa/setup/` returns provisioning URI (200)
- [ ] `POST /api/v1/auth/mfa/verify/` verifies MFA code (200)
- [ ] `GET /api/v1/auth/me/` shows mfa_verified=true (200)
- [ ] `GET /api/v1/universities/{id}/applications/` shows review queue (200)
- [ ] `PATCH /api/v1/applications/{id}/status/` issues decision (200)

## Platform Admin
- [ ] `GET /api/v1/admin/universities/` returns all universities (200)
- [ ] `GET /api/v1/admin/stats/` returns system stats (200)

## Edge cases
- [ ] Login with deactivated account → 403, generic "Invalid credentials"
- [ ] Login with wrong password → 401
- [ ] Non-existent email in forgot-password → generic "Email sent" message
- [ ] Unauthenticated access to protected endpoint → 401
- [ ] Submit application without required docs → 400 MISSING_DOCS
- [ ] Submit application without payment → 400 PAYMENT_REQUIRED

## Production deploy approval

After all checks pass, manually approve the GitHub Actions deploy to Production.

**Deploy gate**: `Pass / Fail` (circle one)
**Signed off by**: _______________
**Date**: _______________________
