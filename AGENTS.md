# Lucy Apply — Frontend Agent Standing Brief

**Phase:** Frontend Revamp (FE Sprints 1–16)
**Backend status:** Complete. 11 backend sprints done. 254 pytest tests passing.
**Frontend status:** Functional but lacks design system, consistent navigation, and several pages.

Read this before every session. Every frontend sprint depends on the decisions recorded here.

---

## Project Structure

```
lucy-apply/
  frontend/                    ← Next.js 14 App Router (TypeScript)
    app/
      page.tsx                 ← Landing page (public)
      universities/            ← University discovery (public, SSR)
      (auth)/                  ← Login, register, MFA, password reset
      dashboard/               ← Applicant portal
      portal/                  ← University staff portal
      admin/                   ← Platform admin
      api/                     ← Next.js API routes (e.g. /api/auth/login/)
    components/
      ui/                      ← Design system primitives (Button, Badge, Card, Input…)
      layout/                  ← Shell components (PublicShell, ApplicantShell, StaffShell)
      shared/                  ← Shared feature components (StatusBadge, EmptyState…)
    lib/
      api.ts                   ← Typed fetch wrapper → /api/v1/
      auth.ts                  ← Auth helpers (token read/write, role detection)
    styles/
      globals.css              ← Design tokens as CSS custom properties
```

---

## Design System (locked — do not deviate)

### Color tokens (defined in globals.css as CSS custom properties)
```
--color-primary:       #1B4FBF   deep academic blue — primary actions
--color-primary-dark:  #153D96   hover state
--color-primary-soft:  #EEF2FB   tinted backgrounds
--color-success:       #0F7B55   admitted, verified, active
--color-warning:       #B45309   pending, under review
--color-danger:        #B91C1C   rejected, flagged, deactivated
--color-neutral:       #6B7280   draft, inactive, archived
--color-accent:        #C8963A   gold — achievement moments only (admitted, accepted)
--color-background:    #F7F8FA   page background
--color-surface:       #FFFFFF   cards, modals, inputs
--color-border:        #E2E6EC   borders, dividers
--color-text-900:      #0F1923   primary text
--color-text-600:      #4B5563   secondary, metadata
--color-text-400:      #9CA3AF   placeholder, disabled
```

### Typography
- Headings: **Plus Jakarta Sans** (600, 700) via `next/font/google`
- Body: **Inter** (400, 500) via `next/font/google`
- Mono: **JetBrains Mono** — IDs and reference numbers only

### Spacing — 4px grid
`space-1=4px, space-2=8px, space-3=12px, space-4=16px, space-5=20px, space-6=24px, space-8=32px, space-10=40px, space-12=48px, space-16=64px`

### Border radius
`rounded-sm=4px, rounded=8px, rounded-lg=12px, rounded-xl=16px, rounded-full=9999px`

### Shadows
`shadow-sm (cards), shadow-md (dropdowns), shadow-lg (modals)`

---

## Layout Shells (non-negotiable)

Three shells. Every page slots into exactly one. No page defines its own outer layout.

| Shell | Route groups | Sidebar | Top bar |
|---|---|---|---|
| `PublicShell` | `/`, `/universities`, `/programs`, `/(auth)` | None | Logo + nav links + auth state |
| `ApplicantShell` | `/dashboard/**` | Left (My Applications, Browse Programs, Profile) | Logo + user menu |
| `StaffShell` | `/portal/**`, `/admin/**` | Left collapsible (context-aware) | University name + user menu |

---

## Component Rules

### Button — 4 variants only
```tsx
<Button variant="primary" size="md">   // main CTA
<Button variant="secondary" size="md"> // secondary action
<Button variant="danger" size="md">    // destructive
<Button variant="ghost" size="md">     // tertiary/inline
// sizes: sm (h-8), md (h-10), lg (h-11)
```

### StatusBadge — one component, all statuses
```tsx
<StatusBadge status="draft" />         // gray
<StatusBadge status="submitted" />     // blue
<StatusBadge status="under_review" />  // yellow
<StatusBadge status="admitted" />      // gold
<StatusBadge status="rejected" />      // red
<StatusBadge status="waitlisted" />    // gray
<StatusBadge status="accepted" />      // green
<StatusBadge status="declined" />      // gray
<StatusBadge status="active" />        // green
<StatusBadge status="inactive" />      // gray
<StatusBadge status="published" />     // green
<StatusBadge status="pending" />       // yellow
```

### Icons
- Library: `lucide-react` only. No mixing with other icon sets.
- Size: 20px (`size={20}`) for inline icons, 24px for standalone/empty states.
- Stroke: 1.5px (lucide default).

---

## API Integration

Backend base URL: `process.env.NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000/api/v1`)

Auth uses httpOnly JWT cookies set via the Next.js proxy route `/api/auth/login/`.
**Never read or write JWT tokens to localStorage or sessionStorage.**

The typed fetch wrapper lives in `frontend/lib/api.ts`. All API calls go through it.
Never write raw `fetch()` calls in page or component files.

Roles from `GET /api/v1/auth/me/`:
```
role: 'applicant' | 'university_staff' | 'platform_admin'
permission_level: 'officer' | 'admin'  // staff only
mfa_enabled: boolean
mfa_verified: boolean
```

---

## Non-Negotiable Rules

1. **No raw API errors shown to users.** Every `api.ts` call is wrapped with a try/catch.
   Users see human-readable messages, never JSON objects or stack traces.

2. **Every list has an empty state.** No blank white space on empty data.
   Use the `<EmptyState>` component with an icon, heading, and optional CTA.

3. **Every async fetch has a skeleton loader.** No blank pages during loading.
   Use `<Skeleton>` primitives, not spinners unless the operation is < 300ms.

4. **Design tokens only.** No hardcoded hex values in any component file after FE-01.
   All colors come from Tailwind config mapped to CSS custom properties.

5. **Responsive from the start.** Every new component considers mobile layout.
   Sidebar collapses to a drawer on mobile. Tables scroll horizontally.

6. **Focus states are always visible.** Every interactive element has a
   `focus-visible:ring-2 focus-visible:ring-primary` ring.

7. **lucide-react icons only.** Never mix icon sets.

8. **No functional regressions.** Every sprint leaves all existing features working.
   Run `next build` and `tsc --noEmit` before marking a sprint complete.

---

## Known Issues to Fix (critical, in-scope for this revamp)

1. **Raw JSON error on submit** (screenshot confirmed): The review & submit page
   surfaces `{"error":{"code":"CYCLE_CLOSED",...}}` directly to users. Fix in FE-06.

2. **Navbar shows Login/Register when logged in**: The top navbar does not adapt to
   auth state across authenticated pages. Fix in FE-01 when PublicShell is built.

3. **Portal navigation uses tab buttons in page header**: Doesn't scale, wrong pattern.
   Replace with StaffShell sidebar in FE-07.

4. **No application detail page**: Applicants cannot view their submitted application.
   Build in FE-05.

---

## Sprint Reference

| Sprint | Scope |
|---|---|
| FE-01 | Design tokens + layout shells + base components |
| FE-02 | Landing page + university listing |
| FE-03 | University detail + program detail |
| FE-04 | Auth pages (login, register, reset, verify) |
| FE-05 | Applicant dashboard + application detail |
| FE-06 | Application wizard redesign (all 3 steps + confirmation) |
| FE-07 | Staff portal shell + application queue |
| FE-08 | Application review detail (staff) |
| FE-09 | Programs + cycle management |
| FE-10 | Team management + empty/error/loading states |
| FE-11 | Admin shell + universities |
| FE-12 | Admin: users + audit log |
| FE-13 | Admin: stats dashboard |
| FE-14 | MFA pages redesign |
| FE-15 | Payment receipt + applicant profile |
| FE-16 | Status timeline + notifications |

---

## Application Wizard — Section-Based Pattern (IMPORTANT)

The application wizard uses a **section-based navigation pattern**, NOT a linear 3-step flow.
Sprint FE-06 is superseded by FE-06b. Do not implement FE-06.

### Wizard structure
```
/dashboard/apply/[programId]?section=personal    ← Personal Information
/dashboard/apply/[programId]?section=contact     ← Contact Details
/dashboard/apply/[programId]?section=education   ← Education (dynamic blocks)
/dashboard/apply/[programId]?section=languages   ← Languages (dynamic blocks)
/dashboard/apply/[programId]?section=motivation  ← Motivation / Personal Statement
/dashboard/apply/[programId]?section=documents   ← Document upload with previews
/dashboard/apply/[programId]?section=checklist   ← Completion checklist + Submit
```

### Key rules for the wizard
- Sections are **freely navigable** at any time — no locking
- The wizard has its own layout shell (NOT ApplicantShell) with a sticky top bar
- Left sidebar on desktop, horizontal tab strip on mobile
- Auto-save: debounced 2000ms. Manual save button in top bar
- Submit is only available from the Checklist section
- Document section shows inline thumbnail previews and a modal viewer
- Dynamic blocks (Education, Languages) support Move up / Move down / Delete
- Error codes (CYCLE_CLOSED, MISSING_DOCS, PAYMENT_REQUIRED) must map to
  human-readable messages — never raw JSON

### form_data structure
All sections stored in one `form_data` JSONField:
```json
{
  "personal":   { "given_name": "...", "family_name": "...", ... },
  "contact":    { "address": "...", "mobile": "...", ... },
  "education":  [{ "level": "bachelor", "institution": "...", ... }],
  "languages":  { "native": "Amharic", "foreign": [{ "language": "English", ... }] },
  "motivation": { "personal_statement": "..." }
}
```

### Components specific to the wizard
- `WizardSidebar` — section list with completion indicators
- `WizardTopBar` — sticky header with save state + Submit button
- `EducationBlock` — single education entry card with move/delete controls
- `LanguageBlock` — single language entry card with move/delete controls
- `DocumentUploadCard` — upload card with thumbnail preview + modal viewer
