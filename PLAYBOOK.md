# Lucy Apply — Frontend Revamp Playbook

How to use OpenCode to execute the frontend revamp sprint by sprint.
Read this before starting FE-01.

---

## What's in this package

```
lucy-apply-fe-opencode/
  AGENTS.md                       ← Standing brief, loaded in EVERY OpenCode session
  PLAYBOOK.md                     ← This file
  opencode.json                   ← OpenCode config: agents, instructions
  context/
    FE_DESIGN_SYSTEM.md           ← Complete design token and component spec
    FE_ARCHITECTURE.md            ← Frontend stack, file structure, API integration
    FE_AUDIT.md                   ← Visual and UX audit findings (reference only)
  .opencode/
    agents/
      fe-review.md                ← @fe-review — frontend code review subagent
      visual-check.md             ← @visual-check — design system compliance check
    commands/
      fe01.md → fe16.md           ← /fe01 through /fe16 sprint commands
```

---

## One-Time Setup

```bash
# From your lucy-apply repo root:
cp -r lucy-apply-fe-opencode/. .
git add AGENTS.md PLAYBOOK.md opencode.json context/ .opencode/
git commit -m "chore: add frontend revamp opencode package"
```

Then in OpenCode:
```
opencode
> /init
```

---

## The Playbook — How to Work Through Each Sprint

### Rule 1: Plan before Build

OpenCode has two primary modes. Press **Tab** to switch.

**Every sprint starts in Plan mode:**
```
[Tab → Plan mode]
/fe01
```

The agent reads the sprint card, inspects the existing frontend files, and proposes
exactly what it will change. Review the plan. Ask questions. Only when satisfied:

```
[Tab → Build mode]
Go ahead and implement the plan.
```

FE-01 is the most critical sprint. The design token system it creates is the foundation
everything else depends on. Spend extra time reviewing the plan before building.

### Rule 2: One sprint at a time

Do not load multiple sprint cards in one session. Each card is the complete scope.

### Rule 3: @fe-review after every sprint

```
@fe-review please review the changes in this sprint
```

Fix everything rated CRITICAL or HIGH before advancing. The most common issues:
- Hardcoded hex color instead of design token
- Button variant that isn't in the design system
- Missing empty state on a list component
- Missing skeleton loader on an async fetch
- Raw JSON surfaced in an error state

### Rule 4: Run build checks before closing every sprint

```bash
cd frontend
npx tsc --noEmit     # zero TypeScript errors required
next build            # must succeed
```

If either fails, the sprint is not done.

### Rule 5: Don't touch backend files

The frontend revamp is frontend-only. The backend is complete and tested (254 pytest
tests passing, 34 QA scripts passing). Never modify Django files during these sprints.

### Rule 6: Commit at logical increments

Suggested commit points within a sprint:
1. After design tokens / global CSS
2. After layout shell components
3. After each page or feature section
4. After all tests pass

---

## Working with Context Files

OpenCode loads all three context files automatically via `opencode.json`. Reference
them explicitly when the agent seems to be guessing:

```
Stop. Read context/FE_DESIGN_SYSTEM.md and confirm the exact color token names
before writing any Tailwind classes.
```

---

## Using the Subagents

### @fe-review — use after every sprint
```
@fe-review review the dashboard page for design system compliance and accessibility
```

### @visual-check — use when a page feels off
```
@visual-check check the university card component against the design system spec
```

---

## Common Pitfalls to Avoid

### 1. Hardcoded hex values
The agent may write `text-[#1B4FBF]` or `bg-[#0F7B55]`. Stop it.
All colors must come from Tailwind config tokens, not arbitrary values.
Correct: `text-primary`, `bg-success`.

### 2. Wrong shell for a page
The applicant dashboard must use `ApplicantShell`, not `PublicShell`.
The staff portal must use `StaffShell`. If the agent puts a page in the wrong shell,
the navigation will be inconsistent.

### 3. Raw fetch() calls in components
All API calls go through `lib/api.ts`. If the agent writes `fetch('/api/v1/...')` 
directly in a component, reject it. The typed wrapper handles auth headers, error
normalization, and base URL.

### 4. Missing error handling
Every `api.ts` call that can fail must have a catch block that sets a user-readable
error state. Never let `JSON.stringify(error)` reach the DOM.

### 5. Skipping empty states
If the agent renders an empty list as just nothing (no component, no message), reject
it. Every list must have a designed empty state.

### 6. Using non-lucide icons
The agent may suggest importing from `react-icons`, `heroicons`, or other libraries.
Reject. `lucide-react` only.

---

## Milestone Checkpoints

| After Sprint | Checkpoint | Manual test |
|---|---|---|
| FE-01 | Design system live | Open any page — does it look different? Token system in place? |
| FE-04 | Auth complete | Can register, login, reset password, verify email end-to-end? |
| FE-06 | Full applicant flow | Can apply end-to-end: browse → apply → pay → track? |
| FE-10 | All portal pages | Can officer review and decision an application? |
| FE-13 | Admin complete | Can platform admin onboard a university? |
| FE-16 | Full revamp done | Does the product feel like a cohesive SaaS? |

---

## Sprint-to-Milestone Mapping

| Sprints | Milestone |
|---|---|
| FE-01 to FE-04 | Foundation: design system + public pages + auth |
| FE-05 to FE-06 | Applicant experience complete |
| FE-07 to FE-10 | Staff portal complete |
| FE-11 to FE-13 | Admin portal complete |
| FE-14 to FE-16 | Polish: MFA, profile, timeline, notifications |

---

## Important Sprint Note: FE-06 → FE-06b

**Do not run `/fe06`.** It has been superseded by `/fe06b`.

`/fe06b` implements a section-based wizard (freely navigable sections with a sidebar)
rather than the locked 3-step flow described in `/fe06`. The section-based pattern
better matches real admissions platform UX.

The sprint order is:
```
FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06b → FE-07 → ... → FE-16
```

`/fe06` exists in the commands folder for reference only. Do not run it.
