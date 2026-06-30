#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Applications: Auto-save (PATCH form_data)"

subheader "PATCH form_data on draft application"
api_call PATCH "$BASE_URL/applications/$APP_ID/" \
  '{"form_data":{"personal_statement":"Updated statement","why_ethiopia":"Great universities."}}' \
  "$TOKEN"
assert_status 200 "$API_STATUS" "autosave patch"
echo "$API_BODY" | pretty_json
# Verify the form_data was updated
PERSONAL_STMT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['form_data'].get('personal_statement',''))")
if [ "$PERSONAL_STMT" = "Updated statement" ]; then
    pass "form_data.personal_statement updated"
else
    fail "Expected 'Updated statement', got '$PERSONAL_STMT'"
fi
WHY_ETHIOPIA=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['form_data'].get('why_ethiopia',''))")
if [ "$WHY_ETHIOPIA" = "Great universities." ]; then
    pass "form_data.why_ethiopia added"
else
    fail "Expected 'Great universities.', got '$WHY_ETHIOPIA'"
fi

PASSED=$((PASSED + 1))
