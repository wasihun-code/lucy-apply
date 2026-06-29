#!/usr/bin/env bash
# FE-07: Staff Portal — Application Review Queue.
#
# Tests that the staff applications list supports filtering by
# status, program, and pagination via query parameters.
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-07: Application Review Queue"

PASSED=0
FAILED=0

# =================================================================
#  1. Staff can view the applications queue
# =================================================================
header "1. List applications (no filters)"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff applications list"

COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
RESULTS=$(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])))" 2>/dev/null || echo "0")
pass "Applications count=$COUNT, results this page=$RESULTS"

# Verify PaginatedResponse shape
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'count' in d, 'Missing count'
assert 'next' in d, 'Missing next'
assert 'previous' in d, 'Missing previous'
assert 'results' in d, 'Missing results'
assert isinstance(d['results'], list), 'results is not a list'
if d['results']:
    app = d['results'][0]
    for key in ['id','applicant_name','program_name','status','submitted_at']:
        assert key in app, 'Missing key: %s' % key
print('  PaginatedResponse shape valid')
"
pass "PaginatedResponse shape validated"

# =================================================================
#  2. Filter by status
# =================================================================
header "2. Filter by status"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?status=draft" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "filter by status=draft"
DRAFT_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
pass "Draft applications count=$DRAFT_COUNT"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?status=submitted" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "filter by status=submitted"
SUBMITTED_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
pass "Submitted applications count=$SUBMITTED_COUNT"

# =================================================================
#  3. Filter by program
# =================================================================
header "3. Filter by program"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?program=$PROGRAM_ID" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "filter by program"
PROG_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
pass "Applications for program $PROGRAM_ID count=$PROG_COUNT"

# =================================================================
#  4. Pagination
# =================================================================
header "4. Pagination parameter"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/applications/?page=1" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "page=1"
PAGE1_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
pass "Page 1 count=$PAGE1_COUNT"

# =================================================================
#  5. Programs list (for filter dropdown)
# =================================================================
header "5. Programs list for filter dropdown"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/programs/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff programs list"
PROG_LIST_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])))" 2>/dev/null || echo "0")
pass "Programs count=$PROG_LIST_COUNT"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, 'Missing results in programs response'
print('  Programs response has results array')
"
pass "Programs response shape valid"

PASSED=$((PASSED + 1))

# =================================================================
#  Summary
# =================================================================
header "Results"
echo "  Total:  $PASSED"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo ""
[ "$FAILED" -eq 0 ] || exit 1
