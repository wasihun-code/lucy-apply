#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Platform Admin: University Status"

subheader "Update university status (active ↔ inactive)"
api_call PATCH "$BASE_URL/universities/$UNIVERSITY_ID/status/" \
  '{"status":"active"}' \
  "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "update status"
echo "$API_BODY" | pretty_json
assert_json_eq "$API_BODY" "status" "active"
pass "University status updated to active"

subheader "Platform admin sees all universities (including inactive)"
api_call GET "$BASE_URL/universities/" \
  "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list all universities"
echo "$API_BODY" | pretty_json
COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])")
pass "Platform admin sees $COUNT universities"

PASSED=$((PASSED + 1))
