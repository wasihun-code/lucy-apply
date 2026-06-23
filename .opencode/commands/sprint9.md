# Sprint 9 — Staff Management + Platform Admin

## What you are building in this sprint

Staff invite/remove, the Platform Admin portal (university onboarding, health dashboard, audit log), and the production deployment configuration. Starts Milestone 4.

## Dependency check

Milestone 3 must be verified complete on Staging — full applicant-to-decision loop with no shortcuts.

## Deliverables

### 1. Staff management
`POST /universities/{id}/staff/` — invite staff by email (UniversityAdmin only):
- Creates a `UniversityStaff` account in 'active' status
- Sends invitation email with a password-set link (same mechanism as password reset)
- `permission_level` set by the Admin at invite time ('officer' or 'admin')

`DELETE /universities/{id}/staff/{staff_id}/` — remove staff (UniversityAdmin only):
- Sets `account_status='deactivated'` — never hard-deletes
- Deactivated accounts cannot log in (return 403 on login attempt)
- Existing application review assignments remain accessible to other staff

Next.js: `/portal/team/` — list staff, invite form, remove button.

### 2. Platform Admin portal (Next.js)
New route group: `/admin/` — only accessible to PlatformAdmin accounts.

`/admin/universities/` — list all universities with status, program count, application count
`/admin/universities/new/` — onboard a new university + invite initial University Admin
`/admin/users/` — search users across all roles, deactivate any account
`/admin/audit-log/` — filterable audit log (by university, action type, date range)
`/admin/stats/` — platform health counts (total applicants, applications by status, universities)

### 3. Platform Admin API endpoints
Per `context/API_ROUTES.md`:
- `GET /admin/universities/` — unscoped, all universities
- `POST /universities/` — create university + invite first UniversityAdmin (PlatformAdmin only)
- `GET /admin/stats/` — aggregate counts
- `GET /admin/users/` — cross-model user search
- `PATCH /admin/users/{id}/status/` — deactivate any account
- `GET /admin/audit-log/` — unscoped AuditLogEntry ReadOnlyModelViewSet

All: `permission_classes = [IsAuthenticated, IsPlatformAdmin, MFAVerified]`

### 4. University-scoped audit log
`GET /universities/{id}/audit-log/` — same model, TenantManager-scoped, for University Admins:
`permission_classes = [IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]`

### 5. University onboarding flow
`POST /universities/` creates the university in 'inactive' status and triggers an invitation email to the first University Admin. The University Admin must then complete the profile and publish at least one program before the Platform Admin can activate the university to 'active' status.

### 6. Production deployment setup
- Configure all four Cloud Run services for Production in GitHub Actions (per Phase 12 v0.2)
- Set up production secrets in Secret Manager (separate from Staging)
- Configure the manual approval gate in GitHub Actions environment protection
- Do NOT flip the gate yet — Sprint 10 security hardening must pass first

## Tests required
- Deactivated staff account cannot log in (403)
- Invited staff can set password via the invite link and log in
- PlatformAdmin can view all universities across tenants
- PlatformAdmin CANNOT issue application decisions (403) — verify this is not accidentally allowed
- UniversityAdmin audit log is scoped to their university only

## Done when
- Platform Admin can onboard a new university through the `/admin/` UI (no direct DB access needed)
- Audit log is populated and queryable for test events
- `pytest audit/ identity/` passes
