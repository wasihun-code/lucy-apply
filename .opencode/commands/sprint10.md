# Sprint 10 — Security Hardening including MFA

## What you are building in this sprint

MFA enrollment and verification for all staff/admin accounts, rate limiting on login, and a systematic pass through the Phase 11 security checklist. Do NOT skip any item.

## Dependency check

Sprint 9 must be complete. The full portal (applicant, staff, platform admin) must exist before security hardening can be verified end-to-end.

## Deliverables

### 1. MFA implementation (django-otp, ADR-017)

**Backend:**
`POST /api/v1/auth/mfa/setup/` — TOTP device enrollment:
- Creates a `django-otp` TOTPDevice linked to the user
- Returns a QR code URI (for Google Authenticator / Authy)
- Only callable by UniversityStaff and PlatformAdmin — Applicant accounts never see this

`POST /api/v1/auth/mfa/verify/` — TOTP code verification:
- Verifies the 6-digit code against the user's TOTPDevice
- On success: sets `request.session['mfa_verified'] = True`
- On failure: returns 400 with remaining attempts count

`MFAVerified` permission class:
```python
class MFAVerified(BasePermission):
    def has_permission(self, request, view):
        if isinstance(request.user, (UniversityStaff, PlatformAdmin)):
            return request.session.get('mfa_verified', False)
        return True  # Applicants don't need MFA
```

**Frontend:**
- After login, if user is UniversityStaff or PlatformAdmin and no MFA device is enrolled: redirect to MFA setup page
- If MFA device exists: show TOTP code input before granting portal access
- QR code display for initial setup (using a QR code library)

### 2. Rate limiting on login (ADR-015)

Using `django-ratelimit` or DRF's built-in throttle classes:
- After 5 failed login attempts per IP within 5 minutes: require CAPTCHA
- Use Google reCAPTCHA v2 or hCaptcha (add CAPTCHA_SECRET_KEY to Secret Manager)
- Per-email rate limit on password reset requests: max 3 per hour

### 3. Phase 11 security checklist pass

Work through `context/SECURITY.md` systematically. For each item, verify it is implemented or add the implementation:

- [ ] TLS enforced (Cloud Run handles this — verify no HTTP allowed)
- [ ] Passwords stored via AbstractBaseUser (verify no CustomUser model bypasses this)
- [ ] JWT in httpOnly cookies on Next.js side (verify no localStorage usage)
- [ ] GCS bucket is private (verify bucket ACL in Terraform or GCP Console)
- [ ] Files served via signed URLs (verify GCSStorage config uses signed URL method)
- [ ] File type validation by content inspection — add `python-magic` if not present
- [ ] Webhook signature verification present (verify from Sprint 5)
- [ ] Fee amount from server-side — verify NO request.data fee path (grep for it)
- [ ] Password reset tokens: crypto random, single-use, 15-min expiry (audit the implementation)
- [ ] MFA enforced on all UniversityStaff and PlatformAdmin views (audit the MFAVerified usage)

### 4. `@security-check` audit pass
Run `@security-check` on these files specifically, fix every CRITICAL and HIGH issue found:
- `payments/views.py`
- `admissions/views.py`
- `documents/views.py`
- `identity/views.py`
- `identity/permissions.py`

## Tests required (all of these are required, not optional)
- MFA setup produces a valid TOTP QR code
- MFA verify with correct code → `mfa_verified=True` in session
- MFA verify with wrong code → 400
- UniversityStaff cannot access any portal endpoint without MFA verified (403)
- Login rate limiting: 5 failed attempts → CAPTCHA required
- File upload: reject a disguised executable (rename a .exe to .pdf, attempt upload → 400)
- Webhook without valid signature → 400, no application state change

## Done when
- `@security-check` on all five files above returns zero CRITICAL issues
- MFA login flow works end-to-end in Staging for a UniversityStaff account
- `pytest` passes for all apps
