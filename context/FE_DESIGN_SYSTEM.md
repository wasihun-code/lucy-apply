# Lucy Apply — Frontend Design System Reference

This is the authoritative spec for all visual decisions.
Every component, page, and layout must derive from this document.
Do not invent values — if something is not here, ask before adding it.

---

## Color Tokens

Defined in `frontend/styles/globals.css` as CSS custom properties.
Mapped into Tailwind via `tailwind.config.ts`.

```css
:root {
  /* Primary */
  --color-primary:       #1B4FBF;
  --color-primary-dark:  #153D96;
  --color-primary-soft:  #EEF2FB;

  /* Semantic */
  --color-success:       #0F7B55;
  --color-warning:       #B45309;
  --color-danger:        #B91C1C;
  --color-neutral:       #6B7280;
  --color-accent:        #C8963A;  /* Gold — achievement moments ONLY */

  /* Surface */
  --color-background:    #F7F8FA;
  --color-surface:       #FFFFFF;
  --color-border:        #E2E6EC;

  /* Text */
  --color-text-900:      #0F1923;
  --color-text-600:      #4B5563;
  --color-text-400:      #9CA3AF;
}
```

Tailwind config mapping:
```ts
colors: {
  primary:    { DEFAULT: 'var(--color-primary)', dark: 'var(--color-primary-dark)', soft: 'var(--color-primary-soft)' },
  success:    'var(--color-success)',
  warning:    'var(--color-warning)',
  danger:     'var(--color-danger)',
  neutral:    'var(--color-neutral)',
  accent:     'var(--color-accent)',
  background: 'var(--color-background)',
  surface:    'var(--color-surface)',
  border:     'var(--color-border)',
  text: {
    900: 'var(--color-text-900)',
    600: 'var(--color-text-600)',
    400: 'var(--color-text-400)',
  },
}
```

**Accent color rule:** `--color-accent` (#C8963A gold) is used ONLY for:
- Admitted decision notices
- Accepted offer state
- Achievement/milestone indicators
Never use it for buttons, nav, or general UI elements.

---

## Typography

```ts
// tailwind.config.ts
fontFamily: {
  display: ['Plus Jakarta Sans', 'sans-serif'],
  body:    ['Inter', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
}
```

Font loading in `frontend/app/layout.tsx`:
```tsx
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'
const display = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' })
const body    = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body' })
const mono    = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-mono' })
```

Type scale (Tailwind text-* classes map to these sizes):
```
text-xs:   12px / leading-relaxed
text-sm:   14px / leading-relaxed
text-base: 16px / leading-relaxed
text-lg:   18px / leading-snug
text-xl:   20px / leading-snug
text-2xl:  24px / leading-tight
text-3xl:  30px / leading-tight
text-4xl:  36px / leading-none
text-5xl:  48px / leading-none
```

Heading classes to use consistently:
```
Page title (h1):    text-3xl font-display font-bold text-text-900
Section heading:    text-xl font-display font-semibold text-text-900
Card title:         text-base font-display font-semibold text-text-900
Label:              text-sm font-body font-medium text-text-600
Body:               text-sm font-body font-normal text-text-600
Caption/meta:       text-xs font-body font-normal text-text-400
```

---

## Spacing — 4px Grid

Use Tailwind spacing utilities. The grid is 4px.
Standard page padding: `px-4 sm:px-6 lg:px-8`
Standard section gap: `gap-6` (24px)
Standard card padding: `p-6` (24px)
Standard form field gap: `space-y-4` (16px)

---

## Border Radius

```
rounded-sm:   4px   — badges, chips, small pills
rounded:      8px   — inputs, small buttons, tags
rounded-lg:   12px  — cards, panels, larger containers
rounded-xl:   16px  — modals, sheets, large cards
rounded-full: 9999px — avatar circles, pill badges
```

---

## Shadows / Elevation

```
shadow-xs:  0 1px 2px rgba(0,0,0,0.05)    — input default
shadow-sm:  0 1px 3px rgba(0,0,0,0.08)    — card default
shadow-md:  0 4px 12px rgba(0,0,0,0.08)   — dropdown, popover
shadow-lg:  0 8px 24px rgba(0,0,0,0.10)   — modal
shadow-xl:  0 16px 48px rgba(0,0,0,0.12)  — drawer overlay
```

---

## Component Specifications

### Button

File: `frontend/components/ui/Button.tsx`

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode        // leading icon
  iconTrailing?: React.ReactNode // trailing icon
}
```

Styles per variant:
```
primary:   bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary
secondary: bg-surface text-text-900 border border-border hover:bg-background
danger:    bg-danger text-white hover:bg-red-700 focus-visible:ring-danger
ghost:     text-primary hover:bg-primary-soft
```

Sizes:
```
sm: h-8  px-3 text-xs rounded gap-1.5
md: h-10 px-4 text-sm rounded gap-2
lg: h-11 px-5 text-base rounded gap-2
```

All buttons: `inline-flex items-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`

### StatusBadge

File: `frontend/components/ui/StatusBadge.tsx`

All badges: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border`

Status → color mapping:
```
draft:        bg-neutral/10 text-neutral border-neutral/20
submitted:    bg-primary-soft text-primary border-primary/20
under_review: bg-warning/10 text-warning border-warning/20
admitted:     bg-accent/10 text-accent border-accent/20
rejected:     bg-danger/10 text-danger border-danger/20
waitlisted:   bg-neutral/10 text-neutral border-neutral/20
accepted:     bg-success/10 text-success border-success/20
declined:     bg-neutral/10 text-neutral border-neutral/20
active:       bg-success/10 text-success border-success/20
inactive:     bg-neutral/10 text-neutral border-neutral/20
published:    bg-success/10 text-success border-success/20
pending:      bg-warning/10 text-warning border-warning/20
archived:     bg-neutral/10 text-neutral border-neutral/20
```

### Card

File: `frontend/components/ui/Card.tsx`

```
Base:        bg-surface rounded-lg border border-border shadow-sm
Interactive: + cursor-pointer transition-shadow hover:shadow-md hover:border-primary/30
```

Use `<Card>` for all content groupings. Never use raw `div` with inline border/shadow.

### Input

File: `frontend/components/ui/Input.tsx`

```
bg-surface border border-border rounded h-10 px-3 text-sm text-text-900
placeholder:text-text-400
focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
transition-colors duration-150
error state: border-danger focus:ring-danger/20
```

### Select, Textarea — same base styles as Input

### FormField (wrapper for label + input + hint + error)

```tsx
<FormField label="Email" hint="We'll send your confirmation here" error={errors.email}>
  <Input ... />
</FormField>
```

### EmptyState

File: `frontend/components/shared/EmptyState.tsx`

```tsx
type EmptyStateProps = {
  icon: React.ReactNode
  heading: string
  description?: string
  action?: { label: string; onClick: () => void }
}
```

Layout: `flex flex-col items-center justify-center py-16 text-center`

Every list in the application that can be empty MUST use this component.

### Skeleton

File: `frontend/components/ui/Skeleton.tsx`

```tsx
// Base: animate-pulse bg-border rounded
<Skeleton className="h-4 w-32" />      // inline text
<Skeleton className="h-10 w-full" />   // input-sized
<SkeletonCard />                        // full card skeleton
<SkeletonRow />                         // table row skeleton
```

---

## Layout Shells

### PublicShell
File: `frontend/components/layout/PublicShell.tsx`

- Top navbar: logo left, nav links center-right, auth state right
- Auth state: if logged in → show user role indicator + "Go to Dashboard" button
- Content: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Footer: minimal (logo, copyright)

### ApplicantShell
File: `frontend/components/layout/ApplicantShell.tsx`

- Left sidebar (240px): "My Applications", "Browse Programs", "Profile / Settings"
- Top bar: university context (blank for applicants), user menu (name + avatar initial + logout)
- Content area: fills remaining width
- Mobile: sidebar becomes bottom sheet drawer

### StaffShell
File: `frontend/components/layout/StaffShell.tsx`

- Left sidebar (240px, collapsible):
  - University context header (university name + logo)
  - Nav items vary by role:
    - Officer: Applications, Programs (read-only)
    - Admin: Applications, Programs, Cycles, Team, Audit Log
  - Platform Admin: Universities, Users, Stats, Audit Log
- Top bar: breadcrumb path + user menu
- Mobile: sidebar becomes hamburger drawer

---

## Animation Guidelines

```
Color/border transitions: duration-150 ease-in-out
Shadow transitions:       duration-200 ease-out
Scale transforms:         duration-150 ease-out
Page-level:               No full-page transitions (too slow for workflow tools)
Skeleton shimmer:         animate-pulse (Tailwind built-in)
All animations:           Respect prefers-reduced-motion
```

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Responsive Breakpoints

```
sm:  640px   — tablet portrait
md:  768px   — tablet landscape
lg:  1024px  — laptop
xl:  1280px  — desktop
2xl: 1536px  — wide desktop
```

Sidebar: visible ≥ lg, drawer < lg
Tables: horizontal scroll < md
Card grids: 1-col mobile, 2-col sm, 3-col lg

---

## Accessibility Baseline

Every interactive element must have:
- `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Semantic HTML (`<button>`, `<a>`, `<nav>`, `<main>`, `<section>`)
- `aria-label` where the visual label is absent
- Sufficient color contrast (WCAG AA minimum: 4.5:1 for normal text)
- Touch targets ≥ 44×44px on mobile
