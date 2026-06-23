# Sprint 11 — Edge Cases, Testing, and Production Launch

## What you are building in this sprint

The deliberate edge-case hardening pass, the mandatory cross-tenant security tests, and the first real Production deployment. This closes Milestone 4 and completes the MVP.

## Dependency check

Sprint 10 must be complete. Security checklist passed, MFA works, zero CRITICAL security issues.

## Deliverables

### 1. Cross-tenant access-denial tests (Phase 3 §7 — MANDATORY)

These tests must exist as automated pytest tests, not just manual checks:

```python
# In tests/test_tenant_isolation.py

def test_officer_cannot_access_other_university_application(client, univ_a_officer, univ_b_application):
    client.force_authenticate(user=univ_a_officer)
    response = client.get(f'/api/v1/applications/{univ_b_application.id}/')
    assert response.status_code in [403, 404]

def test_officer_cannot_see_other_university_review_queue(client, univ_a_officer, univ_b):
    client.force_authenticate(user=univ_a_officer)
    response = client.get(f'/api/v1/universities/{univ_b.id}/applications/')
    assert response.status_code in [403, 404]

def test_officer_cannot_verify_other_university_document(client, univ_a_officer, univ_b_document):
    client.force_authenticate(user=univ_a_officer)
    response = client.patch(f'/api/v1/documents/{univ_b_document.id}/verify/')
    assert response.status_code in [403, 404]

def test_univ_admin_cannot_edit_other_university_program(client, univ_a_admin, univ_b_program):
    client.force_authenticate(user=univ_a_admin)
    response = client.patch(f'/api/v1/programs/{univ_b_program.id}/', {'name': 'hacked'})
    assert response.status_code in [403, 404]

# Add similar tests for: cycles, staff management, audit log
```

### 2. Phase 4 edge-case list pass

Work through every edge case in the original Phase 4 User Stories document. For each one:
- If it's already handled: add a test proving it
- If it's NOT handled: implement it now

Key ones to verify specifically:
- US-A-01: Email already registered → correct 400 error, no duplicate account
- US-A-02: No programs match filters → empty state (not 500)
- US-A-04: Two browser tabs editing same draft → last-write-wins without corruption
- US-A-05: File exceeds size limit → rejected before upload completes (not after)
- US-A-05: Re-upload after flag → old flagged version retained, new version is pending
- US-A-06: Payment fails/abandoned → application stays Draft, no partial charge
- US-O-03: Applicant re-uploads after flag → document resets to pending (not stays flagged)
- US-U-02: Admin closes cycle early → in-progress drafts cannot be submitted, clear error message

### 3. Celery task failure monitoring
Verify Sentry (or equivalent) is wired to Celery task failures:
```python
# In celery.py
app.conf.task_annotations = {
    '*': {'on_failure': sentry_celery_failure_handler}
}
```
Test by triggering a deliberate task failure and verifying Sentry captures it.

### 4. Production deployment — first real deploy
Follow Phase 12 v0.2 §4 CI/CD pipeline exactly:
1. Push to main → CI runs tests → images built
2. Auto-deploy to Staging → manually verify Staging
3. Click manual approval gate in GitHub Actions → deploy to Production
4. Watch error tracking for 15 minutes post-deploy

Staging smoke test checklist (run through this manually before approving Production):
- [ ] Public discovery pages load
- [ ] Applicant can register and verify email
- [ ] Applicant can start and save a draft
- [ ] Payment intent creates a Payment record
- [ ] Officer can log in (with MFA) and see review queue
- [ ] Platform Admin can view all universities

### 5. `next build` verification
Run `next build` in the frontend directory and confirm zero TypeScript errors and zero broken routes before the Production deploy.

## Done when (Milestone 4 demo criterion from Phase 15)
- Full Phase 5 workflow set (§2 through §5) runs end-to-end on PRODUCTION
- University onboarded via the Platform Admin UI (not seeded directly)
- Zero CRITICAL issues from `@security-check`
- `pytest` passes with >80% coverage on the admissions, documents, and payments apps
- Cross-tenant test suite passes (all tests in `tests/test_tenant_isolation.py`)
- Production deployment is live and has been smoke-tested manually

## After this sprint

The MVP is complete. You now have a demoable, full-loop platform you can show to university registrars. Refer to Phase 19 (Launch Strategy) for the cold-outreach playbook — specifically §19.2 (target private universities first) and §19.3 (lead with the working product, not a deck).

Domain name: register `lucyapply.com` (or `.et`) if you haven't already.
