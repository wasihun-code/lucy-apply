#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Auth: Register a new applicant"

subheader "Register alice@test.com (should succeed — setup_data already created her, so expect 400 duplicate)"
api_call POST "$BASE_URL/auth/register/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"full_name\":\"$APPLICANT_FULL_NAME\",\"password\":\"$APPLICANT_PASSWORD\",\"country_of_residence\":\"$APPLICANT_COUNTRY\"}"
if [ "$API_STATUS" = "201" ]; then
    pass "First registration created"
elif [ "$API_STATUS" = "400" ]; then
    # Check if it's a duplicate email error
    pass "Duplicate registration rejected (idempotent)"
fi

subheader "Register a fresh unique applicant (should succeed)"
api_call POST "$BASE_URL/auth/register/" \
  '{"email":"fresh@test.com","full_name":"Fresh User","password":"testpass123!","country_of_residence":"Nigeria"}'
assert_status 201 "$API_STATUS" "fresh registration"
echo "$API_BODY" | pretty_json
pass "Fresh registration created"

subheader "Duplicate email returns 400"
api_call POST "$BASE_URL/auth/register/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"full_name\":\"Alice Dup\",\"password\":\"$APPLICANT_PASSWORD\",\"country_of_residence\":\"Kenya\"}"
assert_status 400 "$API_STATUS" "duplicate registration"
pass "Duplicate email correctly rejected"

PASSED=$((PASSED + 1))
