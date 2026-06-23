# Sprint 2 — Docker Compose + Celery/Redis + GitHub Actions CI

## What you are building in this sprint

Local dev environment (Docker Compose) with all required services, Celery/Redis pipeline validation, and the GitHub Actions CI skeleton. This proves the full infrastructure topology before any real features are built on it.

## Dependency check

Sprint 1 must be complete: Django project runs, auth endpoints exist, custom User model is migrated.

## Deliverables

### 1. Docker Compose for local development
`docker-compose.yml` with these services:
- `db` — postgres:15, port 5432, with a named volume
- `redis` — redis:7-alpine, port 6379
- `backend` — builds from `./Dockerfile.backend`, depends on `db` + `redis`, runs `gunicorn lucy_apply.wsgi:application --bind 0.0.0.0:8000`
- `celery-worker` — same image as backend, command: `celery -A lucy_apply worker --loglevel=info`, depends on `db` + `redis`
- `celery-beat` — same image as backend, command: `celery -A lucy_apply beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler`, depends on `db` + `redis`
- `frontend` — builds from `./Dockerfile.frontend` (Next.js), port 3000

### 2. Backend Dockerfile
`Dockerfile.backend`:
- Python 3.12-slim base
- Install dependencies from `requirements.txt`
- Copy project, collect static files
- Default CMD: `gunicorn lucy_apply.wsgi:application --bind 0.0.0.0:8080 --workers 2`

### 3. Celery configuration
In `lucy_apply/celery.py`:
- Standard Django Celery app setup
- Broker: Redis (`CELERY_BROKER_URL = env('REDIS_URL', default='redis://redis:6379/0')`)
- Result backend: Redis
- Auto-discover tasks from all installed apps

Create a first real Celery task in `notifications/tasks.py`:
- `send_test_email.delay(email_address)` — sends a simple test email via Django's email backend
- This validates the worker pipeline end-to-end

### 4. GitHub Actions CI skeleton
`.github/workflows/ci.yml`:
- Trigger: push to `main`, pull_request to `main`
- Steps:
  1. Checkout
  2. Set up Python 3.12
  3. Install dependencies (`pip install -r requirements.txt`)
  4. Run Django checks (`python manage.py check`)
  5. Run pytest (`pytest --tb=short`)
- Use service containers for Postgres and Redis in the CI environment

### 5. Environment configuration
`.env.example` listing all required environment variables:
- `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `REDIS_URL`
- `GCS_BUCKET_NAME`, `GCS_CREDENTIALS_FILE`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `PAYMENT_PROCESSOR_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET`

## What NOT to build this sprint
- No GCP deployment yet (that's Milestone 0 close, handled during Sprint 3)
- No Next.js Dockerfile beyond a stub (frontend work starts Sprint 3)

## Tests required
- `docker-compose up` starts all services without errors
- Celery worker processes the `send_test_email` task successfully (verify in worker logs)
- GitHub Actions CI run passes on a push to a test branch

## Done when
- `docker-compose up` runs all 6 services cleanly
- `@general can you send a test celery task and confirm it was processed` returns success in worker logs
- CI workflow runs green on GitHub
