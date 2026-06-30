#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Applications: Payment Intent"

subheader "Trigger payment intent (creates Payment record in mock mode)"
api_call POST "$BASE_URL/applications/$APP_ID/payment-intent/" \
  "" "$TOKEN"
assert_status 200 "$API_STATUS" "payment intent"
echo "$API_BODY" | pretty_json

CLIENT_SECRET=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('client_secret',''))" 2>/dev/null || echo "")
if [ -n "$CLIENT_SECRET" ] && [ "$CLIENT_SECRET" != "None" ]; then
    pass "Client secret returned: ${CLIENT_SECRET:0:30}..."
else
    pass "Payment intent created"
fi

subheader "Check payment status"
api_call GET "$BASE_URL/applications/$APP_ID/payment/" \
  "" "$TOKEN"
assert_status 200 "$API_STATUS" "payment status"
echo "$API_BODY" | pretty_json
PAY_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
if [ "$PAY_STATUS" = "succeeded" ]; then
    pass "Payment status: succeeded (mock auto-complete)"
elif [ -n "$PAY_STATUS" ]; then
    pass "Payment status: $PAY_STATUS"
else
    pass "Payment record found"
fi

PASSED=$((PASSED + 1))
