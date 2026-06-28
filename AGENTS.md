# Lucy Apply — Agent Instructions

Monorepo: Django 6.0 backend (Python 3.12, DRF, Celery, PostgreSQL/Redis) + Next.js 14 frontend (TypeScript, App Router).

**Current phase:** Frontend revamp (FE Sprints 1–16). Backend is complete and frozen — do not modify.

---

## Verification commands (run after every change)

```bash
# Backend — requires PostgreSQL + Redis (use `docker compose up -d db redis` or CI)
pytest --tb=short                       # 254 tests, all must pass

# Frontend
cd frontend && npx tsc --noEmit        # zero TS errors required
cd frontend && next build               # must succeed (standalone output)
```

CI runs `python manage.py check` then `pytest --tb=short`.

---

## Architecture must-knows

- **Auth:** httpOnly JWT cookies via Next.js proxy route `/api/auth/login/`. Never read/write tokens to `localStorage` or `sessionStorage`.
- **API layer:** All calls go through `frontend/lib/api.ts` (`fetchAPI`). Never write raw `fetch()` in pages/components. The current wrapper lacks `credentials: 'include'` — expect cookie-based auth to break without it.
- **Three layout shells:** `PublicShell` (public pages), `ApplicantShell` (`/dashboard/**`), `StaffShell` (`/portal/**`, `/admin/**`). Every page slots into exactly one.
- **Wizard:** Section-based pattern (`/dashboard/apply/[programId]?section=...`), NOT a linear step flow. Sections are freely navigable. FE-06 is superseded by FE-06b.
- **Auto-save:** Debounced 2000ms, save state indicator in wizard top bar.
- **Design tokens:** CSS custom properties → Tailwind (tailwind.config.ts maps vars). See `context/FE_DESIGN_SYSTEM.md`.
- **Icons:** `lucide-react` only. Not yet in package.json — add it when needed.
- **Stripe:** Required in production; dev/test uses test keys or empty (graceful fallback).

---

## Repo boundaries

| Path | Owner | Touching rules |
|---|---|---|
| `frontend/` | Frontend revamp | Edit freely during FE sprints |
| `lucy_apply/`, `identity/`, `programs/`, `admissions/`, `documents/`, `payments/`, `notifications/`, `audit/`, `universities/`, `tests/` | Backend | **Do not modify** — backend is complete and tested |
| `context/` | Design reference | Read-only reference docs |
| `.opencode/` | OpenCode config | Sprint commands (`/fe01`–`/fe16`), subagents (`@fe-review`, `@visual-check`) |

---

## Known gaps (being fixed in progressive sprints)

- Navbar shows Login/Register when logged in — needs `getMe()` in shell
- Raw JSON errors surface to users (e.g. `CYCLE_CLOSED`) — must catch and show `<Alert variant="danger">`
- No EmptyState, Skeleton, Card, Button, or Input primitives exist yet — build per design system spec
- Wizard uses section-based navigation (`?section=`), not the old 3-step flow

---

## Existing instructions loaded via opencode.json

- `context/FE_DESIGN_SYSTEM.md` — color tokens, typography, spacing, component specs
- `context/FE_ARCHITECTURE.md` — file structure, API pattern, wizard form_data schema
- `context/FE_AUDIT.md` — visual audit findings (reference only, not a to-do)
