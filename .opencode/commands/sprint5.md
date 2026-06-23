# Sprint 5 — Submission + Payment + Celery Notifications

## What you are building in this sprint

The submission gate, payment integration (Stripe or equivalent global card processor), the payment webhook, and Celery-based email notifications. This is the most complex sprint in the build — the one with real concurrency edge cases.

## Dependency check

Sprint 4 must be complete: Application draft, document upload, and document checklist all work.

## Deliverables

### 1. Payment model and migrations
Per `context/DATABASE_SCHEMA.md`:
- `payments.Payment` with `OneToOneField` to Application
- `initiated_at` field is mandatory — record this at payment-intent creation time, NOT at webhook receipt

### 2. Payment intent endpoint
`POST /api/v1/applications/{id}/payment-intent/` (as `@action` on ApplicationViewSet):
1. Verify all required documents are uploaded (not just pending — any status, but must exist)
2. Check admission cycle is still Open at `now()` — record `payment.initiated_at = now()` immediately
3. Read fee from `application.program.fee_amount` — NEVER from request.data
4. Create a `Payment` record with `status='pending'` and `initiated_at=now()`
5. Call the payment processor to create a payment intent
6. Return the client_secret / payment URL to the frontend

ADR-009: The cycle deadline check happens at step 2, using `initiated_at`. If payment completes after the deadline but `initiated_at` was before it, the application is accepted as valid (payment wins).

### 3. Payment webhook
`POST /api/v1/payments/webhook/` (standalone function-based view):

**CRITICAL implementation requirements:**
```python
@csrf_exempt  # MUST have this
def payment_webhook(request):
    # Step 1: Verify signature BEFORE reading payload
    signature = request.headers.get('Stripe-Signature')  # or processor equivalent
    try:
        event = processor_sdk.construct_event(request.body, signature, settings.WEBHOOK_SECRET)
    except ValueError:
        return HttpResponse(status=400)  # invalid payload
    except SignatureVerificationError:
        return HttpResponse(status=400)  # invalid signature — log this attempt

    # Step 2: Only THEN process the payload
    if event['type'] == 'payment_intent.succeeded':
        payment_intent_id = event['data']['object']['id']
        payment = Payment.objects.get(processor_reference=payment_intent_id)
        payment.status = 'succeeded'
        payment.completed_at = now()
        payment.save()
        # Transition application: draft → submitted
        transition_application(payment.application, 'submitted', 'system', None)
        # Trigger notification Celery task
        send_application_submitted_email.delay(payment.application.id)
    ...
```

Do NOT add `IsAuthenticated` or JWT auth to this view. The signature is the authentication.
Do NOT use `request.data` — use `request.body` with the raw bytes for signature verification.

### 4. Submission gate
`POST /api/v1/applications/{id}/submit/` (as `@action` on ApplicationViewSet):
- Check: all required documents have an `ApplicationDocument` record (any status)
- Check: at least one `Payment` record exists with `status='succeeded'`
- If both pass: this endpoint actually does nothing — the webhook drives the status transition
- If payment already succeeded but status is still 'draft': this endpoint can force the transition (handles race condition where webhook fired but application wasn't updated yet)

The submit button on the frontend should:
1. Call `payment-intent` → get client_secret
2. Call processor SDK with client_secret to confirm payment
3. Webhook fires → application transitions to 'submitted'
4. Poll `/api/v1/applications/{id}/` until status != 'draft'

### 5. Celery notification tasks
In `notifications/tasks.py`, create tasks for every applicant-facing email event per Phase 2 §7:
- `send_verification_email(applicant_id)`
- `send_application_submitted_email(application_id)` — triggered by webhook success
- `send_document_flagged_email(document_id)` — triggered by document flag signal
- `send_decision_email(application_id)` — triggered by status change to admitted/rejected/waitlisted
- `send_offer_response_email(application_id)` — triggered by accepted/declined, notifies UniversityAdmin

Wire these via Django signals in `admissions/signals.py` and `documents/signals.py` — NOT inline in views.

### 6. Next.js: submit flow
- Review & Submit screen showing form data summary and document checklist
- Pay button → calls payment-intent → opens processor payment modal
- After payment: poll status endpoint, redirect to confirmation page on success
- Confirmation page with application reference number

## Tests required (these are CRITICAL — test the concurrency and security cases, not just the happy path)

- Payment webhook with valid signature and 'payment_intent.succeeded' → application transitions to 'submitted'
- Payment webhook with INVALID signature → returns 400, application NOT updated
- Payment webhook with duplicate event (already processed) → idempotent, no double-transition
- Fee amount in payment intent comes from program.fee_amount, not request.data (verify there is NO code path reading fee from request)
- ADR-009: payment initiated before deadline, webhook fires after deadline → application honored
- Missing required documents → payment-intent endpoint returns 400 before creating a Payment record
- Celery task fires for submission confirmation email after webhook

## Done when
- Applicant on Staging can complete the full flow: fill form → upload docs → pay → receive confirmation email
- `@security-check` on `payments/views.py` returns zero CRITICAL issues
- `pytest payments/` passes including the signature-verification test
