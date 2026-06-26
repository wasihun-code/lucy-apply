#!/usr/bin/env bash
# ======================================================================
# env.sh — QA Regression Suite Configuration
# ======================================================================
# Edit BASE_URL and credentials for your environment.
# No runtime-generated values belong here.

export BASE_URL="${BASE_URL:-http://localhost:8000/api/v1}"
export QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_DIR="$(cd "$QA_DIR/.." && pwd)"

# ── Applicant (verified) ──────────────────────────────────────────────
export APPLICANT_EMAIL="alice@test.com"
export APPLICANT_PASSWORD="testpass123!"
export APPLICANT_FULL_NAME="Alice Test"
export APPLICANT_COUNTRY="Kenya"

# ── Applicant (unverified) ────────────────────────────────────────────
export BOB_EMAIL="bob@test.com"
export BOB_PASSWORD="testpass123!"
export BOB_FULL_NAME="Bob Test"
export BOB_COUNTRY="Ghana"

# ── Platform Admin ────────────────────────────────────────────────────
export ADMIN_EMAIL="admin@lucyapply.com"
export ADMIN_PASSWORD="adminpass123!"
export ADMIN_FULL_NAME="Platform Admin"

# ── University Staff (University A — admin) ───────────────────────────
export STAFF_EMAIL="staffadmin@univ.com"
export STAFF_PASSWORD="staffpass123!"
export STAFF_FULL_NAME="Staff Admin"

# ── University Staff (University B — admin) ───────────────────────────
export STAFF2_EMAIL="staff2@otheruniv.com"
export STAFF2_PASSWORD="staffpass123!"
export STAFF2_FULL_NAME="Other Staff"

# ── New staff invite ──────────────────────────────────────────────────
export NEW_STAFF_EMAIL="newofficer@univ.com"
export NEW_STAFF_FULL_NAME="New Officer"
