# Browser Manual QA Checklist

Run these tests manually in the browser — they require JavaScript rendering, file downloads, or visual verification.

---

## FE-16: Notifications & Status Timeline

- [ ] Log in as applicant, go to Dashboard
- [ ] Check sidebar for Notifications link with bell icon
- [ ] Click Notifications — should list `admitted`, `rejected`, `waitlisted`, `under_review` status changes for your apps
- [ ] Admitted notification has gold left border (`border-l-accent`)
- [ ] Flagged document notification has orange left border (`border-l-warning`)
- [ ] Click a notification → navigates to application detail
- [ ] On application detail page, scroll to Status Timeline
- [ ] Timeline shows: draft → submitted → under_review → decision
- [ ] Each entry has colored dot, status badge, date, and reason
- [ ] Empty state: `No status changes recorded yet`
- [ ] Unread badge (red `bg-danger`) appears on bell when new apps exist
- [ ] Desktop top bar shows bell + unread count

## Student Flow

- [ ] Open http://localhost:3000
- [ ] Click "Register" — fill form, submit
- [ ] Check console for verification email (EMAIL_BACKEND=console)
- [ ] Click verification link in console output
- [ ] Log in with registered credentials
- [ ] Browse programs — published programs visible
- [ ] Click "Apply" on a program
- [ ] Fill application form, save as draft
- [ ] Upload documents (transcript, passport, etc.)
- [ ] Submit application — fails until docs uploaded + payment
- [ ] Complete payment (Stripe test card: 4242 4242 4242 4242)
- [ ] Submit application again — succeeds
- [ ] Dashboard shows submitted application with correct status

## Staff Flow

- [ ] Log in as UniversityStaff
- [ ] Navigate to Review Queue (Applications link in nav)
- [ ] Filter applications by status, program, cycle
- [ ] Click an application to review
- [ ] Verify documents (click Verify button)
- [ ] Flag a document with reason
- [ ] Issue decision (admit / reject / waitlist)
- [ ] Decision button disabled when docs not all verified
- [ ] Reverse a decision (Admin only)
- [ ] View audit log

## Admin Flow

- [ ] Log in as PlatformAdmin
- [ ] Navigate to Admin area
- [ ] View universities list
- [ ] View stats dashboard
- [ ] View users list
- [ ] Deactivate a user

## Edge Cases

- [ ] **Deactivated user login** → shows "Account is deactivated"
- [ ] **Cross-tenant access** → other universities' data hidden
- [ ] **Accepted application** → status change blocked
- [ ] **Past deadline payment** → rejected with error
- [ ] **MFA verification** → staff must complete MFA before admin actions

## Sprint 11 Edge Cases (US-A-04, US-A-05, US-A-06, US-U-02)

- [ ] **US-A-04:** Two browser tabs editing same draft — last write wins (no data loss)
- [ ] **US-A-05:** Upload file > 10MB — shows "File exceeds the maximum size of 10MB"
- [ ] **US-A-05:** Re-upload flagged document — status resets from `flagged` to `pending`
- [ ] **US-A-06:** Abandon payment (close browser) — application remains in `draft`
- [ ] **US-U-02:** Submit after cycle closes — shows "The admission cycle is closed"
