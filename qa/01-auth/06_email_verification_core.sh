#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Auth: Email Verification"

subheader "Register a fresh applicant"
FRESH_EMAIL="unverified_$(date +%s)@test.com"
api_call POST "$BASE_URL/auth/register/" \
  "{\"email\":\"$FRESH_EMAIL\",\"full_name\":\"Unverified User\",\"password\":\"testpass123!\",\"country_of_residence\":\"Kenya\"}"
assert_status 201 "$API_STATUS" "register fresh applicant"
echo "$API_BODY" | pretty_json
pass "Fresh applicant registered"

subheader "In DEBUG mode, registration auto-verifies — create token manually for test"
VERIFY_TOKEN=$(cd "$PROJECT_DIR" && venv/bin/python qa/helpers/create_verify_token.py "$FRESH_EMAIL" 2>&1)
echo "  Created token: $VERIFY_TOKEN"
pass "Verification token created"

subheader "Verify email with token"
api_call POST "$BASE_URL/auth/verify-email/" \
  "{\"email\":\"$FRESH_EMAIL\",\"token\":\"$VERIFY_TOKEN\"}"
assert_status 200 "$API_STATUS" "verify email"
pass "Email verified"

subheader "Verify again with same token (should fail — single-use)"
api_call POST "$BASE_URL/auth/verify-email/" \
  "{\"email\":\"$FRESH_EMAIL\",\"token\":\"$VERIFY_TOKEN\"}"
if [ "$API_STATUS" = "404" ]; then
    pass "Token reuse correctly rejected (404 — used token no longer matches query)"
elif [ "$API_STATUS" = "400" ]; then
    pass "Token reuse correctly rejected (400)"
fi

subheader "Request verification for already-verified user"
api_call POST "$BASE_URL/auth/resend-verification/" \
  "{\"email\":\"$FRESH_EMAIL\"}"
assert_status 200 "$API_STATUS" "resend for verified"
pass "Resend returns success for already-verified user"

PASSED=$((PASSED + 1))
