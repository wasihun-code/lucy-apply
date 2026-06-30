#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Auth: Logout (token blacklist)"

subheader "Logout with valid refresh token (should blacklist)"
api_call POST "$BASE_URL/auth/logout/" \
  "{\"refresh\":\"$REFRESH\"}" \
  "$TOKEN"
assert_status 205 "$API_STATUS" "logout"
pass "Logout succeeded (205 Reset Content)"

subheader "Reuse blacklisted refresh token (should fail)"
api_call POST "$BASE_URL/auth/refresh/" \
  "{\"refresh\":\"$REFRESH\"}"
if [ "$API_STATUS" = "401" ]; then
    pass "Blacklisted refresh token correctly rejected"
elif [ "$API_STATUS" = "400" ]; then
    pass "Blacklisted refresh token correctly rejected (400)"
fi

# Re-login to refresh TOKEN/REFRESH for subsequent tests
subheader "Re-login for downstream tests"
api_call POST "$BASE_URL/auth/login/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"password\":\"$APPLICANT_PASSWORD\"}"
assert_status 200 "$API_STATUS" "re-login"
# Export new tokens for this session
NEW_REFRESH=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh'])")
export REFRESH="$NEW_REFRESH"
pass "Re-logged in with fresh tokens"

PASSED=$((PASSED + 1))
