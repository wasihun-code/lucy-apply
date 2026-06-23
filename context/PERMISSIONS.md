# Lucy Apply — Permissions Reference

## Custom DRF Permission Classes

These live in `identity/permissions.py`. Import them everywhere — never inline permission logic.

```python
IsApplicant           # user is an Applicant instance
IsUniversityStaff     # user is a UniversityStaff instance (officer OR admin)
IsUniversityAdmin     # user is UniversityStaff with permission_level='admin'
IsPlatformAdmin       # user is a PlatformAdmin instance
IsEmailVerified       # user is Applicant AND email_verified=True
IsScopedToUniversity  # UniversityStaff can only access their own university's data
IsApplicantOwner      # Applicant can only access their own applications/documents
MFAVerified           # UniversityStaff and PlatformAdmin have completed MFA at this login
```

## ViewSet Permission Rules

| ViewSet | permission_classes |
|---|---|
| Auth endpoints | `[AllowAny]` |
| `ApplicantViewSet` (me) | `[IsAuthenticated, IsApplicant]` |
| Public program/university discovery | `[AllowAny]` |
| `UniversityViewSet` (admin actions) | `[IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]` |
| `ProgramViewSet` (write actions) | `[IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]` |
| `AdmissionCycleViewSet` (write) | `[IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]` |
| `ApplicationViewSet` (create/update) | `[IsAuthenticated, IsApplicant, IsEmailVerified]` |
| `ApplicationViewSet` (review queue) | `[IsAuthenticated, IsUniversityStaff, IsScopedToUniversity, MFAVerified]` |
| `ApplicationViewSet` (status change) | `[IsAuthenticated, IsUniversityStaff, IsScopedToUniversity, MFAVerified]` |
| `DocumentViewSet` (upload) | `[IsAuthenticated, IsApplicant, IsApplicantOwner]` |
| `DocumentViewSet` (verify/flag) | `[IsAuthenticated, IsUniversityStaff, IsScopedToUniversity, MFAVerified]` |
| `PaymentIntentView` | `[IsAuthenticated, IsApplicant, IsEmailVerified]` |
| `WebhookView` | NO JWT auth — `@csrf_exempt` + signature verification only |
| Admin ViewSets | `[IsAuthenticated, IsPlatformAdmin, MFAVerified]` |

## CRUD Matrix (who can do what to each entity)

| Entity | Applicant | Officer | Univ. Admin | Platform Admin |
|---|---|---|---|---|
| University | R(public) | R | R+U | C+R+U |
| Program | R(public) | R | C+R+U | R |
| AdmissionCycle | R | R | C+R+U | R |
| Application | C+R+U+D(own,draft only) | R(univ) + U(status) | R(univ) + U(status) | R+U |
| ApplicationDocument | C+R(own) + U(re-upload) | R(univ) + U(verify/flag) | R(univ) + U | R |
| Payment | C(own, via intent) + R(own) | R(univ) | R(univ) | R |
| UniversityStaff | — | R(self) + U(self) | C+R+U+D(univ) | C+R+U+D |
| AuditLogEntry | — | R(univ) | R(univ) | R |

## Important Edge Cases

1. **Applicant visibility into application**: read-only once Submitted. No editing form_data after submission.
2. **Decision reversal**: only UniversityStaff (Officer or Admin) at the application's university, only while `offer_response_at` is null.
3. **Deactivated accounts**: return 403 on login, not a helpful error message — do not leak whether an email exists.
4. **Cross-university Staff**: a University Admin at University A cannot view, edit, or enumerate University B's data — even if they guess a UUID. `IsScopedToUniversity` + RLS together enforce this.
