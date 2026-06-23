# Lucy Apply — OpenCode Execution Playbook

How to use OpenCode to build Lucy Apply sprint by sprint. Read this before starting Sprint 1.

---

## What's in this package

```
lucy-apply-opencode/
  AGENTS.md                    ← Standing brief, loaded in EVERY OpenCode session automatically
  opencode.json                ← OpenCode config: custom agents, instruction files
  context/
    ARCHITECTURE.md            ← Stack, app structure, abstract base classes
    DATABASE_SCHEMA.md         ← Every model field, every FK, every index
    API_ROUTES.md              ← All 45 endpoints with methods, paths, roles
    PERMISSIONS.md             ← DRF permission classes and CRUD matrix
    STATE_MACHINES.md          ← Application, document, and cycle state machines
    SECURITY.md                ← Non-negotiable security rules and audit events
  .opencode/
    agents/
      review.md                ← @review subagent — code review focused on Lucy Apply patterns
      security-check.md        ← @security-check subagent — security audit checklist
    commands/
      sprint1.md               ← /sprint1 command
      sprint2.md               ← /sprint2 command
      sprint3.md               ← /sprint3 command
      sprint4.md               ← /sprint4 command
      sprint5.md               ← /sprint5 command
      sprint6.md               ← /sprint6 command
      sprint7.md               ← /sprint7 command
      sprint8.md               ← /sprint8 command
      sprint9.md               ← /sprint9 command
      sprint10.md              ← /sprint10 command
      sprint11.md              ← /sprint11 command
```

---

## One-time setup

### 1. Place these files in your project root

```bash
git init lucy-apply
cd lucy-apply
# Copy this entire package into the repo root
# Commit it before writing any code
git add .
git commit -m "chore: add opencode project setup (AGENTS.md, context, agents, sprint commands)"
```

### 2. Run /init in OpenCode
```
opencode
> /init
```
OpenCode will scan your repo and improve AGENTS.md with additional project-specific details it discovers. Let it run and commit the result.

### 3. Configure your model
In `opencode.json`, verify the model is set to Claude Sonnet or the best model available to you. The build and plan agents both default to `anthropic/claude-sonnet-4-20250514` — adjust if needed.

---

## The playbook: how to work through each sprint

### Rule 1: Plan before Build (non-negotiable)

OpenCode has two primary modes: **Plan** (read-only, no file changes) and **Build** (full access). Press **Tab** to switch between them.

**Every sprint starts in Plan mode:**
```
[Tab to switch to Plan mode]
/sprint1
```

The agent reads the sprint card, reviews the existing codebase (if any), and proposes what it will do. Review the plan. Ask questions. Clarify any ambiguity. Only when you're satisfied:

```
[Tab to switch to Build mode]
Go ahead and implement the plan.
```

This two-step approach is especially important for Lucy Apply because several sprints touch security-sensitive code (payments, tenancy, MFA) where a quietly wrong implementation is worse than no implementation.

### Rule 2: One sprint at a time

Do not load multiple sprint cards in one session. Each sprint card is the full scope — if you also ask for Sprint 2 work in a Sprint 1 session, the agent will start making decisions that depend on structures that don't exist yet.

### Rule 3: @review before moving to the next sprint

After completing a sprint's implementation and before starting the next:
```
@review please review the changes in this sprint for tenant-scoping errors, permission gaps, and state machine violations
```

Fix everything rated CRITICAL or HIGH before moving on. Medium and Low can be deferred to Sprint 11's edge-case pass.

### Rule 4: @security-check on Sprints 5, 10, and any payment/auth changes

Sprint 5 (payment), Sprint 9 (MFA and platform admin), and Sprint 10 (security hardening) must each get a `@security-check` pass:
```
@security-check please audit payments/views.py and identity/permissions.py
```

### Rule 5: Commit after each working increment, not just each sprint

Don't accumulate a sprint's worth of untracked changes. Commit at logical stopping points within a sprint (e.g. "models done", "API done", "tests passing"). This gives you clean /undo points inside OpenCode and clean git history for debugging.

---

## Working with the context files

OpenCode loads all six context files automatically via `opencode.json`'s `instructions` field. But you can also reference them explicitly in a prompt:

```
Before writing the Application serializer, read context/DATABASE_SCHEMA.md and context/STATE_MACHINES.md first.
```

If the agent seems to be guessing at a field name or making up a relationship, interrupt it and say:
```
Stop. Read context/DATABASE_SCHEMA.md and confirm the exact field names before continuing.
```

---

## Using the subagents

### @review — use after every sprint
```
@review check admissions/views.py and admissions/serializers.py for tenant-scoping issues
```

### @security-check — use before any payment/auth PR and before Sprint 11
```
@security-check audit payments/views.py
```

### @explore — use when you need to find something in the codebase
```
@explore find all places where Application.status is set directly (not via transition_application)
```

### @scout — use when you need to check a library's API
```
@scout check how django-otp TOTPDevice enrollment works in the current version
```

---

## Common pitfalls to avoid

### 1. The agent writes `Application.objects.all()` somewhere — stop it
If you see an unscoped `.objects.all()` on a tenant-scoped model anywhere other than a system task (Celery beat job) or Platform Admin view, that's a potential cross-tenant data leak. Run `@review` immediately.

### 2. The agent puts fee_amount in the payment request body
The client should never send a fee amount. If the agent writes a serializer that accepts `fee_amount` from `request.data` in the payment flow, reject it and explain: "The fee comes from `program.fee_amount` server-side. Remove this field from the request serializer."

### 3. The agent adds JWT auth to the webhook
The `/payments/webhook/` view must have `@csrf_exempt` and must NOT have `IsAuthenticated` in its permission_classes. If the agent adds auth to it, the webhook will always return 401 and payment confirmations will silently fail.

### 4. The agent writes status transitions directly (`application.status = 'admitted'`)
Every status change must go through `transition_application()` in `admissions/state_machine.py`. If the agent bypasses this, the state machine can get into invalid states and ApplicationStatusHistory records won't be created. Tell it: "Don't write `application.status = x` directly. Call `transition_application(application, 'admitted', actor_type, actor_id)` instead."

### 5. Context window getting long mid-sprint
OpenCode automatically compacts context when it gets long. If you notice it starting to forget earlier decisions mid-sprint, start a new session and load the sprint card again:
```
/sprintN (where N is the current sprint)
Here is where we left off: [brief summary of what's done and what's remaining]
```

---

## Milestone checkpoints

These are the four moments where you stop and manually test before coding again:

| After Sprint | Milestone | What to test manually |
|---|---|---|
| 3 | Milestone 0+1 | Staging is live; seeded programs visible at the public URL |
| 6 | Milestone 2 | Full applicant journey: register → apply → pay → receive admit email → accept offer |
| 8 | Milestone 3 | Same as Milestone 2, but officer does the review/decision in the real UI |
| 11 | Milestone 4 (MVP) | Full loop on Production, university onboarded via UI |

At each checkpoint: if the end-to-end test fails, stay in the current milestone, don't advance to the next sprint. The sprint cards assume the prior milestone works correctly.

---

## Quick reference: sprint to milestone mapping

| Sprints | Milestone |
|---|---|
| 1–3 | Foundations + thin university data |
| 4–6 | Full applicant experience (Milestone 2) |
| 7–8 | Full university staff experience (Milestone 3) |
| 9–11 | Platform admin + security + launch (Milestone 4) |

Total: 11 sprints, 12–18 weeks at 10–15 hrs/week. You're building something real.
