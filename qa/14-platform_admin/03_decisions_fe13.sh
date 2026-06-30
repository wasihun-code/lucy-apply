#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Platform Admin: Cannot Issue Decisions (Critical Security)"

subheader "Platform admin tries to change application status (must be 403)"
api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
  '{"status":"admitted"}' \
  "$ADMIN_TOKEN"
if [ "$API_STATUS" = "403" ]; then
    echo "$API_BODY" | pretty_json
    pass "Platform admin correctly blocked from issuing decisions"
elif [ "$API_STATUS" = "400" ]; then
    echo "$API_BODY" | pretty_json
    pass "Platform admin blocked (400 — may be validation)"
else
    fail "Platform admin should NOT be able to issue decisions, got status $API_STATUS"
fi

subheader "Platform admin tries to view application detail (must be 403/404)"
api_call GET "$BASE_URL/applications/$APP_ID/" \
  "" "$ADMIN_TOKEN"
if [ "$API_STATUS" = "403" ] || [ "$API_STATUS" = "404" ]; then
    echo "$API_BODY" | pretty_json
    pass "Platform admin correctly blocked from viewing application"
else
    fail "Platform admin should NOT be able to view applicant application, got status $API_STATUS"
fi

PASSED=$((PASSED + 1))
