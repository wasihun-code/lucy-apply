# Sprint 8 — Review Queue & Decisioning UI (Admissions Officer)

## What you are building in this sprint

The Admissions Officer-facing application review queue, document verify/flag interface, and the real decision issuance and reversal UI. This replaces Sprint 6's manual decision shortcut and closes Milestone 3.

## Dependency check

Sprint 7 must be complete. Officers should now be able to log in and see the portal, even if the review queue is empty.

## Deliverables

### 1. Review queue (Next.js)
`/portal/applications/` — list view:
- Applications submitted to the authenticated officer's university
- Filterable by: status, program, admission cycle, date submitted
- Columns: applicant name, program, submission date, document status summary, current status
- Clicking a row opens the application detail

`/portal/applications/[id]/` — application review detail:
- All form_data fields (read-only)
- Document checklist: each required document with inline viewer (PDF iframe or image) + Verify/Flag controls
- Flag requires a reason (textarea, required)
- Decision controls (Admit/Reject/Waitlist buttons) — disabled if any document is not 'verified'
- If decision already issued: show decision + "Reverse Decision" button (visible until offer_response_at is set)

### 2. Review queue API
Per `context/API_ROUTES.md`:
- `GET /universities/{id}/applications/` — nested list, TenantManager-scoped, filterable by `?status=&program=`
- `GET /applications/{id}/` — already implemented in Sprint 4; ensure staff permission path works

### 3. Document verify/flag endpoints
Per `context/API_ROUTES.md`:
- `PATCH /documents/{id}/verify/` — sets status='verified', records reviewed_by and reviewed_at
- `PATCH /documents/{id}/flag/` — sets status='flagged', requires `{"reason": "..."}` in request body, triggers `send_document_flagged_email` Celery task

All: `permission_classes = [IsAuthenticated, IsUniversityStaff, IsScopedToUniversity, MFAVerified]`

### 4. Decision issuance and reversal
`PATCH /applications/{id}/status/` @action (full implementation — replaces Sprint 6's shortcut):

**Issue decision** (Officer or Admin):
```python
# Request: {"status": "admitted"} or {"status": "rejected"} or {"status": "waitlisted"}
# Precondition: all required documents must be 'verified' (not pending, not flagged)
# If any document is pending/flagged: return 400 with clear message
# On success: transition via state_machine.transition_application(), write AuditLogEntry, trigger send_decision_email
```

**Reverse decision** (Officer or Admin, per ADR-008):
```python
# Request: {"status": "under_review", "reason": "..."}
# Only valid if: current status is admitted/rejected/waitlisted AND offer_response_at is None
# If offer_response_at is set: return 400 "Cannot reverse — applicant has already responded"
# On success: transition back to under_review, notify applicant of reversal via Celery task
```

Remove the Sprint 6 `IsPlatformAdmin` restriction — decisions are now Officer/Admin actions.

### 5. Milestone 3 Checkpoint
Before marking Sprint 8 done, test the FULL cycle end-to-end with NO seed shortcuts:
1. UniversityAdmin creates a program and opens a cycle via /portal/
2. Applicant registers, verifies, applies, uploads docs, pays
3. Officer logs in, reviews application, verifies documents, issues Admit decision
4. Applicant receives decision email, accepts offer
5. Confirm the offer_response_at is set and decision reversal is now blocked

## Tests required (some of these are cross-tenant critical tests — do not skip)
- Officer at University A CANNOT see University B's review queue (403/404)
- Officer CANNOT issue decision while a document is flagged (400)
- Decision reversal blocked after offer_response_at is set (400)
- Reversing a decision sends a notification to the applicant
- Document flag triggers email to applicant with the reason
- Cross-tenant: University A officer cannot verify/flag University B's documents (403/404)

## Done when
- Milestone 3 manual test passes on Staging with zero shortcuts
- `@review` and `@security-check` on `admissions/views.py` and `documents/views.py` return zero CRITICAL issues
- `pytest admissions/ documents/` passes including cross-tenant tests
