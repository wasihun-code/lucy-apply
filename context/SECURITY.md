# Lucy Apply — Security Reference

## Non-Negotiable Rules (any violation is a CRITICAL bug)

### 1. Tenant Scoping
- NEVER use `.objects.all()` on a tenant-scoped model in a ViewSet without TenantManager filtering
- ALWAYS check IsScopedToUniversity in permission_classes before reading tenant data
- RLS policies must exist as migrations for every tenant-scoped table

### 2. Payment Webhook
- The `/payments/webhook/` view must be `@csrf_exempt`
- Verify processor signature BEFORE reading any payload content
- A request without a valid signature must return HTTP 400 and log the attempt — never proceed
- Do NOT apply JWT auth to this endpoint

### 3. Fee Amount
- Fee amount comes from `program.fee_amount` (server-side), read at payment-intent creation
- NEVER read `fee_amount` from `request.data` — if client sends it, ignore it

### 4. File Uploads
- Files served via signed GCS URLs (time-limited, scoped to the specific object)
- Bucket must be PRIVATE — never set ACL to public-read
- Validate file type by content inspection (e.g. python-magic), not just extension

### 5. JWT Storage (Next.js side)
- JWT tokens stored in httpOnly cookies only
- NEVER store tokens in localStorage or sessionStorage — XSS-readable

### 6. Password Storage
- Django's AbstractBaseUser uses PBKDF2/bcrypt — never store plaintext
- Never log passwords or JWT tokens

### 7. Password Reset Tokens
- Cryptographically random (secrets.token_urlsafe)
- Single-use (invalidate after first use)
- Short-lived (15 minutes max)
- Invalidate prior tokens when a new reset is requested

## MFA Enforcement
- `MFAVerified` permission class checks `request.session['mfa_verified'] == True`
- Applied to all UniversityStaff and PlatformAdmin views
- Not required for Applicant views

## Rate Limiting
- Login endpoint: django-ratelimit or DRF throttle — max 5 attempts before CAPTCHA required
- Account creation: reasonable per-IP limit
- Password reset requests: per-email rate limit to prevent enumeration

## Audit Events (write via Django signal, not inline in views)

| Event | Actor | Entity |
|---|---|---|
| Application status change | staff / applicant / system | Application |
| Document flagged/verified | UniversityStaff | ApplicationDocument |
| Payment completed/failed | system (webhook) | Payment |
| University onboarded | PlatformAdmin | University |
| Staff account created/deactivated | UniversityAdmin / PlatformAdmin | UniversityStaff |
| Decision issued/reversed | UniversityStaff | Application |
