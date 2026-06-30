# Lucy Apply — Agent Instructions

Monorepo: Django 6.0 backend (Python 3.12, DRF, Celery, PostgreSQL/Redis) + Next.js 14 frontend (TypeScript, App Router).

**Phase:** Frontend revamp (FE Sprints 1–16). Backend is frozen — do not modify Django files.

---

## Verification (run from `frontend/`)

```bash
npx tsc --noEmit                  # zero TS errors
npx vitest run                    # 175 frontend tests (21 files, all pass)
next build                        # standalone output, must succeed
bash qa/run_all.sh                # frontend at root, backend tests at root
```

CI runs `python manage.py check` then `pytest --tb=short` (requires PostgreSQL + Redis).

---

## Architecture must-knows

- **Auth:** httpOnly JWT cookies via Next.js proxy `/api/auth/login/`. Never read/write tokens to `localStorage` or `sessionStorage`.
- **API layer:** `fetchAPI` in `lib/api.ts` is the typed wrapper. 6 legacy functions (`login`, `fetchAdminUniversities`, `createUniversity`, `fetchStaff`, `inviteStaff`, `removeStaff`) still use raw `fetch()` with Bearer token — migrate to `fetchAPI` when touching. `fetchAPI` lacks `credentials: 'include'` (TODO FE-04) — cookie-based auth will break without it.
- **Three layout shells:** `PublicShell` (`app/(public)/layout.tsx`), `ApplicantShell` (`app/dashboard/layout.tsx`), `StaffShell` (`app/portal/**`, `app/admin/**`). Landing page at `app/(public)/page.tsx`, NOT `app/page.tsx`.
- **Wizard:** Section-based (`/dashboard/apply/[programId]?section=...`), freely navigable. Auto-save debounced 2000ms via `lodash.debounce`.
- **Design tokens:** CSS custom properties in `globals.css` → `tailwind.config.ts`. Colors from tokens only, never hex literals. `--color-accent` (#C8963A gold) is for admitted/accepted/milestone only — never buttons or nav.
- **Icons:** `lucide-react` only.
- **`next.config.js`** sets `output: 'standalone'` (Cloud Run). Images allowed from `storage.googleapis.com`.

---

## Error handling (FE-10)

- `fetchAPI` and all legacy functions now throw `ApiError` (status, message, body) on non-2xx.
- `getErrorMessage(e)` in every catch block — never `JSON.stringify(e)` or raw error text in the DOM.
- `extractErrorMessage(json)` parses DRF-style responses: `detail` → `message` → `error.message` → `error.code`.
- `<Alert variant="danger">` for user-facing errors. `<ErrorState>` component for inline errors with retry.

---

## Component constraints (not obvious from props)

- **`Button`**: no `href` prop. Use `<Link href=""><Button>...</Button></Link>` for navigation buttons.
- **`Alert`**: no `onClose`/dismiss prop. Success/error messages persist until replaced.
- **`StatusBadge`**: 18 statuses including `admin` (bg-primary-soft) and `officer` (bg-neutral/10). Any unknown status gets a fallback neutral style.
- **`EmptyState`**: required on every list that can be empty.

---

## Repo boundaries

| Path | Owner | Rules |
|---|---|---|
| `frontend/` | Frontend revamp | Edit freely |
| `lucy_apply/`, `identity/`, `programs/`, `admissions/`, `documents/`, `payments/`, `notifications/`, `audit/`, `universities/`, `tests/` | Backend | **Do not modify** |
| `context/` | Design reference | Read-only |
| `.opencode/` | OpenCode config | Sprint commands (`/fe01`–`/fe16`), subagents (`@fe-review`, `@visual-check`) |

---

## Backend quirks (for QA scripts)

- `pytest.ini` sets `DJANGO_SETTINGS_MODULE=lucy_apply.settings`. `conftest.py` sets `OPENSE_TESTING=true` env var.
- DELETE for staff returns HTTP 200 (not 204) and sets `account_status` to `deactivated` (not removed).
- QA scripts in `qa/` are shell-based integration tests, run via `bash qa/run_all.sh`.

---

## QA file naming convention

All QA test scripts follow the pattern `{NN}_{purpose}_{sprint}.sh` within numerical-prefixed directories:

- `NN`: 2-digit ordering number (unique within directory)
- `purpose`: kebab-case description of what the test covers
- `sprint`: `fe{NN}` for sprint-owned tests, `core` for foundational auth tests

Example: `qa/05-fe15/01_finances_fe15.sh`, `qa/01-auth/09_mfa_core.sh`.

`qa/run_all.sh` discovers scripts via `find qa -name '*.sh'` sorted alphabetically, so the directory prefix (`01-auth`, `02-public`, ...) determines execution order. Scripts within a directory execute in `01_...`, `02_...` order.

---

## Per-sprint verification policy

Every sprint must:
1. Add frontend tests for new component/page logic (Vitest, `frontend/__tests__/`)
2. Add a QA script for any new user-facing flow (`qa/{prefix}-{area}/{order}_{purpose}_{sprint}.sh`)
3. Provide a Conventional Commit message after verification passes, as the final step of every sprint report

Default verification commands (use these, not the full suite):

```bash
cd frontend && npx tsc --noEmit                          # always, full
cd frontend && npx next build                            # always, full
cd frontend && npx vitest run __tests__/X.test.tsx       # new file only
bash qa/run_test.sh qa/05-fe15/02_profile_fe15.sh        # new script only
```

Never run the following as routine per-sprint verification — they rebuild Docker images and run the entire suite, which is slow and mostly redundant for an isolated sprint:
- `bash qa/run_all.sh` (no argument)
- `npx vitest run` (no path)
- `./dev-test.sh`

Reserve full-suite runs for milestone checkpoints (end of a Tier) or when cross-cutting breakage is suspected, and only run them when explicitly requested.

---

## Loaded automatically via `opencode.json`

- `context/FE_DESIGN_SYSTEM.md` — color tokens, typography, spacing, component specs
- `context/FE_ARCHITECTURE.md` — file structure, API pattern, wizard form_data schema
- `context/FE_AUDIT.md` — visual audit findings (reference only, not a to-do)
