# Lucy Apply — State Machine Reference

## Application Status

### Valid states
`draft` | `submitted` | `under_review` | `admitted` | `rejected` | `waitlisted` | `accepted` | `declined`

### Valid transitions

| From | To | Who can trigger | Condition |
|---|---|---|---|
| `draft` | `submitted` | Applicant | All required docs uploaded AND payment succeeded |
| `submitted` | `under_review` | UniversityStaff (Officer/Admin) | Application opened for review |
| `under_review` | `admitted` | UniversityStaff (Officer/Admin) | All required docs Verified |
| `under_review` | `rejected` | UniversityStaff (Officer/Admin) | All required docs Verified |
| `under_review` | `waitlisted` | UniversityStaff (Officer/Admin) | All required docs Verified |
| `admitted` | `accepted` | Applicant | Applicant chooses Accept |
| `admitted` | `declined` | Applicant | Applicant chooses Decline |
| `admitted` → `under_review` | Officer/Admin | Before applicant responds — reversal (ADR-008) |
| `rejected` → `under_review` | Officer/Admin | Before applicant responds — reversal (ADR-008) |
| `waitlisted` → `under_review` | Officer/Admin | Before applicant responds — reversal (ADR-008) |

### Invalid transitions (enforce at model level, not just UI)

- `accepted` → anything (immutable)
- `declined` → anything (immutable)
- `draft` → `under_review` (must pass through `submitted`)
- Any transition that skips a stage (e.g. `draft` → `admitted`)

### Decisioning precondition

An Officer cannot issue a decision (admitted/rejected/waitlisted) if ANY required document is still in `pending` or `flagged` status. Enforce this as a service-layer check, not just a UI disable.

---

## ApplicationDocument Status

| From | To | Who | Condition |
|---|---|---|---|
| `pending` | `verified` | UniversityStaff | Officer/Admin reviews and approves |
| `pending` | `flagged` | UniversityStaff | Officer/Admin flags with a required reason |
| `flagged` | `pending` | Applicant (re-upload) | Re-uploading creates a new version, resets status to pending |

Invalid: `verified` → `flagged` without a new review action.

---

## AdmissionCycle Status

| From | To | Who | Trigger |
|---|---|---|---|
| `scheduled` | `open` | System (Celery beat) | `open_date` reached |
| `open` | `closed` | System (Celery beat) OR UniversityAdmin (manual) | `close_date` reached OR early close |
| `closed` | `archived` | UniversityAdmin | All applications in terminal state |

Invalid: any backward transition (e.g. `closed` → `open`).
Reopening requires creating a NEW cycle, not mutating a closed one.

---

## Implementation Note

State transitions must be enforced in the **service layer** (a `transition_status()` method or similar), not in the serializer or view. The ViewSet calls the service; it never writes `application.status = new_status` directly without going through the transition validator.

Write a `VALID_TRANSITIONS` dict once in `admissions/state_machine.py` and import from it everywhere.
