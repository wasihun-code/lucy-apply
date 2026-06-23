# Sprint 3 — Seeded University Data + Next.js Scaffold

## What you are building in this sprint

The University and Program models, seeded test data, public discovery pages in Next.js, and the GCP Staging deployment. This closes Milestone 0 and completes Milestone 1.

## Dependency check

Sprint 1 + Sprint 2 must be complete: Django runs, auth works, Docker Compose is healthy, GitHub Actions CI passes.

## Deliverables

### 1. University and Program Django models
In `universities/models.py`:
- `University` model per `context/DATABASE_SCHEMA.md`
- Register in Django admin — the admin panel is the seeding UI for now

In `programs/models.py`:
- `Program` model per `context/DATABASE_SCHEMA.md`
- `AdmissionCycle` model per `context/DATABASE_SCHEMA.md`
- Register both in Django admin

### 2. TenantScopedModel and TenantManager (if not yet done in Sprint 1)
In `identity/base.py` (or a new `core/base.py`):
```python
class TenantManager(models.Manager):
    def get_queryset(self):
        request = get_current_request()  # via django-currentuser or middleware
        if request and hasattr(request.user, 'university_id'):
            return super().get_queryset().filter(university_id=request.user.university_id)
        return super().get_queryset()

class TenantScopedModel(TimestampedUUIDModel):
    university = models.ForeignKey('universities.University', on_delete=models.CASCADE)
    objects = TenantManager()
    class Meta:
        abstract = True
```

### 3. Seed data
Using Django management command (`management/commands/seed_data.py`) or Django admin:
- 2 universities: "Addis Ababa International University" (status=active), "Jimma University" (status=active)
- 2 programs per university (degree_level='undergraduate', status='published')
- 1 open AdmissionCycle per program (open_date=now, close_date=90 days from now)
- Set a fee_amount (e.g. USD 50.00) on each program
- Set required_documents on each program: `[{"type": "transcript", "label": "Official Transcript"}, {"type": "passport", "label": "Passport Copy"}]`

### 4. Public discovery API endpoints
Per `context/API_ROUTES.md`:
- `GET /api/v1/universities/` — list active universities (AllowAny)
- `GET /api/v1/universities/{id}/` — retrieve university detail (AllowAny)
- `GET /api/v1/programs/` — list published programs with django-filter filtering: `?degree_level=`, `?university=` (AllowAny)
- `GET /api/v1/programs/{id}/` — retrieve program detail including required_documents and open cycles (AllowAny)

### 5. Next.js project scaffold
In `/frontend/` (separate directory from Django):
```
frontend/
  app/
    page.tsx              ← landing page (SSR)
    universities/
      page.tsx            ← browse universities (SSR)
      [id]/
        page.tsx          ← university detail (SSR)
        programs/
          [programId]/
            page.tsx      ← program detail + Apply CTA (SSR)
    (auth)/
      login/page.tsx      ← client-rendered auth pages
      register/page.tsx
    dashboard/
      page.tsx            ← applicant dashboard (client-rendered, protected)
  lib/
    api.ts                ← typed fetch wrapper pointing to /api/v1/
  middleware.ts           ← Next.js middleware for auth-protected routes
```

- Public discovery pages (universities, programs) must be SSR for SEO
- Dashboard and auth pages are client-rendered
- Connect to Django API via `NEXT_PUBLIC_API_URL` env variable

### 6. GCP Staging deployment (close Milestone 0)
- Cloud Run backend service (Django + Gunicorn)
- Cloud Run frontend service (Next.js)
- Cloud SQL instance with the Sprint 1+2 migrations applied
- Secrets in Secret Manager (do not hardcode any credentials)
- Run `python manage.py createsuperuser` against Staging DB for admin access

## What NOT to build this sprint
- No applicant-facing application flow yet (Sprint 4)
- No staff-side review UI yet

## Tests required
- `GET /api/v1/universities/` returns seeded universities
- `GET /api/v1/programs/?degree_level=undergraduate` filters correctly
- Closed/inactive programs do NOT appear in public list
- Next.js landing page renders universities from the API without errors

## Done when
- Seeded program data is visible at `https://[staging-url]/universities` via Next.js SSR
- Django admin at `https://[staging-url]/admin/` is accessible
- `pytest universities/ programs/` passes
