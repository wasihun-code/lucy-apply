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

## Loaded automatically via `opencode.json`

- `context/FE_DESIGN_SYSTEM.md` — color tokens, typography, spacing, component specs
- `context/FE_ARCHITECTURE.md` — file structure, API pattern, wizard form_data schema
- `context/FE_AUDIT.md` — visual audit findings (reference only, not a to-do)
