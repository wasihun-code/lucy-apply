# Lucy Apply Current Implementation Audit

Audit date: 2026-06-30

Scope: current repository implementation after 12 backend development sprints and 15 frontend revamp sprints. FE-16 is not implemented yet. This audit is based on the codebase, migrations, routes, tests, QA scripts, deployment files, and frontend sprint context currently present in the repository.

## 1. Executive Summary

Lucy Apply is a functional MVP-stage admissions platform with a mature vertical slice for university discovery, applicant registration, application drafting/submission, document upload/review, payment initiation, staff review, platform administration, MFA, audit logs, and deployment scaffolding.

The backend is comparatively stable and test-covered. It is organized as a Django/DRF monolith with explicit apps for identity, universities, programs, admissions, documents, payments, notifications, and audit. Core admissions logic is implemented with a lightweight state-machine module rather than a configurable workflow engine. Tenancy is enforced mostly in application code through DRF permissions, query filtering, and a thread-local tenant manager. PostgreSQL RLS migrations exist only for documents and payments and are incomplete because the per-request PostgreSQL tenant setting is not set anywhere.

The frontend is significantly revamped and covers most planned FE-01 through FE-15 user experiences. It uses Next.js App Router, design-system primitives, layout shells, an httpOnly-cookie login proxy, and the `/api/proxy/*` route for authenticated backend calls. FE-16 remains: shared status timeline extraction and in-app notifications are absent.

Overall maturity: production-shaped MVP, not yet enterprise admissions-suite architecture. Strongest areas are CRUD/API coverage, applicant and staff flows, role permissions, tests, and UI coverage. Weakest areas are workflow configurability, notifications persistence, AI, search/matching, operational monitoring, complete database-level tenancy, payment production hardening, and documentation around product-scope gaps.

## 2. Implemented Modules

### identity

Purpose: user accounts, role modeling, authentication support, email verification, password reset, staff invitations, MFA, throttling, and role permissions.

Current implementation:
- Custom `User` model with multi-table subclasses: `Applicant`, `UniversityStaff`, `PlatformAdmin`.
- Applicant profile fields include country, date of birth, nationality, encrypted passport ID, and email verification flag.
- Staff belong to one university and have `officer` or `admin` permission level.
- Tokens exist for email verification, applicant password reset, and staff invite/password setup.
- JWT authentication uses SimpleJWT. Frontend stores access/refresh JWTs as httpOnly cookies through Next.js proxy routes.
- Staff/admin MFA uses `django_otp` TOTP devices and a session flag `mfa_verified`.
- Rate throttle classes exist for login, register, password reset, and MFA.
- `TenantManager` filters tenant-scoped models for university staff using a thread-local current request.

Major classes:
- `User`, `Applicant`, `UniversityStaff`, `PlatformAdmin`
- `EmailVerificationToken`, `PasswordResetToken`, `StaffInviteToken`
- `TimestampedUUIDModel`, `TenantScopedModel`
- `UserManager`, `TenantManager`
- permission classes: `IsApplicant`, `IsUniversityStaff`, `IsUniversityAdmin`, `IsPlatformAdmin`, `IsEmailVerified`, `IsScopedToUniversity`, `IsApplicantOwner`, `MFAVerified`, `IsApplicantOwnerOrStaffScoped`

Important services:
- `CurrentRequestMiddleware`
- `EncryptedCharField`
- throttle classes
- SimpleJWT token blacklist on logout
- TOTP MFA setup/verify

APIs:
- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/verify-email/`
- `POST /api/v1/auth/resend-verification/`
- `POST /api/v1/auth/forgot-password/`
- `POST /api/v1/auth/reset-password/`
- `POST /api/v1/auth/refresh/`
- `POST /api/v1/auth/logout/`
- `POST /api/v1/auth/mfa/setup/`
- `POST /api/v1/auth/mfa/verify/`
- `GET /api/v1/auth/me/`
- `POST /api/v1/auth/set-staff-password/`
- `GET/PATCH /api/v1/applicants/me/`
- platform admin users/status endpoints

Current maturity: solid MVP. Gaps include no authenticated password-change endpoint, no user-created platform admin flow except Django/admin/seed patterns, no persistent login/session audit, partial role naming inconsistency between frontend and backend (`universitystaff` vs planned `university_staff`), and incomplete MFA enforcement at the frontend middleware layer.

### universities

Purpose: partner university catalog, university activation, staff management, university-scoped program/application/audit access.

Current implementation:
- `University` model with name, description, logo, accreditation info, and `active/inactive` status.
- Public users see only active universities.
- Platform admins can create universities and activate/deactivate them.
- University admins can update their own university and manage staff.
- University-scoped custom actions expose programs, applications, staff, and audit log.

Major classes:
- `University`
- `UniversityViewSet`
- `UniversityListSerializer`, `UniversityDetailSerializer`

Important services:
- staff invite token creation
- audit entries for university status changes, staff invites, and staff deactivation

APIs:
- `GET /api/v1/universities/`
- `POST /api/v1/universities/`
- `GET/PATCH/PUT/DELETE /api/v1/universities/{id}/`
- `PATCH /api/v1/universities/{id}/status/`
- `GET/POST /api/v1/universities/{id}/programs/`
- `GET /api/v1/universities/{id}/applications/`
- `GET/POST /api/v1/universities/{id}/staff/`
- `DELETE /api/v1/universities/{id}/staff/{staff_id}/`
- `GET /api/v1/universities/{id}/audit-log/`

Current maturity: functional MVP. Gaps include no rich university contact/location metadata, no domains, no branding configuration beyond logo, no onboarding workflow that creates initial staff automatically from frontend form fields, and no database-level RLS on university rows.

### programs

Purpose: program catalog and admission-cycle management.

Current implementation:
- `Program` is tenant-scoped to a university.
- Fields include degree level, description, requirements, required documents JSON, fee amount/currency, and status.
- Program status transitions are hard-coded: `draft -> published -> archived`.
- `AdmissionCycle` is tenant-scoped, linked to `Program`, with scheduled/open/closed/archived states.
- Celery beat task auto-transitions cycles from scheduled to open and open to closed.

Major classes:
- `Program`, `AdmissionCycle`
- `ProgramViewSet`, `AdmissionCycleViewSet`
- `ProgramListSerializer`, `ProgramCreateSerializer`, `ProgramUpdateSerializer`, `ProgramDetailSerializer`
- `AdmissionCycleSerializer`, `AdmissionCycleWriteSerializer`, `AdmissionCycleDetailSerializer`

Important services:
- `PROGRAM_STATUS_TRANSITIONS`
- `programs.tasks.auto_transition_cycles`

APIs:
- `GET /api/v1/programs/`
- `POST /api/v1/programs/`
- `GET/PATCH/PUT/DELETE /api/v1/programs/{id}/`
- `PATCH /api/v1/programs/{id}/status/`
- `GET/POST /api/v1/programs/{id}/cycles/`
- `GET/PATCH /api/v1/admission-cycles/`
- `GET/PATCH /api/v1/admission-cycles/{id}/`
- `PATCH /api/v1/admission-cycles/{id}/close/`
- `PATCH /api/v1/admission-cycles/{id}/archive/`

Current maturity: solid MVP. Gaps include no program templates, no per-cycle capacity, no admissions criteria/rubrics, no scholarship/tuition breakdown, no prerequisite modeling beyond text/JSON, no configurable lifecycle.

### admissions

Purpose: applicant applications, form data, submission, status transitions, staff decisions, offer response, and status history.

Current implementation:
- `Application` is tenant-scoped and links applicant, university, program, and admission cycle.
- Application form is stored as JSON `form_data`.
- Submission requires open cycle, uploaded required docs, and successful payment.
- Draft patch merges incoming `form_data` into existing JSON.
- State transitions are hard-coded in `admissions/state_machine.py`.
- Staff can move submitted applications to under review, then to admitted/rejected/waitlisted.
- Decisions can be reversed to under review until applicant has responded.
- Applicant can accept or decline admitted offers.
- `ApplicationStatusHistory` records every state transition.

Major classes:
- `Application`, `ApplicationStatusHistory`
- `ApplicationViewSet`
- `ApplicationCreateSerializer`, `ApplicationListSerializer`, `ApplicationDetailSerializer`, `ApplicationUpdateSerializer`

Important services:
- `transition_application`
- `VALID_TRANSITIONS`
- `DECISION_STATES`
- admission notification signal handlers

APIs:
- `GET/POST /api/v1/applications/`
- `GET/PATCH/PUT/DELETE /api/v1/applications/{id}/`
- `GET/POST /api/v1/applications/{id}/documents/`
- `POST /api/v1/applications/{id}/documents/upload-url/`
- `GET /api/v1/applications/{id}/history/`
- `POST /api/v1/applications/{id}/payment-intent/`
- `GET /api/v1/applications/{id}/payment/`
- `POST /api/v1/applications/{id}/submit/`
- `PATCH /api/v1/applications/{id}/status/`
- `POST /api/v1/applications/{id}/offer-response/`

Current maturity: strong MVP. Gaps include no configurable workflow, no reviewer assignment, no task queue, no scoring/rubric, no comments, no internal notes, no applicant messaging, no form schema/versioning, no conflict resolution beyond last-write-wins autosave, and no admissions committee workflow.

### documents

Purpose: required application document upload, versioning, staff review, verification, flagging, and document notifications.

Current implementation:
- `ApplicationDocument` is tenant-scoped and linked to an application.
- Supports local uploaded file or object key.
- Documents have status `pending`, `verified`, `flagged`.
- Re-uploads increment version.
- Staff review actions set reviewer and reviewed timestamp.
- File size enforced in application upload action.
- MIME validation helper exists but is not wired into upload flow.
- Upload URL endpoint currently returns `upload_url: null` plus an object key; actual GCS signed URL generation helper exists but is not used by the endpoint.

Major classes:
- `ApplicationDocument`
- `DocumentViewSet`
- `ApplicationDocumentSerializer`

Important services:
- `validate_file_type`
- `generate_upload_url`
- document flagged signal

APIs:
- `GET/POST /api/v1/applications/{id}/documents/`
- `POST /api/v1/applications/{id}/documents/upload-url/`
- `GET/PATCH/PUT/DELETE /api/v1/documents/`
- `GET/PATCH/PUT/DELETE /api/v1/documents/{id}/`
- `PATCH /api/v1/documents/{id}/verify/`
- `PATCH /api/v1/documents/{id}/flag/`

Current maturity: functional MVP with partial cloud-storage readiness. Gaps include no malware scanning, no real signed upload URL in the API action, no document preview transformation, no fine-grained document history table, no retention policy, no OCR/extraction, and MIME validation is not enforced in the main upload path.

### payments

Purpose: application fee intent creation, payment status persistence, Stripe webhook handling, and payment retrieval.

Current implementation:
- `Payment` is one-to-one with `Application`.
- Payment stores amount, currency, processor reference, status, refundable flag, initiated/completed timestamps.
- `create_payment_intent` uses Stripe when configured and installed; otherwise mock mode.
- Submission auto-completes pending payments in mock mode.
- Webhook endpoint verifies Stripe signature or test signature in mock mode and updates payment status for succeeded/failed events.
- reCAPTCHA helper exists but is not used in the payment flow.

Major classes:
- `Payment`
- `PaymentSerializer`

Important services:
- `payments.processor.create_payment_intent`
- `payments.processor.verify_webhook_signature`
- `payments.captcha.verify_recaptcha`
- `payments.views.payment_webhook`

APIs:
- `POST /api/v1/applications/{id}/payment-intent/`
- `GET /api/v1/applications/{id}/payment/`
- `POST /api/v1/payments/webhook/`

Current maturity: MVP/payment-sandbox ready. Gaps include no refunds endpoint, no receipt PDF, no reconciliation jobs, no payment-provider abstraction beyond a helper module, no idempotency keys, no public-key endpoint, no reCAPTCHA wiring, and production Stripe package/config hardening is incomplete.

### notifications

Purpose: email notifications for applicant-facing events.

Current implementation:
- No `Notification` model.
- No notification API endpoints.
- Celery tasks send plain text emails using Django `send_mail`.
- Emails are triggered by application status changes, decision reversal, document flagging, and verification token creation logging.
- Default email backend is console unless configured.

Major classes:
- none in models

Important services:
- `send_verification_email`
- `send_application_submitted_email`
- `send_decision_email`
- `send_offer_response_email`
- `send_decision_reversed_email`
- `send_document_flagged_email`

APIs:
- none

Current maturity: partial. Email task functions exist, but there is no persisted inbox, delivery tracking, templates, preferences, retry/outbox model, admin notification visibility, or in-app notification UI. FE-16 planned an inbox derived from status history, but it is not implemented.

### audit

Purpose: record important user/system actions and expose audit logs to platform and university admins.

Current implementation:
- `AuditLogEntry` stores actor type/id, university, action, entity type/id, before state, after state, and timestamps.
- Signals record application status changes, document verify/flag changes, and payment status changes.
- Manual audit entries are created for university status changes, staff invite, and staff deactivation.
- Platform admins can read all audit logs; university admins can read their university audit log.

Major classes:
- `AuditLogEntry`
- `AuditLogViewSet`
- `AuditLogEntrySerializer`

Important services:
- `audit.signals.audit_application_status_change`
- `audit.signals.audit_document_change`
- `audit.signals.audit_payment_change`

APIs:
- `GET /api/v1/admin/audit-log/`
- `GET /api/v1/admin/audit-log/{id}/`
- `GET /api/v1/universities/{id}/audit-log/`

Current maturity: useful MVP audit trail. Gaps include incomplete event coverage, no immutable append-only enforcement, no actor IP/user-agent, no correlation/request IDs, no export, no retention/legal-hold policy, and possible ordering issue where status history is queried in `pre_save` before the transition creates the history row.

### frontend

Purpose: user-facing web application.

Current implementation:
- Next.js 14 App Router, TypeScript, Tailwind tokens, lucide icons.
- Layout shells: `PublicShell`, `ApplicantShell`, `StaffShell`.
- Public routes use server components for discovery.
- Authenticated routes use `/api/proxy/*` to forward httpOnly cookie auth as backend Bearer JWT.
- Design primitives include Button, Card, Alert, Input, Select, Textarea, FormField, Table, Pagination, Modal, Skeleton, Spinner, StatusBadge.
- Shared components include cards, EmptyState, ErrorState, PageHeader, WizardSidebar/TopBar, document upload, education/language blocks.

Major classes/components:
- shell components and UI primitives listed above
- frontend pages under `app/(public)`, `app/(auth)`, `app/dashboard`, `app/portal`, `app/admin`

Important services:
- `frontend/app/api/auth/login/route.ts`
- `frontend/app/api/auth/logout/route.ts`
- `frontend/app/api/auth/me/route.ts`
- `frontend/app/api/proxy/[...path]/route.ts`
- `frontend/middleware.ts`
- `frontend/lib/api.ts`
- `frontend/lib/auth.ts`

APIs:
- consumes backend `/api/v1/*` directly and through Next proxy routes

Current maturity: broad FE-15 coverage. Gaps include FE-16 notifications/timeline, inconsistent API wrapper usage, `fetchAPI` missing `credentials: include`, legacy raw Bearer helpers, some duplicated `authFetch` helpers, and no frontend refresh-token rotation flow.

## 3. Missing Modules

Not started:
- AI admissions assistance, document OCR, scoring, matching, recommendations, fraud detection.
- Workflow/rules engine with configurable stages, tasks, assignments, SLAs, escalations.
- In-app notification/inbox backend.
- Messaging/comments between applicant and admissions teams.
- Scholarship/financial aid module.
- Reporting/analytics beyond simple admin stats.
- Search service/full-text search.
- Form-builder/schema-versioning module.
- Review rubric/scoring module.
- Offer letter/decision document generation.
- Refunds/reconciliation module.
- Monitoring/observability module.
- Data export/import module.

Partially implemented:
- Notifications: email tasks exist; no persistent notifications.
- Payments: payment intent/webhook exist; no refunds, receipts, reconciliation, production UI provider integration.
- Documents: upload/review/version field exists; no real signed URL from endpoint, no scanning/OCR.
- Audit: important events captured; not comprehensive or immutable.
- Tenancy: application-level filtering mostly exists; database RLS is partial/incomplete.
- Admin onboarding: university creation exists; initial staff admin fields in the frontend form are not backed by a dedicated onboarding API.
- Applicant profile/security: profile edit exists; password change falls back to password-reset flow rather than authenticated password change.
- CI/CD: GitHub CI and Cloud Build config exist; production deployment remains manual/future.

Stubbed/planned:
- GCS upload URL helper exists but the application upload-url action returns `upload_url: null`.
- Sentry/Celery failure integration has TODO only.
- FE-16 planned StatusTimeline and Notifications Inbox are not present.
- Production CI/CD is described as future in deployment docs.
- Save-for-later appears in FE plans as UI-only/future; no backend implementation exists.

## 4. Backend Features

identity:
- Custom user roles through multi-table inheritance.
- Applicant registration.
- Login with SimpleJWT tokens.
- Deactivated-account login blocking with generic error.
- Email verification token model and verification endpoint.
- Resend verification endpoint.
- Password reset token model and reset endpoint.
- Staff invite token model and staff password setup endpoint.
- Logout with refresh-token blacklist.
- Auth/me role detection endpoint.
- MFA setup and verification for staff/admin.
- Login/register/password reset/MFA throttles.
- Applicant profile get/update.
- Role and tenant permission classes.
- Encrypted passport ID field.

universities:
- Public active university listing/retrieval.
- Platform admin university creation and status changes.
- Staff-scoped university update.
- University programs listing/creation.
- University applications review queue.
- Staff listing/invite/deactivation.
- University audit log.

programs:
- Public published program listing/retrieval with filters.
- Program create/update/delete for university admins.
- Program publish/archive transitions.
- Admission cycle creation/listing.
- Cycle date update while scheduled.
- Cycle close/archive actions.
- Celery beat automatic cycle status transitions.

admissions:
- Draft application creation with duplicate draft reuse.
- Draft autosave/partial update.
- Draft deletion.
- Applicant application list/detail.
- Staff scoped application detail.
- Required document checklist in detail serializer.
- Document upload through application action.
- Upload object-key generation action.
- Payment intent creation.
- Payment retrieval.
- Submit with required docs/cycle/payment checks.
- Staff status changes and decisions.
- Decision reversal.
- Applicant offer accept/decline.
- Status history endpoint.
- Notification signals on relevant status changes.

documents:
- Document records tied to applications and universities.
- Local upload or object-key upload.
- Document type validation against program required documents.
- Re-upload version increment.
- Staff verify/flag actions.
- Reviewed-by/reviewed-at tracking.
- Flagged document email notification.
- File validation helper and GCS signed URL helper.

payments:
- Payment model.
- Mock or Stripe payment intent creation.
- Payment webhook signature verification.
- Payment succeeded/failed handling.
- Duplicate webhook handling.
- reCAPTCHA helper.

notifications:
- Celery email tasks for verification, submission, decisions, offer response, reversal, and flagged document.

audit:
- Audit model.
- Signals for application status, document status/flag reason, and payment status.
- Manual audit logging for university status/staff events.
- Platform and university audit APIs.

infrastructure/backend:
- Django settings with PostgreSQL via `DATABASE_URL`, SQLite fallback.
- Redis/Celery settings.
- Celery eager mode for DEBUG/testing.
- Dockerfile for backend.
- Docker Compose with Postgres, Redis, backend, Celery worker, Celery beat, frontend, frontend-test.
- GitHub Actions backend CI.
- Cloud Run/Cloud Build deployment manifests.

## 5. Frontend Features

Public implemented pages/workflows:
- Landing page at `app/(public)/page.tsx`.
- Universities listing with client-side search.
- University detail page.
- Cross-university programs listing with degree/university filters.
- Program detail page with open cycle apply links.
- Public shell navigation.
- Loading skeletons for public listing/detail pages.

Auth implemented pages/workflows:
- Login using Next proxy that sets httpOnly `access_token` and `refresh_token`.
- Register.
- Forgot password.
- Reset password.
- Verify email.
- MFA setup.
- MFA verify.
- Auth layout/card.
- Logout proxy.
- Auth/me proxy.
- Middleware protects dashboard, portal, and admin routes by presence of access cookie.
- Middleware has basic admin-role check by decoding JWT payload.

Applicant implemented pages/workflows:
- Applicant dashboard with application stats and application cards.
- Section-based application wizard at `/dashboard/apply/[programId]?section=...`.
- Wizard sections: personal, contact, education, languages, motivation, documents, checklist.
- Debounced autosave in wizard layout.
- Document upload from wizard and application detail.
- Payment/submit flow from wizard.
- Submission confirmation page for wizard.
- Application detail page with form data, documents, payment, status history, offer response.
- Application confirmation page.
- Finances page listing payments by iterating applications.
- Profile page with applicant profile edit, account security display, and password-reset modal.
- Applicant shell navigation for dashboard, applications, finances, profile.

Staff portal implemented pages/workflows:
- `/portal` redirect to applications queue.
- Review queue with filtering, sorting, pagination state.
- Application review detail with document verify/flag, open-for-review, decision, and reversal UI.
- Program list with status filter.
- Program create form.
- Program edit form and publish/archive modals.
- Admission cycle management with create/close/archive.
- Team management with invite/remove/deactivate.
- University audit log with filters/pagination.
- Staff shell layout.

Platform admin implemented pages/workflows:
- `/admin` redirect to stats.
- Stats dashboard with total counts, universities, and recent audit activity.
- Users page with search/filter and activate/deactivate status action.
- Universities page with status filters and activate/deactivate actions.
- New university page.
- University detail/status page.
- Platform audit log with filters/pagination.
- Admin pages use `StaffShell` platform-admin variant.

Incomplete UI:
- FE-16 StatusTimeline component does not exist; applicant/staff detail pages render timeline/history ad hoc.
- FE-16 notifications page does not exist.
- ApplicantShell has no notification bell/unread count.
- No in-app notification workflow.
- Admin university creation form includes admin name/email fields, but backend create-university API does not consume them.
- Authenticated password change is not truly implemented; profile uses reset-password style flow.
- Frontend refresh-token route/flow is absent.
- Some page-local `authFetch` helpers duplicate API logic.
- `fetchAPI` lacks `credentials: 'include'` and still has legacy raw Bearer helpers.

## 6. API Inventory

Authentication:
- Backend auth is SimpleJWT Bearer-token based.
- Next.js login proxy stores JWT access/refresh tokens in httpOnly cookies.
- Authenticated frontend calls should use `/api/proxy/*`, which reads the cookie and sends `Authorization: Bearer`.
- Backend DRF default auth is `JWTAuthentication`.
- Staff/admin MFA adds session-based `mfa_verified`; permission checks use `MFAVerified`.

Permissions:
- Public: university/program list/retrieve limited to active/published for unauthenticated/applicant users.
- Applicant: applicant-only and email-verified checks for application mutation/submission.
- Staff: university staff role and scoped object checks.
- University admin: staff with `permission_level='admin'`.
- Platform admin: `PlatformAdmin` subclass.
- MFA required on staff/admin protected endpoints except bypassed in tests.

Endpoints:
- Auth: register, login, verify-email, resend-verification, forgot-password, reset-password, refresh, logout, MFA setup/verify, auth/me, set-staff-password.
- Applicants: `/applicants/me/`.
- Universities: CRUD, status, programs, applications, staff, audit-log.
- Programs: CRUD, status, cycles.
- Admission cycles: list/retrieve/update, close, archive.
- Applications: CRUD, documents, upload-url, history, payment-intent, payment, submit, status, offer-response.
- Documents: CRUD, verify, flag.
- Admin: stats, users, user status, universities, audit-log.
- Payments: webhook.

Missing endpoints:
- Notification inbox/list/read/unread.
- Authenticated password change.
- Token refresh proxy on frontend.
- Staff/admin creation as part of university onboarding.
- Payment refund and receipt/PDF.
- Signed GCS upload URL endpoint that returns a non-null signed URL.
- Document download/secure preview authorization endpoint.
- Comments/messages/internal notes.
- Reviewer assignment/task endpoints.
- Rubric/scoring endpoints.
- Workflow/rules configuration endpoints.
- Reports/export endpoints.
- Audit export endpoint.
- AI endpoints.

## 7. Database

Major models:
- `identity.User`
- `identity.Applicant`
- `identity.UniversityStaff`
- `identity.PlatformAdmin`
- `identity.EmailVerificationToken`
- `identity.PasswordResetToken`
- `identity.StaffInviteToken`
- `universities.University`
- `programs.Program`
- `programs.AdmissionCycle`
- `admissions.Application`
- `admissions.ApplicationStatusHistory`
- `documents.ApplicationDocument`
- `payments.Payment`
- `audit.AuditLogEntry`

Relationships:
- `University` has many staff, programs, admission cycles, applications, documents, payments, and audit entries.
- `Program` belongs to one university and has many cycles/applications.
- `AdmissionCycle` belongs to one program/university and has many applications.
- `Application` belongs to applicant, program, admission cycle, and university.
- `Application` has many documents and history entries.
- `Payment` is one-to-one with application.
- `ApplicationDocument` belongs to application and university, optionally reviewed by staff.
- `AuditLogEntry` optionally belongs to university and references entity by generic type/id fields.

Migrations:
- Initial migrations exist for core apps.
- Identity has a second migration for staff invite tokens.
- Universities has logo and ordering migrations.
- Admissions changed `ApplicationStatusHistory.changed_by_id` from UUID to string.
- Documents added `university` and document RLS migration.
- Payments has payment RLS migration.
- Audit changed `actor_id` from UUID to string and ordering.
- Notifications has no model migrations.

Audit support:
- Audit table exists and captures selected events.
- Status history exists separately for application status transitions.
- Manual audit calls exist for some administrative actions.

History:
- Application status history is implemented.
- Document has only current status plus version number; no separate document history rows.
- Payment has current status and timestamps; no payment event history table.
- User/university/program changes are not fully historical.

Soft delete:
- Staff removal is soft deactivation via `account_status='deactivated'`.
- Users have active/deactivated status.
- Universities have active/inactive status.
- Programs and cycles have archived statuses.
- Applications/documents/payments generally use hard delete when deleted through model actions, although draft application delete is allowed.

Versioning:
- Documents have integer `version`.
- Application form schema has no version field.
- Program required document schema is JSON without versioning.
- API and workflow rules have no versioning.

Tenancy/RLS:
- `TenantScopedModel` stores `university` FK.
- Application-level filtering and permission checks enforce most tenant isolation.
- PostgreSQL RLS migrations exist only for documents and payments.
- No code sets `app.current_university_id`, so those RLS policies are not fully wired for live request use.

## 8. Workflow

Workflow engine: no. There is no configurable workflow engine.

Rules engine: no general rules engine. Business rules are hard-coded in view methods and `admissions/state_machine.py`.

State machine: yes, lightweight hard-coded state transitions for applications:
- `draft -> submitted`
- `submitted -> under_review`
- `under_review -> admitted/rejected/waitlisted`
- `admitted -> accepted/declined/under_review`
- `rejected -> under_review`
- `waitlisted -> under_review`
- `accepted/declined` terminal

Task engine: no admissions task engine. Celery is used for emails and scheduled cycle transitions, not for reviewer task assignment.

Current workflow behavior:
- Applicants draft, autosave, upload docs, pay, submit.
- Staff open submitted apps for review, verify/flag docs, decide, and reverse decisions before offer response.
- Applicants can accept/decline admitted offers.
- Cycle status auto-opens/closes by Celery beat.

Limitations:
- No assignment, queue ownership, SLA, escalation, committee voting, stages, conditional branching, rubric, comments, or custom per-university workflow configuration.

## 9. AI

No AI-related implementation exists in the current codebase.

There are no AI models, prompts, inference calls, embeddings, OCR extraction, document classification, fraud scoring, recommendation/matching, chatbot, or AI APIs.

## 10. Notifications

Implemented:
- Celery email tasks for applicant verification, application submission, decisions, offer responses, decision reversals, and flagged documents.
- Signals dispatch tasks on application/document changes.
- Email backend configurable through Django settings; console backend by default.

Missing:
- Persistent notification table.
- In-app notifications API.
- Frontend notifications page.
- Unread/read state.
- Delivery provider integration beyond Django email backend.
- Templates/localization.
- Retry/outbox table.
- Preference management.
- Staff/admin notifications.
- Delivery audit.

## 11. Payments

Implemented:
- Application payment intent action.
- Payment record creation.
- Mock mode for testing/development.
- Stripe payment intent support when Stripe is installed/configured.
- Stripe webhook endpoint for succeeded/failed intent events.
- Payment retrieval per application.
- Finance page on frontend that displays payment history by iterating applications.

Limitations:
- Payment records store client secret as processor reference in the intent flow.
- No refund API despite `refundable` field.
- No receipt generation/download.
- No transaction/event ledger.
- No reconciliation job.
- No idempotency key strategy.
- No frontend Stripe Elements integration identified in the current frontend.
- reCAPTCHA helper is not wired into payment initiation.

## 12. Security

RBAC:
- Role model: applicant, university staff, platform admin.
- University staff has permission level `officer` or `admin`.
- DRF permissions enforce role and object ownership/scope.
- Platform admin has separate endpoints and can read global stats/users/audit.

Permissions:
- Applicants must own applications to read/mutate.
- Applicants must be email-verified for create/update/delete and document upload flows.
- Staff are scoped to their university.
- University admins can manage programs/cycles/staff for their own university.
- Platform admins manage universities/users and read platform audit.
- Staff/admin endpoints require MFA via `MFAVerified` except during tests.

JWT:
- SimpleJWT access lifetime 30 minutes, refresh lifetime 1 day.
- Refresh rotation and blacklist enabled.
- Backend accepts Bearer tokens.
- Next.js proxy stores tokens in httpOnly cookies.
- Frontend middleware checks cookie presence and decodes role for admin path gating.

Tenancy:
- Application-level tenant filtering is widespread.
- Thread-local `TenantManager` filters tenant-scoped models for university staff.
- Cross-tenant tests exist.
- Database RLS is partial and not fully wired.

Audit logging:
- Audit entries exist for selected status/document/payment/admin actions.
- Status history records application transitions.
- Gaps include incomplete coverage, no IP/user-agent, no immutable storage, and no export/retention policy.

Other security features:
- Passport ID encrypted with Fernet derived from `SECRET_KEY`.
- Login/register/password/MFA throttles.
- Deactivated account login blocked.
- Password reset and email verification responses avoid leaking account existence.
- CSRF middleware is enabled in Django; Next proxy forwards Bearer auth to backend.
- File size limit enforced.
- MIME validation helper exists but is not wired into main upload action.

## 13. Infrastructure

Docker:
- `Dockerfile.backend` builds Python 3.12 slim image, installs requirements, collects static, runs Gunicorn.
- `Dockerfile.frontend` builds Next standalone app with Node 20 slim.
- `docker-compose.yml` includes Postgres 15, Redis 7, backend, Celery worker, Celery beat, frontend, and frontend-test.

Celery:
- Configured with Redis broker/result backend.
- Eager mode in DEBUG/testing.
- Beat schedule runs hourly `auto_transition_cycles`.
- Failure handler logs task failures and has TODO for Sentry.

Redis:
- Used for Celery broker/backend in non-debug/non-test.
- Included in Docker Compose and GitHub CI service.

Storage:
- Local media storage by default.
- GCS signed URL helper exists.
- Deployment env docs include GCS bucket/credentials.
- Next image config allows `storage.googleapis.com`.
- Upload URL action does not currently call signed URL helper.

CI/CD:
- GitHub Actions runs `python manage.py check` and `pytest --tb=short` with Postgres/Redis services.
- Cloud Build config builds/pushes backend and frontend images and deploys to Cloud Run.
- Deployment README says CI/CD is future after manual validation.

Monitoring:
- No Sentry integration yet.
- No metrics/tracing.
- Cloud Run logs are referenced in deployment docs.
- Celery failure handler logs errors only.

Cloud deployment:
- Cloud Run service YAML exists for backend and frontend.
- Deployment docs cover Cloud SQL, Secret Manager, GCS, Cloud Run, domains, migrations, seed admin, and smoke tests.

## 14. Technical Debt

Duplicated logic:
- Frontend has repeated local `authFetch` helpers across many pages.
- Frontend error parsing is partly centralized in `lib/api.ts` but some pages still parse responses manually.
- Status formatting/color logic appears in several page-local helpers instead of a single timeline/status utility.
- Backend repeats required-document validation in payment, submit, document upload, and state transition logic.
- Frontend application history rendering is duplicated between applicant and staff detail pages.

TODO/FIXME/temporary:
- `frontend/lib/api.ts`: TODO FE-04 to add `credentials: 'include'`.
- `admissions/views.py`: TODO Sprint 8 to also notify UniversityAdmin on offer response.
- `lucy_apply/celery.py`: TODO to wire Sentry in production.
- `documents/utils.py`: signed URL helper is present, but upload-url endpoint returns `None`.
- `payments.processor`: mock mode used when Stripe is unavailable or secret key missing.
- Deployment docs mark CI/CD automation as future.

Shortcuts:
- Application form data is free-form JSON with no server-side schema/version validation.
- Autosave is last-write-wins.
- Email verification in DEBUG auto-verifies applicants.
- Payment pending auto-succeeds in mock mode during submit.
- Notifications are plain emails only.
- Admin stats are simple counts from live queries.
- Audit actor resolution for application status changes may miss the just-created history row because audit is in `pre_save`.
- Profile password flow uses password reset semantics rather than authenticated password change.
- University onboarding UI has fields not consumed by backend.

## 15. Gap Analysis

Implemented:
- Applicant registration/login/logout.
- Email verification/password reset.
- Staff/platform admin MFA.
- Public university/program discovery.
- University and program detail pages.
- Applicant dashboard.
- Section-based application wizard.
- Application autosave.
- Document upload and re-upload versioning.
- Payment intent and payment status model.
- Application submit.
- Applicant application detail and offer response.
- Staff review queue and detail.
- Document verify/flag.
- Staff decision/reversal.
- Program and admission cycle management.
- Staff invitation/deactivation.
- Platform admin stats/users/universities/audit.
- Audit log storage and APIs.
- Celery email tasks.
- Docker, Compose, Cloud Run deployment scaffolding.
- Backend and frontend tests/QA scripts for many flows.

Partially Implemented:
- Notifications: email tasks only, no in-app or persistent model.
- Payments: intent/webhook/mock/status only, no refunds/receipts/reconciliation.
- Documents: basic upload/review/versioning, no real signed URL endpoint/OCR/scanning.
- Tenancy: strong app-level checks, incomplete DB-level RLS.
- Audit: selected events only, no comprehensive immutable audit.
- Profile/security: profile edit exists, authenticated password change does not.
- Admin onboarding: university creation exists, but initial admin creation is not wired.
- Deployment: manifests exist, automated production rollout is not complete.
- Error handling: mostly improved, but API wrapper and raw fetch patterns remain inconsistent.
- Frontend API layer: proxy works, `fetchAPI` is not fully cookie-aware and legacy Bearer helpers remain.

Planned:
- FE-16 shared StatusTimeline.
- FE-16 applicant notifications inbox derived from history.
- FE-16 notification bell/unread count.
- Sentry/monitoring.
- Automated CI/CD after manual deployment validation.
- Potential real GCS signed uploads.
- University admin notification on offer response.

Missing:
- AI features.
- Workflow/rules/task engine.
- Reviewer assignment and admissions task management.
- Comments/internal notes/applicant messaging.
- Scoring/rubrics/committee review.
- Scholarships/financial aid.
- Real notification backend/inbox.
- Search service and advanced filters.
- Form builder and schema versioning.
- Decision letters and offer document generation.
- Refunds and payment receipts.
- Reporting/export.
- Full database RLS across tenant tables.
- Observability stack.
- Comprehensive audit export/retention/immutability.

## 16. Architecture Recommendations

1. Finish FE-16 before adding new backend scope.
   Add the shared `StatusTimeline`, notifications page, and ApplicantShell bell so history and notifications are not duplicated across pages.

2. Consolidate frontend API access.
   Move repeated page-local `authFetch` helpers into one cookie-aware API client. Add `credentials: 'include'` or standardize all authenticated calls through `/api/proxy/*`. Remove legacy direct Bearer helpers as pages are touched.

3. Decide the tenancy model before production.
   Either complete PostgreSQL RLS by setting `app.current_university_id` per request and adding policies for all tenant tables, or remove partial RLS migrations and rely explicitly on application-level controls. Partial RLS is confusing and risky.

4. Introduce a form schema/version boundary.
   Application `form_data` should reference a schema version. This protects historical applications when wizard fields evolve.

5. Extract admissions rules into service modules.
   Required documents, payment readiness, submission readiness, and decision eligibility are repeated. A small domain service would reduce drift before adding more workflow features.

6. Treat workflow as the next major architecture decision.
   If future product requires per-university custom stages, assignments, SLAs, rubrics, or committee review, build a workflow/task model instead of extending hard-coded transition branches.

7. Add a real notifications model.
   Email tasks should become one delivery channel of a persisted notification/outbox system. Store event, recipient, read state, delivery state, and source entity.

8. Harden payments before live launch.
   Add idempotency, receipt records, refund flow, reconciliation, provider event ledger, Stripe dependency/config validation, and real frontend provider integration.

9. Complete cloud document upload.
   Wire `generate_upload_url` into the upload-url API, secure object-key authorization, enforce MIME validation, and plan malware scanning.

10. Improve audit fidelity.
    Add request metadata, actor role/id consistency, correlation IDs, more event coverage, export, and retention policy. Consider moving some audit writes after successful state changes.

11. Add authenticated password change.
    Keep reset-password for forgotten passwords, but add a current-password verified endpoint for logged-in users.

12. Align admin onboarding.
    Either remove unused initial-admin fields from the frontend university form or add a backend onboarding endpoint that creates university plus first admin staff atomically.

13. Add observability.
    Wire Sentry or equivalent, structured logs, metrics, Celery queue monitoring, and Cloud Run health/latency dashboards before production.

14. Keep backend frozen discipline until frontend revamp completes.
    FE-16 is the only known remaining frontend sprint. Avoid introducing new backend shape until docs, UI, and API boundaries are reconciled.
