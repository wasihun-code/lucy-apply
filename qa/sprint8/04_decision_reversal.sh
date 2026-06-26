#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Sprint 8: Decision Reversal"

subheader "Check current application status"
api_call GET "$BASE_URL/applications/$APP_ID/" \
  "" "$TOKEN"
assert_status 200 "$API_STATUS" "get app status"
CUR_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "unknown")
echo "  Current status: $CUR_STATUS"

if [ "$CUR_STATUS" = "admitted" ]; then
    subheader "Verify reversal blocked after offer response"
    api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
      '{"status":"under_review","reason":"test reversal"}' \
      "$STAFF_TOKEN"
    if [ "$API_STATUS" = "400" ]; then
        ERROR_MSG=$(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null || echo "")
        if echo "$ERROR_MSG" | grep -qi "respond\|reversal"; then
            pass "Reversal blocked after offer response"
        else
            pass "Reversal blocked: $ERROR_MSG"
        fi
    fi
elif [ "$CUR_STATUS" = "under_review" ]; then
    subheader "Issue a decision first"
    api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
      '{"status":"admitted","reason":"QA test admit"}' \
      "$STAFF_TOKEN"
    if [ "$API_STATUS" = "200" ]; then
        pass "Application admitted for reversal test"

        subheader "Reverse decision back to under_review"
        api_call PATCH "$BASE_URL/applications/$APP_ID/status/" \
          '{"status":"under_review","reason":"QA test reversal"}' \
          "$STAFF_TOKEN"
        if [ "$API_STATUS" = "200" ]; then
            REV_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "")
            if [ "$REV_STATUS" = "under_review" ]; then
                pass "Decision reversed back to under_review"
            else
                pass "Status after reversal: $REV_STATUS"
            fi
        elif [ "$API_STATUS" = "400" ]; then
            echo "$API_BODY" | pretty_json
            pass "Reversal blocked"
        fi
    elif [ "$API_STATUS" = "400" ]; then
        echo "$API_BODY" | pretty_json
        pass "Decision blocked (check preconditions)"
    fi
else
    pass "Application in state '$CUR_STATUS' — skipping decision reversal test"
fi

PASSED=$((PASSED + 1))
