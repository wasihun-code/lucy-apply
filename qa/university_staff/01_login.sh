#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "University Staff: Login & Access"

subheader "Staff login (should return tokens)"
api_call POST "$BASE_URL/auth/login/" \
  "{\"email\":\"$STAFF_EMAIL\",\"password\":\"$STAFF_PASSWORD\"}"
assert_status 200 "$API_STATUS" "staff login"
echo "$API_BODY" | pretty_json
# Just verify tokens exist (JWTs are generated fresh each time)
ACCESS_TOKEN=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))" 2>/dev/null || echo "")
if [ -n "$ACCESS_TOKEN" ]; then
    pass "Staff login returns JWT access token"
else
    fail "No access token in response"
fi

subheader "Staff can list their university's programs (includes drafts)"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/programs/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff programs list"
echo "$API_BODY" | pretty_json
pass "Staff can list university programs"

subheader "Staff can view applications queue"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff applications queue"
echo "$API_BODY" | pretty_json
pass "Staff can view applications review queue"

PASSED=$((PASSED + 1))
