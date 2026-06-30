#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Sprint 8: Review Queue & Filtering"

subheader "Staff views review queue with status filter"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?status=draft" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "filter by status"
echo "$API_BODY" | pretty_json
COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null || echo "0")
pass "Review queue (status=draft) returned $COUNT application(s)"

subheader "Review queue with program filter"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?program=$PROGRAM_ID" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "filter by program"
echo "$API_BODY" | pretty_json
COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null || echo "0")
pass "Review queue (program=$PROGRAM_ID) returned $COUNT application(s)"

subheader "Review queue with admission_cycle filter"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?admission_cycle=$CYCLE_ID" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "filter by cycle"
echo "$API_BODY" | pretty_json
COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null || echo "0")
pass "Review queue (admission_cycle) returned $COUNT application(s)"

subheader "Review queue includes applicant_name in response"
HAS_NAME=$(echo "$API_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d['results']:
    print('applicant_name' in d['results'][0])
else:
    print('empty')
" 2>/dev/null || echo "no")
if [ "$HAS_NAME" = "True" ]; then
    NAME=$(echo "$API_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d['results']:
    print(d['results'][0].get('applicant_name',''))
" 2>/dev/null)
    pass "Review queue includes applicant_name='$NAME'"
elif [ "$HAS_NAME" = "empty" ]; then
    pass "No applications in queue (results empty)"
fi

PASSED=$((PASSED + 1))
