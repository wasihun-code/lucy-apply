#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Public: Program Discovery"

subheader "List programs (public, no auth)"
api_call GET "$BASE_URL/programs/"
assert_status 200 "$API_STATUS" "list programs"
echo "$API_BODY" | pretty_json

COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])")
if [ "$COUNT" -ge 1 ]; then
    pass "Program list returned $COUNT programs"
else
    fail "Expected at least 1 program"
fi

subheader "Program detail (public, no auth)"
api_call GET "$BASE_URL/programs/$PROGRAM_ID/"
assert_status 200 "$API_STATUS" "program detail"
echo "$API_BODY" | pretty_json
assert_json_eq "$API_BODY" "name" "BSc Computer Science"
assert_json_eq "$API_BODY" "degree_level" "undergraduate"
pass "Program detail correct"

subheader "Program detail includes required_documents"
HAS_DOCS=$(echo "$API_BODY" | python3 -c "import sys,json; print('required_documents' in json.load(sys.stdin))")
if [ "$HAS_DOCS" = "True" ]; then
    pass "required_documents field present"
fi

subheader "Program detail includes open_cycles"
HAS_CYCLES=$(echo "$API_BODY" | python3 -c "import sys,json; print('open_cycles' in json.load(sys.stdin))")
if [ "$HAS_CYCLES" = "True" ]; then
    OPEN_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['open_cycles']))")
    pass "Program has $OPEN_COUNT open cycle(s)"
fi

PASSED=$((PASSED + 1))
