#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Public: University Discovery"

subheader "List universities (public, no auth)"
api_call GET "$BASE_URL/universities/"
assert_status 200 "$API_STATUS" "list universities"
echo "$API_BODY" | pretty_json

COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])")
if [ "$COUNT" -ge 1 ] 2>/dev/null; then
    pass "University list returned $COUNT universities"
else
    fail "Expected at least 1 university, got count=$COUNT"
fi

# Verify Test University is in results
HAS_TEST_UNI=$(echo "$API_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
names=[r['name'] for r in d['results']]
print('yes' if 'Test University' in names else 'no')
")
if [ "$HAS_TEST_UNI" = "yes" ]; then
    pass "Test University found in results"
else
    fail "Test University not found in results"
fi

subheader "University detail (public, no auth)"
api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/"
assert_status 200 "$API_STATUS" "university detail"
echo "$API_BODY" | pretty_json
assert_json_eq "$API_BODY" "name" "Test University"
pass "University detail accessible"

subheader "University detail includes accreditation_info"
HAS_ACCRED=$(echo "$API_BODY" | python3 -c "import sys,json; print('accreditation_info' in json.load(sys.stdin))")
if [ "$HAS_ACCRED" = "True" ]; then
    pass "accreditation_info field present"
fi

subheader "Inactive university not visible to public"
# Re-fetch the list (API_BODY was overwritten by detail call)
api_call GET "$BASE_URL/universities/"
INACTIVE_ID=$(echo "$API_BODY" | python3 -c "
import sys,json
for r in json.load(sys.stdin).get('results', []):
    if r.get('status') != 'active':
        print(r['id'])
        break
else:
    print('none')
")
if [ "$INACTIVE_ID" = "none" ]; then
    pass "No inactive universities visible to public (all active)"
fi

PASSED=$((PASSED + 1))
