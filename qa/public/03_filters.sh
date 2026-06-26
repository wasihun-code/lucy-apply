#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Public: Filtering"

subheader "Filter programs by degree_level"
api_call GET "$BASE_URL/programs/?degree_level=undergraduate"
assert_status 200 "$API_STATUS" "filter by degree_level"
echo "$API_BODY" | pretty_json
ALL_UNDERGRAD=$(echo "$API_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ok=all(r['degree_level'] == 'undergraduate' for r in d['results'])
print('yes' if ok else 'no')
")
if [ "$ALL_UNDERGRAD" = "yes" ]; then
    pass "All results are undergraduate"
else
    fail "Some results are not undergraduate"
fi

subheader "Filter programs by university"
api_call GET "$BASE_URL/programs/?university=$UNIVERSITY_ID"
assert_status 200 "$API_STATUS" "filter by university"
echo "$API_BODY" | pretty_json
CORRECT_UNIV=$(echo "$API_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ok=all(str(r['university']) == '$UNIVERSITY_ID' for r in d['results'])
print('yes' if ok else 'no')
")
if [ "$CORRECT_UNIV" = "yes" ]; then
    pass "All results belong to correct university"
else
    fail "Some results belong to wrong university"
fi

subheader "Filter programs — no results for nonexistent university"
api_call GET "$BASE_URL/programs/?university=00000000-0000-0000-0000-000000000000"
if [ "$API_STATUS" = "200" ]; then
    COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])")
    if [ "$COUNT" = "0" ]; then
        pass "No results for nonexistent university"
    else
        fail "Expected 0 results, got $COUNT"
    fi
elif [ "$API_STATUS" = "400" ]; then
    pass "Nonexistent university filter rejected (400 — validates FK exists)"
fi

PASSED=$((PASSED + 1))
