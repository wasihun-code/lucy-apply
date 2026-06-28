# Lucy Apply — Visual and UX Audit Findings

This is a reference document based on the visual audit of 16 Lucy Apply screenshots
and 13 DreamApply reference screenshots conducted before sprint planning.
Use it to understand WHY changes are being made, not as a to-do list —
the sprint cards specify exactly what to implement.

---

## Critical Bugs (must fix, have specific sprint assignments)

### BUG-FE-001: Raw JSON error shown to users
**Sprint:** FE-06
**Location:** Application wizard, step 3 (Review & Submit)
**Symptom:** Error state displays `{"error":{"code":"CYCLE_CLOSED","message":"Admission cycle is archived"}}`
verbatim to the user.
**Fix:** Catch ApiError, display `e.message` in an `<Alert variant="danger">` component.

### BUG-FE-002: Navbar shows Login/Register when logged in
**Sprint:** FE-01
**Location:** All authenticated pages (screenshots 7–14 confirmed)
**Symptom:** PublicShell navbar does not adapt to auth state. Users see Login/Register
while already authenticated.
**Fix:** In PublicShell, call `getMe()` and conditionally render auth controls.

### BUG-FE-003: No application detail page for applicants
**Sprint:** FE-05
**Location:** Applicant dashboard
**Symptom:** Clicking an application card goes nowhere (or back to wizard, which is wrong
for submitted applications). Applicants cannot see what they submitted.
**Fix:** Build `/dashboard/applications/[id]/` — read-only post-submission view.

---

## Visual Inconsistencies (addressed progressively across sprints)

### Typography
- No deliberate type scale or font pairing
- "Name: Bruno / Email: applicant2@test.com" renders as plain label:value text
- Heading sizes visually identical across different levels of hierarchy
→ Fixed by FE-01 (Plus Jakarta Sans + Inter + type scale tokens)

### Color
- Single accent blue used for links, buttons, badges, nav — no semantic differentiation
- Status badges use 5 different visual patterns (pill, filled button, colored text, chip, none)
- No hover states visible on cards
→ Fixed by FE-01 (9-token semantic system) + per-sprint badge standardization

### Spacing
- University listing starts at page top with no breathing room
- "Browse Programs" button floats top-right on dashboard with no visual anchor
- Invite form sits raw below team table with no separation
→ Fixed by FE-01 (4px grid + layout shells) + per-sprint page layouts

### Navigation
- Portal uses floating tab buttons in page header (Applications | Programs | Team)
  — doesn't scale, inconsistent with admin sidebar pattern
- "Applicant Dashboard" button in portal header implies a context switch (confusing)
- No persistent university context indicator in the portal
→ Fixed by FE-07 (StaffShell with persistent sidebar)

### Buttons
- 5 different button treatments in production: blue filled, green filled, dark gray filled,
  red filled, yellow filled — added sprint by sprint without a system
- "Re-upload" shows as yellow filled button — feels like an error indicator
→ Fixed by FE-01 (4-variant button system)

### Cards
- University cards and program cards share the same minimal pattern but nothing else is consistent
- Application cards on dashboard: no visual status differentiation beyond a small text badge
- Program cards show fee without deadline or CTA context
→ Fixed by per-sprint card redesigns (FE-02, FE-03, FE-05)

### Forms
- Browser-default input styling — no focus ring, no validation UX
- Invite Staff form rendered inline below table with no card container or separation
- Application form textarea looks identical to single-line inputs
→ Fixed by FE-01 (form primitives) + per-sprint form redesigns

---

## UX Gaps (sprint assignments in parentheses)

### Discovery
- No cross-university program search — must click into a university first (FE-02)
- No degree-level or deadline filter on program listing (FE-02)
- No "Apply Now" CTA on university cards (FE-02)

### Application Flow
- No submission confirmation page (FE-06)
- No post-submission read-only application view (FE-05)
- Step indicator tabs — navigation behavior undefined (FE-06: make sequential-locked)

### Tracking
- No application status history/timeline for applicants (FE-16)
- No offer response UI beyond a backend endpoint (FE-05)
- Document status not visible on application detail (FE-05)

### Staff Workflow
- No application review detail page — clicking a row leads nowhere (FE-08)
- No document inline viewer (FE-08)
- Decision/reversal workflow has no UI (FE-08)
- Cycle management page missing (FE-09)
- Program create/edit forms missing (FE-09)

### Admin Workflow
- Platform stats page missing (FE-13)
- User management page missing (FE-12)
- Audit log page missing (FE-12)
- University onboarding form missing (FE-11)

---

## DreamApply Features Lucy Apply Should Have (backend-supported)

These exist in DreamApply and have full backend support in Lucy Apply.
The frontend work to expose them is assigned to specific sprints.

| Feature | Backend endpoint | Sprint |
|---|---|---|
| Application status timeline | GET /applications/{id}/history/ | FE-16 |
| Payment receipt page | GET /applications/{id}/payment/ | FE-15 |
| Applicant profile page | GET /applicants/me/ | FE-15 |
| Offer response UI | POST /applications/{id}/offer-response/ | FE-05 |
| University audit log | GET /universities/{id}/audit-log/ | FE-12 |
| Platform audit log | GET /admin/audit-log/ | FE-12 |
| Platform stats | GET /admin/stats/ | FE-13 |
| User management | GET /admin/users/ | FE-12 |
| Cycle close action | PATCH /admission-cycles/{id}/close/ | FE-09 |

---

## What Is Working Well (keep, do not replace)

- Route structure — well-organized, matches backend
- Application wizard 3-step flow concept — correct UX pattern, only needs visual polish
- Auth logic and JWT cookie handling — working correctly in Sprint 10+
- MFA pages — functional, built in Sprint 10 (minor redesign only in FE-14)
- Status badge taxonomy — correct statuses defined, only visual treatment needs replacement
- Admin sidebar navigation pattern — correct structure, only styling needed
- Auto-save "Saved" indicator on wizard — good UX, keep
