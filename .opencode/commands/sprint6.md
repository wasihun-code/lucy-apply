# Sprint 6 — Status Tracking + Notifications + Manual Decision Shortcut

## What you are building in this sprint

Applicant dashboard with live status tracking, the remaining notification wiring, a temporary manual decision endpoint, and the offer accept/decline flow. This closes Milestone 2.

## Dependency check

Sprint 5 must be complete: submission, payment, and webhook all work end-to-end on Staging.

## Deliverables

### 1. Applicant dashboard (Next.js)
`/dashboard/` — client-rendered, auth-protected:
- Lists all applications for the logged-in applicant
- Status badge per application (color-coded: draft=grey, submitted=blue, under_review=yellow, admitted=green, rejected=red, waitlisted=orange, accepted=dark-green, declined=grey)
- Link to application detail view

`/dashboard/applications/[id]/` — application detail:
- Read-only view of submitted form_data
- Document checklist with status per document (pending/verified/flagged)
- Flagged documents show the `flagged_reason` with a re-upload button
- Decision notice (if status is admitted/rejected/waitlisted)
- Accept/Decline buttons (if status is admitted)
- `GET /api/v1/applications/{id}/history/` timeline

### 2. Application history endpoint
`GET /api/v1/applications/{id}/history/` as `@action`:
- Returns `ApplicationStatusHistory` records in chronological order
- Accessible to Applicant (own), Officer/Admin (university-scoped), PlatformAdmin (all)

### 3. Offer accept/decline endpoint
`POST /api/v1/applications/{id}/offer-response/` as `@action`:
```python
# Request: {"response": "accepted"} or {"response": "declined"}
# Only valid if current status == 'admitted'
# Immutable once set — offer_response_at must be null before this call
# Triggers send_offer_response_email Celery task to UniversityAdmin
```
Per ADR-008: once accepted or declined, no reversal. Setting `offer_response_at` blocks decision reversal too.

### 4. Temporary manual decision endpoint (shortcut for Milestone 2)
A simple admin-only endpoint (or Django admin action) to issue a test decision without the full Officer review UI:
`PATCH /api/v1/applications/{id}/status/` with `{"status": "admitted", "reason": "manual test"}` — restricted to `IsPlatformAdmin` for now.

This will be replaced in Sprint 7 with the proper Officer UI. Add a `# TODO Sprint 7: replace with Officer review flow` comment.

### 5. Remaining notification Celery wiring
Verify all events from Phase 2 §7 are wired to Celery tasks via Django signals:
- Document flagged → `send_document_flagged_email`
- Decision issued → `send_decision_email`
- Offer accepted/declined → `send_offer_response_email` (to UniversityAdmin)

## Milestone 2 Checkpoint
Before marking Sprint 6 done, manually test the FULL Milestone 2 journey on Staging:
1. Register applicant → verify email
2. Browse programs → select one
3. Fill application form (auto-save works)
4. Upload required documents
5. Pay fee → receive confirmation email
6. Check dashboard — status = 'submitted'
7. Use manual decision endpoint → status = 'admitted'
8. Receive decision email
9. Accept offer on dashboard
10. Verify offer_response_at is set and buttons disappear

**This test takes priority over any other work in this sprint.**

## Tests required
- Offer accept/decline blocked if status != 'admitted'
- offer_response_at immutable once set (second call returns 400)
- History endpoint returns transitions in order
- Celery send_decision_email task fires when status changes to admitted

## Done when
- Full Milestone 2 manual test passes on Staging
- `pytest admissions/ notifications/` passes
