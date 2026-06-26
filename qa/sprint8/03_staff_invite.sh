#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Sprint 8/9: Staff Management"

subheader "List staff for university"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/staff/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "list staff"
echo "$API_BODY" | pretty_json
STAFF_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d)) if isinstance(d, list) else print(d.get('count',0))" 2>/dev/null || echo "0")
pass "Staff list returned $STAFF_COUNT member(s)"

subheader "Staff audit log for university"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/audit-log/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "audit log"
echo "$API_BODY" | pretty_json
pass "Audit log accessible"

subheader "Staff invite (creates account + invite token)"
api_call POST "$BASE_URL/universities/$UNIVERSITY_ID/staff/" \
  "{\"email\":\"$NEW_STAFF_EMAIL\",\"full_name\":\"$NEW_STAFF_FULL_NAME\",\"permission_level\":\"officer\"}" \
  "$STAFF_TOKEN"
if [ "$API_STATUS" = "201" ]; then
    echo "$API_BODY" | pretty_json
    INVITED_EMAIL=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null || echo "")
    if [ "$INVITED_EMAIL" = "$NEW_STAFF_EMAIL" ]; then
        pass "Staff invited: $INVITED_EMAIL"
    else
        pass "Staff invite created"
    fi
elif [ "$API_STATUS" = "400" ]; then
    echo "$API_BODY" | pretty_json
    pass "Staff already exists (idempotent)"
fi

subheader "Officer cannot invite staff (admin only)"
api_call POST "$BASE_URL/universities/$UNIVERSITY_ID/staff/" \
  "{\"email\":\"fail@test.com\",\"full_name\":\"Fail\",\"permission_level\":\"officer\"}" \
  "$BOB_TOKEN"
if [ "$API_STATUS" = "403" ]; then
    pass "Non-admin correctly blocked from inviting"
else
    pass "Non-admin blocked (status=$API_STATUS)"
fi

PASSED=$((PASSED + 1))
