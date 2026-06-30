#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Staff Remove: URL Path Verification"

TIMESTAMP=$(date +%s)
REMOVE_STAFF_EMAIL="remove_${TIMESTAMP}@test.com"

subheader "Create a staff member to remove"
api_call POST "$BASE_URL/universities/$UNIVERSITY_ID/staff/" \
  "{\"email\":\"$REMOVE_STAFF_EMAIL\",\"full_name\":\"Remove Test\",\"permission_level\":\"officer\"}" \
  "$STAFF_TOKEN"
assert_status 201 "$API_STATUS" "create staff"
REMOVE_STAFF_ID=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
pass "Created staff $REMOVE_STAFF_EMAIL (id=$REMOVE_STAFF_ID)"

subheader "Old staff_remove URL should return 404"
api_call DELETE "$BASE_URL/universities/$UNIVERSITY_ID/staff_remove/" \
  "{\"staff_id\":\"$REMOVE_STAFF_ID\"}" \
  "$STAFF_TOKEN"
assert_status 404 "$API_STATUS" "old URL returns 404"
pass "Old staff_remove URL returns 404"

subheader "New staff/{id}/ URL should deactivate staff"
api_call DELETE "$BASE_URL/universities/$UNIVERSITY_ID/staff/$REMOVE_STAFF_ID/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "new URL deactivates"
pass "New staff/{id}/ URL deactivated staff"

subheader "Re-deactivation should return 400 (already deactivated)"
api_call DELETE "$BASE_URL/universities/$UNIVERSITY_ID/staff/$REMOVE_STAFF_ID/" \
  "" "$STAFF_TOKEN"
assert_status 400 "$API_STATUS" "already deactivated"
pass "Re-deactivation returns 400"

PASSED=$((PASSED + 1))
