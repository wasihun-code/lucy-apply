# Sprint 4 — Application Draft + Document Upload

## What you are building in this sprint

The Application model, the draft-and-save flow, and document upload via GCS signed URLs. This is the first half of Milestone 2's core applicant experience.

## Dependency check

Sprint 3 must be complete: Program and AdmissionCycle models exist, public discovery works, seeded data is in Staging.

## Deliverables

### 1. Application model and migrations
Per `context/DATABASE_SCHEMA.md`:
- `admissions.Application` — including denormalized `university` FK for RLS
- `admissions.ApplicationStatusHistory` — created via Django signal on Application.status change
- Run migrations locally and verify

### 2. State machine service
Create `admissions/state_machine.py`:
```python
VALID_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['under_review'],
    'under_review': ['admitted', 'rejected', 'waitlisted'],
    'admitted': ['accepted', 'declined', 'under_review'],  # under_review = reversal
    'rejected': ['under_review'],   # reversal only
    'waitlisted': ['under_review'], # reversal only
    'accepted': [],   # immutable
    'declined': [],   # immutable
}

def transition_application(application, new_status, actor_type, actor_id, reason=''):
    # Validates transition, updates status, writes ApplicationStatusHistory
    # Raises ValidationError on invalid transition
    ...
```

Never write `application.status = x` directly in a view or serializer. Always call `transition_application()`.

### 3. Application ViewSet (draft/save only this sprint)
Per `context/API_ROUTES.md`:
- `POST /api/v1/applications/` — create Draft application (Applicant only, email verified)
- `GET /api/v1/applications/{id}/` — retrieve (Applicant sees own; staff sees univ-scoped)
- `PATCH /api/v1/applications/{id}/` — update form_data (draft only, Applicant only)
- `DELETE /api/v1/applications/{id}/` — destroy (draft only, Applicant only)

Apply permissions per `context/PERMISSIONS.md`: `[IsAuthenticated, IsApplicant, IsEmailVerified]` on write actions.

### 4. Document upload via GCS signed URLs
Per `context/API_ROUTES.md`:
- `POST /api/v1/applications/{id}/documents/upload-url/` — generates a time-limited GCS signed URL for direct client-to-GCS upload. Returns `{upload_url, object_key}`.
- `POST /api/v1/applications/{id}/documents/` — registers the completed upload. Client calls this after a successful PUT to the signed URL, providing `{document_type, object_key}`. Creates `ApplicationDocument` with `status='pending'`.

Important implementation notes:
- The file bytes never pass through the Django server — client uploads directly to GCS
- `document_type` must match one of the keys in `program.required_documents`
- On re-upload to an existing document_type: increment `version`, create a new `ApplicationDocument` record (don't update the old one — FR-22 requires retention)

### 5. Document checklist on application detail
When serializing an Application, include a `document_checklist` computed field:
```json
{
  "required_documents": [
    {"type": "transcript", "label": "Official Transcript", "status": "pending", "uploaded": true},
    {"type": "passport", "label": "Passport Copy", "status": null, "uploaded": false}
  ]
}
```
This drives the frontend checklist UI.

### 6. Next.js: application form + document upload
- `/dashboard/apply/[programId]/` — multi-step form (client-rendered)
  - Step 1: form_data fields (auto-saves on blur via PATCH)
  - Step 2: document checklist with upload buttons (calls upload-url endpoint, then registers)
- Show document checklist state in real time

## What NOT to build this sprint
- No payment flow yet (Sprint 5)
- No submit button yet (Sprint 5 — gated on payment)
- No staff review UI

## Tests required
- Applicant can create a Draft application
- form_data auto-saves correctly
- Uploading a document creates an ApplicationDocument record with status='pending'
- Re-uploading the same document_type creates a new version (old record retained)
- Unverified applicant cannot create an application (403)
- Applicant cannot view another applicant's application (403/404)

## Done when
- Applicant can fill a form and upload documents on Staging, against a seeded program
- `pytest admissions/ documents/` passes
- `@review` run shows no tenant-scoping issues
