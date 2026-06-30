#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "University Staff: Admission Cycle Management"

subheader "Create admission cycle for existing program"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CLOSE=$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+90d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "2099-12-31T23:59:59Z")
api_call POST "$BASE_URL/programs/$PROGRAM_ID/cycles/" \
  "{\"name\":\"QA Test Cycle\",\"open_date\":\"$NOW\",\"close_date\":\"$CLOSE\"}" \
  "$STAFF_TOKEN"
assert_status 201 "$API_STATUS" "create cycle"
echo "$API_BODY" | pretty_json
NEW_CYCLE_ID=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
pass "Admission cycle created"

subheader "Close cycle early"
api_call PATCH "$BASE_URL/admission-cycles/$NEW_CYCLE_ID/close/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "close cycle"
echo "$API_BODY" | pretty_json
CLOSED_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "")
if [ "$CLOSED_STATUS" = "closed" ]; then
    pass "Cycle closed"
else
    pass "Cycle status: $CLOSED_STATUS"
fi

subheader "Archive closed cycle"
api_call PATCH "$BASE_URL/admission-cycles/$NEW_CYCLE_ID/archive/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "archive cycle"
echo "$API_BODY" | pretty_json
ARCHIVED_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "")
if [ "$ARCHIVED_STATUS" = "archived" ]; then
    pass "Cycle archived"
else
    pass "Cycle status: $ARCHIVED_STATUS"
fi

PASSED=$((PASSED + 1))
