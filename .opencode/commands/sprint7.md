# Sprint 7 — Program & Cycle Management UI (University Admin)

## What you are building in this sprint

The University Admin-facing UI for managing programs and admission cycles. This replaces Sprint 3's seed-script/Django-admin shortcut with a real product interface. Starts Milestone 3.

## Dependency check

Milestone 2 must be complete and tested end-to-end on Staging before starting this sprint.

## Deliverables

### 1. University Admin portal (Next.js, authenticated + MFA-gated)
New route group: `/portal/` — separate from `/dashboard/` (applicant routes).
Auth middleware must verify `permission_level` is 'admin' or 'officer' for all /portal/ routes.

`/portal/programs/` — list programs for the authenticated university
`/portal/programs/new/` — create program form
`/portal/programs/[id]/edit/` — edit program form
`/portal/programs/[id]/cycles/` — list + manage admission cycles for a program

### 2. Program management API (already designed, implement now)
Per `context/API_ROUTES.md`:
- `GET /universities/{id}/programs/` — list including drafts (Officer/Admin)
- `POST /universities/{id}/programs/` — create (UniversityAdmin only)
- `PATCH /programs/{id}/` — partial_update (UniversityAdmin only)
- `PATCH /programs/{id}/status/` — publish/archive @action (UniversityAdmin only)

All write endpoints: `permission_classes = [IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]`

### 3. Admission cycle management API
Per `context/API_ROUTES.md`:
- `GET /programs/{id}/cycles/`
- `POST /programs/{id}/cycles/` — UniversityAdmin only
- `PATCH /admission-cycles/{id}/` — edit dates (before cycle opens only)
- `PATCH /admission-cycles/{id}/close/` — manual early close @action
- `PATCH /admission-cycles/{id}/archive/` — archive @action

Cycle status transitions per `context/STATE_MACHINES.md` — SCHEDULED → OPEN → CLOSED → ARCHIVED only.

### 4. Celery beat task for FR-21 (auto-transition cycles)
In `programs/tasks.py`:
```python
@shared_task
def auto_transition_cycles():
    now = timezone.now()
    # SCHEDULED → OPEN
    AdmissionCycle.objects.filter(status='scheduled', open_date__lte=now).update(status='open')
    # OPEN → CLOSED
    AdmissionCycle.objects.filter(status='open', close_date__lte=now).update(status='closed')
```
Register in `celery.py` beat schedule to run every hour.
Note: use `.objects.all_objects()` (unscoped manager, or default Django manager on this task) — this is a system job not a staff request, so TenantManager scoping should NOT apply here.

### 5. Remove the Sprint 3 seed script shortcut
The Django admin data entry is now replaced by the real UI. Remove or comment the `seed_data` management command with a note that the Django admin is still available for emergency use.

## Tests required
- UniversityAdmin can create a program and it appears in the published list
- Officer cannot create/edit programs (403)
- Celery beat task transitions SCHEDULED → OPEN at the correct time
- Manually closing a cycle blocks new applications (verify via the application-creation test)
- Cross-tenant: UniversityAdmin at University A cannot edit University B's programs (403/404)

## Done when
- A University Admin can create a program and open a cycle through the `/portal/` UI without touching Django admin or a seed script
- `@review` shows no tenant-scoping issues on program/cycle ViewSets
- `pytest programs/` passes
