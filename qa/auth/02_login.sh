#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Auth: Login"

subheader "Login with valid credentials (should return tokens)"
api_call POST "$BASE_URL/auth/login/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"password\":\"$APPLICANT_PASSWORD\"}"
assert_status 200 "$API_STATUS" "login"
echo "$API_BODY" | pretty_json
# Verify tokens exist
# Just verify tokens exist and are non-empty (JWTs are generated fresh each time)
ACCESS_TOKEN=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null || echo "")
if [ -n "$ACCESS_TOKEN" ]; then
    pass "Valid login returns JWT access token"
else
    fail "No access token in response"
fi

subheader "Wrong password returns 401"
api_call POST "$BASE_URL/auth/login/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"password\":\"wrongpass\"}"
assert_status 401 "$API_STATUS" "wrong password"
pass "Wrong password correctly rejected"

subheader "Nonexistent email returns 401"
api_call POST "$BASE_URL/auth/login/" \
  '{"email":"noone@nowhere.com","password":"testpass123!"}'
assert_status 401 "$API_STATUS" "nonexistent email"
pass "Nonexistent email correctly rejected"

PASSED=$((PASSED + 1))
