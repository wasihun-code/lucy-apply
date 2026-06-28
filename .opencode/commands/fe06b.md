# /fe06b — Application Wizard: Section-Based Navigation

## Context

This sprint replaces the 3-step linear wizard defined in FE-06 with a section-based
wizard pattern. FE-06 should NOT be run — this sprint supersedes it entirely.

The core insight from studying real admissions platforms: a single long application
form is better represented as named sections the applicant can freely navigate,
rather than locked sequential steps. This reduces anxiety (applicants can see the
full scope upfront), enables partial saves without losing progress, and lets
applicants return to earlier sections without losing later work.

The backend data model does not change — `form_data` remains a JSONField on
Application. Only the frontend structure changes.

---

## What you are building

A section-based application wizard with:
- Persistent left sidebar listing all sections
- Each section is a self-contained form panel
- Free navigation between sections at any time
- Persistent "Save" and "Submit" actions in the header
- Completion indicators per section
- Document section with inline file previews
- Application checklist section

---

## Deliverables

### 1. Wizard Shell Layout

`frontend/app/dashboard/apply/[programId]/layout.tsx`

This layout wraps all wizard sections. It does NOT use `ApplicantShell` — it has its
own self-contained layout since the wizard is a focused task.

```
┌─────────────────────────────────────────────────────────┐
│  ← Dashboard   Program Name · University Name    [Save] [Submit] │  ← Top bar
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│  Section Nav  │  Section Content                        │
│  (sidebar)    │                                         │
│               │                                         │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

**Top bar:**
- Left: "← Dashboard" link + program name + university name
- Right: Auto-save indicator + `<Button variant="secondary">Save</Button>` + `<Button variant="primary">Submit</Button>`
- Auto-save indicator: "Saved" (green badge) or "Saving..." (spinner) or "Unsaved changes" (yellow)
- Sticky, `bg-surface border-b border-border z-10`

**Left sidebar (220px, not collapsible in wizard context):**
- List of section links with completion indicators
- Active section: `bg-primary-soft text-primary font-medium border-r-2 border-primary`
- Completed section: `text-success` with `<CheckCircle size={14}>` icon
- Incomplete required section: normal style
- Section with errors: `text-danger` with `<AlertCircle size={14}>` icon
- On mobile: sidebar becomes a horizontal scrollable tab strip at top

**Content area:**
- `max-w-2xl` — not full width, forms read better in a constrained column
- `py-8 px-6`

### 2. Section Navigation State

`frontend/app/dashboard/apply/[programId]/page.tsx` (or a client component)

Track:
- `currentSection: string` — which section is active (from URL: `?section=profile`)
- `completedSections: Set<string>` — sections where all required fields are filled
- `savedData: Record<string, unknown>` — current form data per section
- `isDirty: boolean` — unsaved changes exist
- `isSaving: boolean` — save in progress

Section list (ordered, matches sidebar):
```ts
const SECTIONS = [
  { id: 'personal',   label: 'Personal Information', required: true },
  { id: 'contact',    label: 'Contact Details',       required: true },
  { id: 'education',  label: 'Education',             required: true },
  { id: 'languages',  label: 'Languages',             required: false },
  { id: 'motivation', label: 'Motivation',            required: false },
  { id: 'documents',  label: 'Documents',             required: true },
  { id: 'checklist',  label: 'Checklist',             required: false },
]
```

URL pattern: `/dashboard/apply/{programId}?section=personal`
Default on first load: `?section=personal`

Navigation between sections: update URL query param, scroll to top.
Previous/Next nav buttons at bottom of each section panel.

### 3. Section: Personal Information

Fields (two-column grid on md+, single column on mobile):

Left column:
- Given Name * `<Input>`
- Middle Name `<Input>` (optional)
- Family Name * `<Input>`
- Gender * `<Select>` — Male | Female | Other | Prefer not to say
- Citizenship * `<Input>` (country)
- Country of Residence * `<Input>`

Right column:
- Date of Birth * `<Input type="date">`
- Place of Birth `<Input>`
- Passport Number `<Input>` hint: "As shown on your passport"
- Nationality `<Input>`

Section note (above form):
`<Alert variant="info">Please enter your name exactly as it appears on your passport.</Alert>`

Completion check: Given Name, Family Name, Gender, Citizenship, Country of Residence, Date of Birth are all filled.

### 4. Section: Contact Details

Two-column layout:

Left column — Email:
- Email address (read-only, shown from account) with verified indicator `<CheckCircle text-success>`
- "Change email" ghost link → `/dashboard/profile`

Left column — Address:
- Street Address * `<Input>`
- City / Town * `<Input>`
- Postal Code * `<Input>`
- Country * `<Select>` (country list)

Right column — Phone:
- Country code `<Select>` (e.g. +91, +251) — narrow, inline with number
- Mobile number `<Input type="tel">` — with green checkmark when valid format

### 5. Section: Education

**Dynamic block pattern** — applicant can add multiple education entries.

Each education block is a card with:
- Top action bar: `[↑ Move up] [↓ Move down] [🗑 Delete]` (small ghost buttons, right-aligned)
- Fields inside (two-column):
  - Level of education * `<Select>` — Secondary | Bachelor's | Master's | Doctorate | Other
  - Expected graduation * `<Input type="month">` (YYYY-MM format)
  - Institution name * `<Input>`
  - Country * `<Select>`
  - Programme name `<Input>`
  - Study language `<Select>`
  - Awarded qualification `<Input>`

Below the last block:
`<Button variant="secondary" size="sm" icon={<Plus>}>Add education entry</Button>`

Each block is independently saveable. Blocks stored as array in `form_data.education`.

Completion check: at least one education block with required fields filled.

### 6. Section: Languages

**Dynamic block pattern** — same approach as Education.

Section intro text:
"Please describe your foreign language skills. If you have taken any relevant tests,
list the tests and associated scores."

Top field (not in a block):
- Native language * `<Select>` (language list)

Each language block:
- Top action bar: `[↑ Move up] [↓ Move down] [🗑 Delete]`
- Fields (two-column):
  - Foreign language * `<Select>`
  - Proof (certificate/test/exam) `<Select>` — None | IELTS | TOEFL | Cambridge | Other
  - Proficiency * `<Select>` — A1 | A2 | B1 | B2 | C1 | C2
  - Score `<Input>` (shown only if Proof is not "None")
  - Years of study/experience `<Input type="number">` + "years" label

`<Button variant="secondary" size="sm" icon={<Plus>}>Add language</Button>`

Stored as `form_data.languages` array.

### 7. Section: Motivation

Single textarea section:

Section intro:
"Please provide a personal statement explaining your motivation for applying to this
program and how it relates to your academic background and career goals."

- Personal Statement `<Textarea rows={10} maxLength={3000}>`
  Character count: `{charCount}/3000` displayed below, color changes to `text-warning` at 2700+

Stored as `form_data.motivation`.

### 8. Section: Documents

This section replaces the Step 2 document upload from the old FE-06.

Section intro:
"Please upload the required documents for this application. Accepted formats: PDF, JPG, PNG, DOC, DOCX. Maximum 10MB per file."

**Document list with inline previews:**

Each required document as a `<Card padding="md">`:

```
┌──────────────────────────────────────────────────┐
│ [thumbnail]  Document Type Label    [StatusBadge] │
│              {file name if uploaded}              │
│              {file size} · {upload date}          │
│                                                   │
│ [If uploaded: thumbnail preview of first page]    │
│                                                   │
│ [Upload File]  or  [Re-upload]   [View] button   │
│                                                   │
│ If flagged: ⚠ Flagged reason text in red         │
└──────────────────────────────────────────────────┘
```

**Thumbnail preview:** When a PDF is uploaded, show a small visual thumbnail
(80×100px). Use the GCS signed URL to create an `<img>` tag for image files,
or show a PDF icon with page count for PDFs. This is a visual indicator only —
clicking "View" opens the file in a new tab via signed URL.

**Upload interaction:**
1. Click "Upload File" → hidden `<input type="file">` opens
2. File selected → show file name + size + "Uploading..." spinner
3. On success → thumbnail appears, status → pending, "Re-upload" button shown
4. File > 10MB → `<Alert variant="danger">` inline, no upload attempt

**Document modal (click "View"):**
Opens a `<Modal>` with the file displayed:
- PDF: `<iframe src={signedUrl} className="w-full h-[70vh]" />`
- Image: `<img src={signedUrl} className="max-w-full" />`
- Other: "Download" link button

This gives officers and applicants an inline document viewer without leaving the page.

### 9. Section: Checklist

Read-only summary section. Shows the completion status of all sections and documents.

Section intro:
"Review your application before submitting. All required items must be complete."

**Section completion checklist:**
Each section as a row with:
- `<CheckCircle text-success>` if complete
- `<AlertTriangle text-warning>` if incomplete but optional
- `<XCircle text-danger>` if incomplete and required
- Section name + status label ("Complete" / "Incomplete" / "Needs attention")
- Clicking a row navigates to that section

**Document checklist:**
Same pattern — one row per required document with status.

**Submission readiness banner:**
- All required complete: `<Alert variant="success">Your application is ready to submit.</Alert>`
- Some required incomplete: `<Alert variant="danger">Please complete all required sections before submitting.</Alert>`

**Submit button** (full-width, prominent, only on checklist section):
```
<Button variant="primary" size="lg" className="w-full mt-6"
  disabled={!isReadyToSubmit}
  loading={isSubmitting}
>
  Pay {formatCurrency(fee)} & Submit Application
</Button>
```

Clicking: opens a confirmation modal, then calls payment intent → submit flow.

### 10. Save Behavior

Auto-save: debounced 2000ms after any field change.
API: `PATCH /api/v1/applications/{id}/` with `{ form_data: currentFormData }`
`form_data` is the entire merged object — all sections combined.

Manual save: "Save" button in top bar — immediate save, shows "Saving..." → "Saved".

On navigate away (link click outside wizard): check `isDirty`. If true, show browser
`beforeunload` warning or a modal: "You have unsaved changes. Save before leaving?"

### 11. Submission Flow (same as FE-06, now triggered from Checklist section)

1. Click "Pay & Submit" in Checklist section
2. Confirmation modal: "Submit your application to {program}? This will charge {fee}."
3. On confirm: `POST /applications/{id}/payment-intent/` → get client_secret
4. Process payment (mock in dev)
5. `POST /applications/{id}/submit/`
6. On success: redirect to `/dashboard/apply/{programId}/confirmation`

Error handling: exact same error code → human message mapping as FE-06.
CYCLE_CLOSED, MISSING_DOCS, PAYMENT_REQUIRED all have human-readable messages.
No raw JSON ever shown.

### 12. Confirmation Page (same as FE-06)

`frontend/app/dashboard/apply/[programId]/confirmation/page.tsx`
No changes from FE-06 spec.

---

## Mobile Behavior

On screens < 768px:
- Left sidebar becomes a horizontal scrollable tab strip pinned below the top bar
- Each tab: short label only (Personal, Contact, Education, etc.)
- Active tab: underline + primary color
- Content: full width below tabs
- Two-column form grids become single column

---

## Files to create or modify

| File | Action |
|---|---|
| `frontend/app/dashboard/apply/[programId]/layout.tsx` | Create (wizard shell) |
| `frontend/app/dashboard/apply/[programId]/page.tsx` | Rewrite (section router) |
| `frontend/app/dashboard/apply/[programId]/confirmation/page.tsx` | Create |
| `frontend/components/shared/WizardSidebar.tsx` | Create |
| `frontend/components/shared/WizardTopBar.tsx` | Create |
| `frontend/components/shared/EducationBlock.tsx` | Create (dynamic block) |
| `frontend/components/shared/LanguageBlock.tsx` | Create (dynamic block) |
| `frontend/components/shared/DocumentUploadCard.tsx` | Create |

Note: `StepIndicator.tsx` from FE-06 spec is NOT needed — remove that deliverable.

---

## Done when

- [ ] Wizard top bar shows program name, save indicator, Save + Submit buttons
- [ ] Left sidebar lists all sections with completion indicators
- [ ] Clicking a section in sidebar updates URL and shows that section's form
- [ ] Personal Information section: all fields, two-column layout, completion check
- [ ] Contact Details section: read-only email, address, phone with country code
- [ ] Education section: dynamic blocks with Move up/Move down/Delete
- [ ] At least one education block required for completion
- [ ] Languages section: native language + dynamic foreign language blocks
- [ ] Motivation section: textarea with character count
- [ ] Documents section: upload cards with thumbnail previews
- [ ] Document "View" button opens inline modal viewer
- [ ] File > 10MB shows error inline, no upload attempt
- [ ] Checklist section shows all section + document completion statuses
- [ ] Submit button disabled when required sections incomplete
- [ ] Submission flow: confirmation modal → payment → success redirect
- [ ] No raw JSON in any error state
- [ ] Auto-save fires after 2s inactivity
- [ ] Mobile: sidebar becomes horizontal tab strip
- [ ] `next build` passes, `tsc --noEmit` passes
- [ ] `@fe-review` zero CRITICAL

## QA Checklist

```
[ ] Wizard loads at ?section=personal by default
[ ] Clicking sidebar section navigates to that section
[ ] Active section highlighted in sidebar
[ ] Completed section shows checkmark in sidebar
[ ] Personal section: required field validation before marking complete
[ ] Two-column layout on desktop, single on mobile
[ ] Education: Add button adds a new block
[ ] Education: Move up/down reorders blocks
[ ] Education: Delete removes block (with confirmation if block has data)
[ ] Languages: native language select works
[ ] Languages: Add language block works
[ ] Motivation: character count shows and turns warning color at 2700
[ ] Documents: Upload button opens file picker
[ ] Documents: File > 10MB → inline error, no upload
[ ] Documents: Successful upload shows thumbnail/icon + status badge
[ ] Documents: "View" button opens modal with file
[ ] Documents: PDF shows in iframe modal
[ ] Checklist: all sections listed with correct status icons
[ ] Checklist: incomplete required section shows X icon
[ ] Submit button disabled when required incomplete
[ ] Submit button enabled when all required complete
[ ] Submit → confirmation modal → payment → success page
[ ] CYCLE_CLOSED error shows human message, not JSON
[ ] Auto-save fires after typing and pausing
[ ] "Save" button shows "Saving..." then "Saved"
[ ] 375px mobile: tabs strip visible, content full width, forms single column
```
