# Lucy Apply — Production Deployment

This document covers the manual steps required to deploy Lucy Apply to production.
**Do not execute these steps automatically** — this is a manual handoff for the ops team.

## Prerequisites

1. Google Cloud project with Cloud Run, Cloud SQL (PostgreSQL 15), Redis/Memorystore, and Artifact Registry enabled.
2. Domain names: `lucyapply.com` (or `.et`), `api.lucyapply.com`
3. SSL certs via Google-managed certificates
4. Stripe account with live API keys
5. reCAPTCHA v2 site + secret keys
6. SendGrid (or equivalent) SMTP credentials
7. GCS bucket for file uploads

## Manual deployment steps

### 1. Create Cloud SQL instance

```bash
gcloud sql instances create lucy-apply-db \
    --database-version=POSTGRES_15 \
    --region=us-central1 \
    --tier=db-f1-micro \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=03:00
```

Create database and user:
```bash
gcloud sql databases create lucy_apply --instance=lucy-apply-db
gcloud sql users create lucy_user --instance=lucy-apply-db --password=<secure-password>
```

Build the DATABASE_URL:
```
DATABASE_URL=postgres://lucy_user:<password>@<public-ip>:5432/lucy_apply
```

### 2. Store secrets in Secret Manager

```bash
echo -n "<secret-key>" | gcloud secrets create SECRET_KEY --data-file=-
echo -n "<database-url>" | gcloud secrets create DATABASE_URL --data-file=-
```

### 3. Create GCS bucket

```bash
gcloud storage buckets create gs://lucy-apply-production --location=us-central1
```

### 4. Build and push images

```bash
# Backend
docker build -f Dockerfile.backend -t lucy-apply-backend .
docker tag lucy-apply-backend us-central1-docker.pkg.dev/<project>/lucy-apply/backend:latest
docker push us-central1-docker.pkg.dev/<project>/lucy-apply/backend:latest

# Frontend
docker build -f Dockerfile.frontend -t lucy-apply-frontend ./frontend
docker tag lucy-apply-frontend us-central1-docker.pkg.dev/<project>/lucy-apply/frontend:latest
docker push us-central1-docker.pkg.dev/<project>/lucy-apply/frontend:latest
```

### 5. Run database migrations

```bash
gcloud run jobs create lucy-apply-migrate \
    --image=us-central1-docker.pkg.dev/<project>/lucy-apply/backend:latest \
    --command="python,manage.py,migrate" \
    --set-secrets=SECRET_KEY=SECRET_KEY:latest,DATABASE_URL=DATABASE_URL:latest
gcloud run jobs execute lucy-apply-migrate
```

### 6. Deploy backend to Cloud Run

```bash
gcloud run deploy lucy-apply-backend \
    --image=us-central1-docker.pkg.dev/<project>/lucy-apply/backend:latest \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 --max-instances=10 \
    --concurrency=80 --cpu=1 --memory=512Mi \
    --timeout=300 \
    --set-secrets=SECRET_KEY=SECRET_KEY:latest,DATABASE_URL=DATABASE_URL:latest \
    --set-env-vars=DEBUG=False,ALLOWED_HOSTS=.lucyapply.com,.run.app \
    --add-cloudsql-instances=<project>:us-central1:lucy-apply-db \
    --vpc-connector=lucy-apply-vpc-connector \
    --service-account=cloud-run-sa@<project>.iam.gserviceaccount.com
```

### 7. Deploy frontend to Cloud Run

```bash
gcloud run deploy lucy-apply-frontend \
    --image=us-central1-docker.pkg.dev/<project>/lucy-apply/frontend:latest \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 --max-instances=5 \
    --cpu=1 --memory=256Mi \
    --timeout=60 \
    --set-env-vars=NEXT_PUBLIC_API_URL=https://api.lucyapply.com/api/v1
```

### 8. Configure custom domain

```bash
gcloud beta run domain-mappings create \
    --service=lucy-apply-frontend \
    --domain=lucyapply.com \
    --region=us-central1

gcloud beta run domain-mappings create \
    --service=lucy-apply-backend \
    --domain=api.lucyapply.com \
    --region=us-central1
```

Update DNS A/AAAA records to point to the Cloud Run IPs.

### 9. Verify deployment

Run through the staging smoke test checklist (`deploy/staging-smoke-test.md`).

### 10. Seed initial Platform Admin

```bash
gcloud run jobs create lucy-apply-seed-admin \
    --image=.../backend:latest \
    --command="python,manage.py,seed_admin"
gcloud run jobs execute lucy-apply-seed-admin
```

## CI/CD (future)

Once manual deploy is validated, migrate to fully automated CI/CD via `deploy/cloudbuild.yaml`:

1. Push to `main` → GitHub Actions / Cloud Build triggers
2. Run `pytest` and `python manage.py check`
3. Build and push images
4. Deploy to staging Cloud Run service
5. Run smoke tests
6. Manual approval gate → deploy to production

## Post-deploy monitoring

- Watch Sentry error tracking for 15 minutes post-deploy
- Check Cloud Run logs for 4xx/5xx errors
- Verify Celery tasks are executing (check Redis queue length)
- Monitor Cloud SQL CPU/memory usage
