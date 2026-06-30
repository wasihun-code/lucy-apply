#!/usr/bin/env bash
# FE-15: Applicant Finance / Payment History page.
#
# Tests the /api/v1/applications/{id}/payment/ endpoint and
# verifies the frontend renders payments correctly.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-15: Finances / Payment History"

# =================================================================
#  1. Alice's application has no payment yet — 404 expected
# =================================================================
header "1. GET application payment (no payment yet → 404)"

api_call GET "$BASE_URL/applications/$APP_ID/payment/" "" "$TOKEN"
assert_status 404 "$API_STATUS" "payment before creation"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('error', {}).get('code') == 'NO_PAYMENT', 'Expected NO_PAYMENT error'
print('  -> correct NO_PAYMENT error')
"
pass "No payment returns 404"

# =================================================================
#  2. Submit required documents for the application
# =================================================================
header "2. Upload required documents"

DOCS=$(python3 -c "
import json
docs = [
    {'document_type': 'transcript', 'file': 'https://storage.example.com/transcript.pdf'},
    {'document_type': 'passport', 'file': 'https://storage.example.com/passport.pdf'},
]
print(json.dumps(docs))
")

for doc in $(echo "$DOCS" | python3 -c "import sys,json;docs=json.load(sys.stdin);[print(json.dumps(d)) for d in docs]"); do
  api_call POST "$BASE_URL/applications/$APP_ID/documents/" "$doc" "$TOKEN"
  assert_status 201 "$API_STATUS" "document upload"
done
pass "Documents uploaded"

# =================================================================
#  3. Create payment intent (triggers Payment record)
# =================================================================
header "3. Create payment intent"

api_call POST "$BASE_URL/applications/$APP_ID/payment-intent/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "payment intent"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'client_secret' in d, 'Expected client_secret'
assert 'payment_id' in d, 'Expected payment_id'
print('  client_secret=%s payment_id=%s' % (d['client_secret'], d['payment_id']))
"
pass "Payment intent created"

# =================================================================
#  4. GET payment now returns Payment data (pending)
# =================================================================
header "4. GET payment after creation"

api_call GET "$BASE_URL/applications/$APP_ID/payment/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "payment retrieval"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['status'] == 'pending', 'Expected pending status'
assert float(d['amount']) > 0, 'Expected positive amount'
assert d['currency'] == 'USD', 'Expected USD currency'
assert len(d['id']) > 0, 'Expected non-empty payment id'
print('  status=%s amount=%s %s' % (d['status'], d['amount'], d['currency']))
"
pass "Payment data returned correctly"

# =================================================================
#  5. Payment serializer returns all expected fields
# =================================================================
header "5. Verify PaymentSerializer field shape"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
expected_fields = ['id', 'amount', 'currency', 'status', 'processor_reference', 'refundable', 'initiated_at', 'completed_at']
for f in expected_fields:
    assert f in d, 'Missing field: %s' % f
print('  all %d expected fields present' % len(expected_fields))
"
pass "PaymentSerializer shape is correct"

# =================================================================
#  6. Applicant applications list does NOT include payment data
# =================================================================
header "6. Applications list omits payment field"

api_call GET "$BASE_URL/applications/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "applications list"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
results = d.get('results', [])
assert len(results) > 0, 'Expected at least one application'
for app in results:
    assert 'payment' not in app, 'payment should not be in list serializer'
    assert 'program_name' in app, 'program_name should be present'
print('  applications list has no payment data (correct — list serializer)')
"
pass "List serializer excludes payment"

echo ""
echo "=============================================="
echo "  ALL FE-15 FINANCES QA CHECKS PASSED"
echo "=============================================="
