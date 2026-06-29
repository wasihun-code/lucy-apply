# Lucy Apply — Agent Instructions

Monorepo: Django 6.0 backend (Python 3.12, DRF, Celery, PostgreSQL/Redis) + Next.js 14 frontend (TypeScript, App Router).

**Phase:** Frontend revamp (FE Sprints 1–16). Backend is frozen — do not modify Django files.

---

## Verification (run after every change)

```bash
# Backend — requires PostgreSQL + Redis running (docker compose up -d db redis)
pytest --tb=short                       # 254 tests, all must pass

# Frontend
cd frontend && npx tsc --noEmit         # zero TS errors
cd frontend && next build               # must succeed (standalone output)
```

CI runs `python manage.py check` then `pytest --tb=short`.

---

## Architecture must-knows

- **Auth:** httpOnly JWT cookies via Next.js proxy `/api/auth/login/`. Never read/write tokens to `localStorage` or `sessionStorage`.
- **API layer:** `fetchAPI` in `frontend/lib/api.ts` is the typed wrapper. Some legacy functions in that same file (`login`, `fetchAdminUniversities`, `createUniversity`, etc.) use raw `fetch()` with Bearer token — migrate to `fetchAPI` when touching. `fetchAPI` lacks `credentials: 'include'` (TODO FE-04) — cookie-based auth will break without it.
- **Three layout shells:** `PublicShell` (`app/(public)/layout.tsx`), `ApplicantShell` (`app/dashboard/layout.tsx`), `StaffShell` (`app/portal/**`, `app/admin/**`). Every page slots into exactly one via route group layout.
- **Wizard:** Section-based (`/dashboard/apply/[programId]?section=...`), freely navigable sections. Not a linear step flow.
- **Auto-save:** Debounced 2000ms via `lodash.debounce` or `useMemo` pattern, save state indicator in wizard top bar.
- **Design tokens:** CSS custom properties in `globals.css` → `tailwind.config.ts`. Colors from tokens only, never hex literals. `--color-accent` (#C8963A gold) is for admitted/accepted/milestone only — never buttons or nav.
- **Icons:** `lucide-react` only.
- **`next.config.js`** sets `output: 'standalone'` (Cloud Run). Images allowed from `storage.googleapis.com`.

---

## Repo boundaries

| Path | Owner | Touching rules |
|---|---|---|
| `frontend/` | Frontend revamp | Edit freely |

| `backend top-level dirs` `(lucy_apply/, identity/, programs/, admissions/, documents/, payments/, notifications/, audit/, universities/, tests/)` | Backend | **Do not modify** |
| `context/` | Design reference | Read-only |
| `.opencode/` | OpenCode config | Sprint commands (`/fe01`–`/fe16`), subagents (`@fe-review`, `@visual-check`) |

---

## Frontend test runner

- **Vitest** (not Jest): `cd frontend && npm test` or `cd frontend && npx vitest run`
- Config: `frontend/vitest.config.ts`, setup: `frontend/vitest.setup.ts`
- Tests live in `frontend/__tests__/`
- Docker compose has a `frontend-test` service: `docker compose run --rm frontend-test`

---

## Backend testing quirks

- `pytest-django` with `DJANGO_SETTINGS_MODULE=lucy_apply.settings` (see `pytest.ini`)
- `conftest.py` sets `OPENSE_TESTING=true` env var
- QA scripts: `bash qa/run_all.sh` — shell-based integration tests
- `dev-test.sh`: full docker-compose test pipeline (build → up → frontend-tests → pytest → qa)

---

## Route group structure

The landing page is at `app/(public)/page.tsx`, NOT `app/page.tsx`. Route groups: `(public)`, `(auth)`, `dashboard/`, `portal/`, `admin/`.

---

## Known gaps (being fixed in sprints)

- `fetchAPI` lacks `credentials: 'include'` — cookie auth is broken currently
- Raw JSON errors surface to users (e.g. `CYCLE_CLOSED`) — must catch and show `<Alert variant="danger">`
- Some `api.ts` helpers still use raw `fetch()` with Bearer token — migrate to `fetchAPI`

---

## Loaded automatically via `opencode.json`

- `context/FE_DESIGN_SYSTEM.md` — color tokens, typography, spacing, component specs
- `context/FE_ARCHITECTURE.md` — file structure, API pattern, wizard form_data schema
- `context/FE_AUDIT.md` — visual audit findings (reference only, not a to-do)
