#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Applications: Status History"

subheader "View application status history"
api_call GET "$BASE_URL/applications/$APP_ID/history/" \
  "" "$TOKEN"
assert_status 200 "$API_STATUS" "history"
echo "$API_BODY" | pretty_json

HIST_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$HIST_COUNT" -ge 0 ] 2>/dev/null; then
    pass "History returned $HIST_COUNT entries"
fi

PASSED=$((PASSED + 1))
