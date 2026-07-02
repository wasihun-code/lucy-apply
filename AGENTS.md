# Lucy Apply — Agent Instructions

Monorepo: Django 6.0 backend (Python 3.12, DRF, Celery, PostgreSQL/Redis) + Next.js 14 frontend (TypeScript, App Router).

**Current state:** Frontend revamp (FE-01–FE-16) is **complete**.

---

## Verification (run from `frontend/`)

```bash
npx tsc --noEmit                  # zero TS errors
npx vitest run                    # 30 test files, all pass
next build                        # standalone output, must succeed
```

CI (`.github/workflows/ci.yml`): `python manage.py check` then `pytest --tb=short` (requires PostgreSQL + Redis — needs Docker).

For focused checks after edits:
```bash
cd frontend && npx tsc --noEmit           # always
cd frontend && npx vitest run __tests__/X.test.tsx   # specific file
cd frontend && npx next build             # always
bash qa/run_test.sh qa/05-fe15/02_profile_fe15.sh    # single QA script
```

Never run `bash qa/run_all.sh`, `npx vitest run` (no path), or `./dev-test.sh` as routine checks — they are slow full-suite runs. Reserve for cross-cutting breakage. Docker-based backend tests (`docker-compose up` then `pytest`) are only needed when touching backend QA scripts.

---

## Architecture must-knows

- **Auth:** httpOnly JWT cookies via Next.js proxy `/api/auth/login/`. Never read/write tokens to `localStorage` or `sessionStorage`.
- **API layer:** `fetchAPI` in `lib/api.ts` is the typed wrapper. Still lacks `credentials: 'include'` (TODO FE-04) — cookie-based auth will be broken without it. All API calls go through `fetchAPI`; never write raw `fetch()` in components.
- **Three layout shells:** `PublicShell` (`app/(public)/layout.tsx`), `ApplicantShell` (`app/dashboard/layout.tsx`), `StaffShell` (`app/portal/**`, `app/platform_admin/**`). Landing page at `app/(public)/page.tsx`, NOT `app/page.tsx`.
- **Platform admin routes:** Next.js frontend at `/platform_admin/*`. Django's built-in admin is at `/admin/` on the backend (separate from Next.js).
- **Wizard:** Section-based (`/dashboard/apply/[programId]?section=...`), freely navigable. Auto-save debounced 2000ms via `lodash.debounce` (already in the wizard pages).
- **Design tokens:** CSS custom properties in `globals.css` → `tailwind.config.ts`. Colors from tokens only, never hex literals. `--color-accent` (#C8963A gold) is for admitted/accepted/milestone only — never buttons or nav.
- **Icons:** `lucide-react` only.
- **`next.config.js`** sets `output: 'standalone'` (Cloud Run). Images allowed from `storage.googleapis.com`.
- **Path alias:** `@/` maps to `frontend/` root (both tsconfig.json and vitest.config.ts via `@vitejs/plugin-react`).
- **Utility classes:** `cn()` from `lib/utils.ts` wraps `clsx` + `tailwind-merge`.

---

## Error handling

- `fetchAPI` throws `ApiError` (status, message, body) on non-2xx.
- `getErrorMessage(e)` in every catch block — never `JSON.stringify(e)` or raw error text in the DOM.
- `<Alert variant="danger">` for user-facing errors. `<ErrorState>` component for inline errors with retry.

---

## Component constraints (not obvious from props)

- **`Button`**: no `href` prop. Use `<Link href=""><Button>...</Button></Link>` for navigation.
- **`Alert`**: no `onClose`/dismiss prop. Messages persist until replaced.
- **`StatusBadge`**: 18 statuses including `admin` (bg-primary-soft) and `officer` (bg-neutral/10). Unknown status gets fallback neutral.
- **`EmptyState`**: required on every list that can be empty.

---

## QA scripts

All in `qa/` following `{NN}_{purpose}_{sprint}.sh` within numerical-prefixed directories (e.g. `qa/01-auth/09_mfa_core.sh`). `qa/run_all.sh` discovers via `find qa -name '*.sh'` sorted alphabetically. Run single scripts with `bash qa/run_test.sh qa/05-fe15/02_profile_fe15.sh`.

Backend quirks for QA: `pytest.ini` sets `DJANGO_SETTINGS_MODULE=lucy_apply.settings`; `conftest.py` sets `OPENSE_TESTING=true` env var. DELETE for staff returns HTTP 200 (not 204) and sets `account_status` to `deactivated`.

**Seed data:** `python manage.py seed_data` creates demo universities, programs, users, and applications. `python manage.py seed_data --flush` deletes existing seed data first then re-creates. `python manage.py unseed_data` removes all seed data (with `--yes` to skip prompt). Both use `get_or_create` so they are idempotent. The command prints the database file path so you can verify which database is being modified.

---

## Loaded automatically via `opencode.json`

- `context/FE_DESIGN_SYSTEM.md` — color tokens, typography, spacing, component specs
- `context/FE_ARCHITECTURE.md` — file structure, API endpoint list, wizard form_data schema
- `context/FE_AUDIT.md` — visual audit findings (reference only, not a to-do)
