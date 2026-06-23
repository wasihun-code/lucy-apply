# Lucy Apply — API Routes Reference

Base path: `/api/v1/`
All endpoints use DRF DefaultRouter + ViewSets unless noted.

## Auth (function-based views, not ViewSets)

| Method | Path | View | Roles |
|---|---|---|---|
| POST | /auth/register/ | RegisterView | Public |
| POST | /auth/login/ | TokenObtainPairView (simplejwt) | Public |
| POST | /auth/verify-email/ | VerifyEmailView | Public |
| POST | /auth/resend-verification/ | ResendVerificationView | Public |
| POST | /auth/forgot-password/ | ForgotPasswordView | Public |
| POST | /auth/reset-password/ | ResetPasswordView | Public |
| POST | /auth/refresh/ | TokenRefreshView (simplejwt) | Authenticated |
| POST | /auth/logout/ | LogoutView (blacklist) | Authenticated |
| POST | /auth/mfa/setup/ | MFASetupView | UniversityStaff/Admin |
| POST | /auth/mfa/verify/ | MFAVerifyView | UniversityStaff/Admin |

## Applicants (ModelViewSet, restricted to 'me')

| Method | Path | Action | Roles |
|---|---|---|---|
| GET | /applicants/me/ | retrieve (self) | Applicant |
| PATCH | /applicants/me/ | partial_update | Applicant |
| GET | /applicants/me/applications/ | @action | Applicant |

## Universities (ModelViewSet)

| Method | Path | Action | Roles |
|---|---|---|---|
| GET | /universities/ | list (active only for AllowAny) | Public |
| GET | /universities/{id}/ | retrieve | Public |
| POST | /universities/ | create | PlatformAdmin |
| PATCH | /universities/{id}/ | partial_update | UniversityAdmin |
| PATCH | /universities/{id}/status/ | @action | PlatformAdmin |
| GET | /universities/{id}/staff/ | @action | UniversityAdmin |
| POST | /universities/{id}/staff/ | @action (invite) | UniversityAdmin |
| DELETE | /universities/{id}/staff/{staff_id}/ | @action (remove) | UniversityAdmin |

## Programs (ModelViewSet)

| Method | Path | Action | Roles |
|---|---|---|---|
| GET | /programs/ | list (published only, AllowAny) | Public |
| GET | /programs/{id}/ | retrieve | Public |
| GET | /universities/{id}/programs/ | nested list (incl. drafts) | Officer/Admin |
| POST | /universities/{id}/programs/ | nested create | UniversityAdmin |
| PATCH | /programs/{id}/ | partial_update | UniversityAdmin |
| PATCH | /programs/{id}/status/ | @action | UniversityAdmin |

## Admission Cycles (ModelViewSet, nested)

| Method | Path | Action | Roles |
|---|---|---|---|
| GET | /programs/{id}/cycles/ | nested list | Officer/Admin |
| POST | /programs/{id}/cycles/ | nested create | UniversityAdmin |
| PATCH | /admission-cycles/{id}/ | partial_update | UniversityAdmin |
| PATCH | /admission-cycles/{id}/close/ | @action | UniversityAdmin |
| PATCH | /admission-cycles/{id}/archive/ | @action | UniversityAdmin |

## Applications (ModelViewSet)

| Method | Path | Action | Roles |
|---|---|---|---|
| POST | /applications/ | create (draft) | Applicant |
| GET | /applications/{id}/ | retrieve (role-scoped) | Applicant / Officer / Admin |
| PATCH | /applications/{id}/ | partial_update (draft only) | Applicant |
| POST | /applications/{id}/submit/ | @action | Applicant |
| DELETE | /applications/{id}/ | destroy (draft only) | Applicant |
| GET | /universities/{id}/applications/ | nested list (review queue) | Officer/Admin |
| PATCH | /applications/{id}/status/ | @action (decide/reverse) | Officer/Admin |
| GET | /applications/{id}/history/ | @action | Applicant / Officer / Admin |
| POST | /applications/{id}/offer-response/ | @action | Applicant |

## Documents (nested under applications)

| Method | Path | Action | Roles |
|---|---|---|---|
| GET | /applications/{id}/documents/ | nested list | Applicant / Officer / Admin |
| POST | /applications/{id}/documents/upload-url/ | @action (GCS signed URL) | Applicant |
| POST | /applications/{id}/documents/ | nested create (register upload) | Applicant |
| PATCH | /documents/{id}/verify/ | @action | Officer/Admin |
| PATCH | /documents/{id}/flag/ | @action (requires reason) | Officer/Admin |

## Payments

| Method | Path | View | Roles |
|---|---|---|---|
| POST | /applications/{id}/payment-intent/ | @action on ApplicationViewSet | Applicant |
| POST | /payments/webhook/ | WebhookView (@csrf_exempt, NO JWT) | External |
| GET | /applications/{id}/payment/ | @action | Applicant / Officer / Admin |

## Admin

| Method | Path | Action | Roles |
|---|---|---|---|
| GET | /admin/universities/ | list (unscoped) | PlatformAdmin |
| GET | /admin/stats/ | APIView | PlatformAdmin |
| GET | /admin/users/ | APIView | PlatformAdmin |
| PATCH | /admin/users/{id}/status/ | @action | PlatformAdmin |
| GET | /admin/audit-log/ | ReadOnlyModelViewSet (unscoped) | PlatformAdmin |
| GET | /universities/{id}/audit-log/ | ReadOnlyModelViewSet (scoped) | UniversityAdmin |
