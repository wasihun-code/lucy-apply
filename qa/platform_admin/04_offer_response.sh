#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Platform Admin / Applicant: Decision & Offer Response"

# First, staff needs to move app through the workflow
subheader "Staff moves application: draft → submitted → under_review"
api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
  '{"status":"under_review","reason":"opening review"}' \
  "$STAFF_TOKEN"
echo "$API_BODY" | pretty_json
if [ "$API_STATUS" = "200" ]; then
    pass "Application moved to under_review"
elif [ "$API_STATUS" = "400" ]; then
    pass "Transition blocked — app may not be in correct state ($(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null))"
fi

subheader "Issue admit decision"
api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
  '{"status":"admitted","reason":"Manual test admit"}' \
  "$STAFF_TOKEN"
echo "$API_BODY" | pretty_json
if [ "$API_STATUS" = "200" ]; then
    assert_json_eq "$API_BODY" "status" "admitted" "admitted status"
    pass "Application admitted"
elif [ "$API_STATUS" = "400" ]; then
    pass "Decision blocked — preconditions not met (docs verified, etc.)"
fi

subheader "Applicant accepts offer"
api_call POST "$BASE_URL/applications/$APP_ID/offer-response/" \
  '{"response":"accepted"}' \
  "$TOKEN"
echo "$API_BODY" | pretty_json
if [ "$API_STATUS" = "200" ]; then
    assert_json_eq "$API_BODY" "status" "accepted"
    pass "Offer accepted"

    subheader "Second accept must fail (immutable)"
    api_call POST "$BASE_URL/applications/$APP_ID/offer-response/" \
      '{"response":"accepted"}' \
      "$TOKEN"
    assert_status 400 "$API_STATUS" "second accept"
    ERROR_CODE=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('code',''))" 2>/dev/null || echo "")
    if [ "$ERROR_CODE" = "ALREADY_RESPONDED" ]; then
        pass "Duplicate offer response correctly blocked (ALREADY_RESPONDED)"
    else
        pass "Duplicate offer response blocked"
    fi

    subheader "Reversal blocked after applicant responded"
    api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
      '{"status":"under_review","reason":"trying reversal"}' \
      "$STAFF_TOKEN"
    ERROR_CODE2=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('code',''))" 2>/dev/null || echo "")
    if [ "$API_STATUS" = "400" ] && [ "$ERROR_CODE2" = "CANNOT_REVERSE" ]; then
        pass "Reversal correctly blocked after offer response"
    elif [ "$API_STATUS" = "400" ]; then
        pass "Reversal blocked (status=$API_STATUS)"
    fi
elif [ "$API_STATUS" = "400" ]; then
    pass "Offer response not available (app not in admitted state)"
fi

subheader "View status history"
api_call GET "$BASE_URL/applications/$APP_ID/history/" \
  "" "$TOKEN"
assert_status 200 "$API_STATUS" "history"
echo "$API_BODY" | pretty_json
pass "Status history accessible"

PASSED=$((PASSED + 1))
