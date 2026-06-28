# Lucy Apply — Frontend Architecture Reference

---

## Stack (locked)

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS v3 (utility-first, design tokens via CSS custom properties) |
| Icons | lucide-react (only) |
| Fonts | next/font/google — Plus Jakarta Sans, Inter, JetBrains Mono |
| State | React useState/useReducer (local), no global state library needed for MVP |
| Data fetching | Custom typed wrapper in lib/api.ts (Server Components for public pages, client fetch for authenticated) |
| Auth | httpOnly cookies via Next.js proxy route /api/auth/login/ → Django JWT |
| Deployment | Cloud Run (Next.js standalone output) |

---

## Directory Structure

```
frontend/
  app/
    layout.tsx                      ← Root layout: fonts, global CSS, metadata
    page.tsx                        ← Landing page (PublicShell, SSR)
    not-found.tsx                   ← 404 page
    error.tsx                       ← Global error boundary
    universities/
      page.tsx                      ← University listing (SSR)
      [id]/
        page.tsx                    ← University detail (SSR)
        programs/
          [programId]/
            page.tsx                ← Program detail (SSR)
    (auth)/
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx       ← ?token=... query param
      verify-email/page.tsx         ← ?token=... query param
      mfa/
        setup/page.tsx
        verify/page.tsx
    dashboard/                      ← ApplicantShell
      page.tsx                      ← Applicant dashboard
      applications/
        [id]/page.tsx               ← Application detail (post-submission)
      apply/
        [programId]/page.tsx        ← Application wizard
    portal/                         ← StaffShell
      applications/
        page.tsx                    ← Review queue
        [id]/page.tsx               ← Application review detail
      programs/
        page.tsx                    ← Programs list
        new/page.tsx                ← Create program
        [id]/
          edit/page.tsx             ← Edit program
          cycles/page.tsx           ← Cycle management
      team/page.tsx                 ← Team management
    admin/                          ← StaffShell (PlatformAdmin variant)
      universities/
        page.tsx                    ← All universities list
        new/page.tsx                ← Onboard university
        [id]/page.tsx               ← University detail / edit
      users/page.tsx                ← User management
      audit-log/page.tsx            ← Platform audit log
      stats/page.tsx                ← Platform stats dashboard
    api/
      auth/
        login/route.ts              ← Next.js proxy: sets httpOnly JWT cookies
        logout/route.ts             ← Clears cookies
        refresh/route.ts            ← Token refresh proxy
  components/
    ui/                             ← Design system primitives
      Button.tsx
      Badge.tsx                     ← Generic badge (color prop)
      StatusBadge.tsx               ← Application/document status badge
      Card.tsx
      Input.tsx
      Select.tsx
      Textarea.tsx
      FormField.tsx                 ← label + input + hint + error wrapper
      Skeleton.tsx                  ← Skeleton loaders
      Modal.tsx                     ← Dialog/modal primitive
      Drawer.tsx                    ← Slide-over drawer
      Tabs.tsx                      ← Tab navigation primitive
      Table.tsx                     ← Base table with sorting support
      Pagination.tsx
      Alert.tsx                     ← Info/success/warning/error alert banner
      Spinner.tsx                   ← Small inline spinner
      Tooltip.tsx
    layout/
      PublicShell.tsx
      ApplicantShell.tsx
      StaffShell.tsx
      Sidebar.tsx                   ← Shared sidebar primitive (used by Applicant + Staff shells)
      Navbar.tsx                    ← Public top navbar
      UserMenu.tsx                  ← Avatar dropdown (name, role, logout)
    shared/
      EmptyState.tsx                ← Icon + heading + optional CTA
      ErrorState.tsx                ← Error display (never raw JSON)
      PageHeader.tsx                ← Page title + breadcrumb + optional action button
      UniversityCard.tsx
      ProgramCard.tsx
      ApplicationCard.tsx
      DocumentChecklist.tsx
      StepIndicator.tsx             ← Multi-step wizard progress
  lib/
    api.ts                          ← Typed fetch wrapper
    auth.ts                         ← Token helpers, role utilities
    utils.ts                        ← cn(), formatDate(), formatCurrency()
  styles/
    globals.css                     ← CSS custom properties (design tokens) + Tailwind base
  middleware.ts                     ← Route protection
  tailwind.config.ts                ← Token mapping
  next.config.js
```

---

## API Integration Pattern

### lib/api.ts — typed fetch wrapper

All API calls go through this. Never write raw fetch() in pages or components.

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export async function api<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    ...options,
    credentials: 'include',                 // sends httpOnly cookies
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.detail ?? body?.message ?? 'An error occurred', body)
  }
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
}
```

### Error handling pattern in components

```tsx
const [error, setError] = useState<string | null>(null)
try {
  const data = await api<Application>(`/applications/${id}/`)
} catch (e) {
  if (e instanceof ApiError) {
    setError(e.message)   // human-readable from API
  } else {
    setError('Something went wrong. Please try again.')
  }
}
// In JSX:
{error && <Alert variant="danger">{error}</Alert>}
```

Never: `setError(JSON.stringify(e))` — this is the bug currently in production.

---

## Auth Pattern

### Reading auth state

```ts
// lib/auth.ts
export async function getMe(): Promise<AuthUser | null> {
  try {
    return await api<AuthUser>('/auth/me/')
  } catch {
    return null
  }
}

export type AuthUser = {
  id: string
  email: string
  full_name: string
  role: 'applicant' | 'university_staff' | 'platform_admin'
  permission_level?: 'officer' | 'admin'   // staff only
  university_id?: string                    // staff only
  mfa_enabled: boolean
  mfa_verified: boolean
}
```

### Middleware route protection

```ts
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/portal') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/admin') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

---

## Backend API Reference (key endpoints for frontend)

Base: `GET /api/v1/`

Auth:
- `POST /auth/login/` → tokens
- `POST /auth/register/` → applicant
- `POST /auth/me/` (GET) → AuthUser
- `POST /auth/logout/`
- `POST /auth/forgot-password/`
- `POST /auth/reset-password/`
- `POST /auth/mfa/setup/`
- `POST /auth/mfa/verify/`

Public:
- `GET /universities/` → list active
- `GET /universities/{id}/`
- `GET /programs/` → list published (filterable: ?degree_level=&university=)
- `GET /programs/{id}/`
- `GET /programs/{id}/cycles/`

Applicant:
- `GET /applicants/me/`
- `GET /applicants/me/applications/`
- `POST /applications/`
- `GET /applications/{id}/`
- `PATCH /applications/{id}/`
- `POST /applications/{id}/documents/upload-url/`
- `POST /applications/{id}/documents/`
- `POST /applications/{id}/payment-intent/`
- `POST /applications/{id}/submit/`
- `GET /applications/{id}/history/`
- `POST /applications/{id}/offer-response/`
- `GET /applications/{id}/payment/`

Staff:
- `GET /universities/{id}/applications/` → review queue
- `GET /applications/{id}/`
- `PATCH /applications/{id}/status/` → decide/reverse
- `PATCH /documents/{id}/verify/`
- `PATCH /documents/{id}/flag/`
- `GET /universities/{id}/programs/`
- `POST /universities/{id}/programs/`
- `PATCH /programs/{id}/`
- `GET /programs/{id}/cycles/`
- `POST /programs/{id}/cycles/`
- `PATCH /admission-cycles/{id}/close/`
- `GET /universities/{id}/staff/`
- `POST /universities/{id}/staff/`
- `DELETE /universities/{id}/staff/{staff_id}/`
- `GET /universities/{id}/audit-log/`

Admin:
- `GET /admin/universities/`
- `POST /universities/`
- `GET /admin/stats/`
- `GET /admin/users/`
- `PATCH /admin/users/{id}/status/`
- `GET /admin/audit-log/`

---

## Application Wizard — File Structure

The wizard uses its own layout, separate from ApplicantShell.

```
frontend/app/dashboard/apply/[programId]/
  layout.tsx                  ← Wizard shell (top bar + sidebar + content area)
  page.tsx                    ← Section router (reads ?section= from URL)
  confirmation/
    page.tsx                  ← Post-submission confirmation page

frontend/components/shared/
  WizardSidebar.tsx           ← Section list with completion state indicators
  WizardTopBar.tsx            ← Sticky header: program name + save state + Submit
  EducationBlock.tsx          ← Single education entry (move/delete controls)
  LanguageBlock.tsx           ← Single language entry (move/delete controls)
  DocumentUploadCard.tsx      ← Upload card with thumbnail + modal viewer
```

## Wizard URL Pattern

```
/dashboard/apply/{programId}?section=personal
/dashboard/apply/{programId}?section=contact
/dashboard/apply/{programId}?section=education
/dashboard/apply/{programId}?section=languages
/dashboard/apply/{programId}?section=motivation
/dashboard/apply/{programId}?section=documents
/dashboard/apply/{programId}?section=checklist
```

Section IDs (canonical): `personal | contact | education | languages | motivation | documents | checklist`

## form_data Schema

All wizard sections stored in a single `form_data` JSONField on the Application model.
Structure used by the frontend (all keys optional at save time, required at submit):

```ts
type FormData = {
  personal?: {
    given_name: string
    middle_name?: string
    family_name: string
    gender: string
    citizenship: string
    country_of_residence: string
    date_of_birth: string       // ISO date string
    place_of_birth?: string
    passport_number?: string
    nationality?: string
  }
  contact?: {
    street_address: string
    city: string
    postal_code: string
    country: string
    mobile_country_code: string
    mobile_number: string
  }
  education?: Array<{
    level: string
    institution: string
    country: string
    programme?: string
    study_language?: string
    awarded_qualification?: string
    expected_graduation?: string  // YYYY-MM
  }>
  languages?: {
    native: string
    foreign: Array<{
      language: string
      proof?: string
      proficiency: string
      score?: string
      years_experience?: number
    }>
  }
  motivation?: {
    personal_statement: string
  }
}
```

Documents are stored separately as `ApplicationDocument` records (not in form_data).

## Auto-Save Pattern

```tsx
// In wizard page component
const [isDirty, setIsDirty] = useState(false)
const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')

// Debounced auto-save
const debouncedSave = useMemo(
  () => debounce(async (data: FormData) => {
    setSaveState('saving')
    try {
      await api(`/applications/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ form_data: data }),
      })
      setSaveState('saved')
      setIsDirty(false)
    } catch {
      setSaveState('unsaved')
    }
  }, 2000),
  [id]
)

// Call on any field change
useEffect(() => {
  if (isDirty) debouncedSave(formData)
}, [formData, isDirty])
```
