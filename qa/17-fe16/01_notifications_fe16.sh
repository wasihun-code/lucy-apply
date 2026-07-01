#!/usr/bin/env bash
# FE-16: Status Timeline + Notifications
#
# Tests the application history endpoint used by the StatusTimeline
# component and verifies notification derivation is correct.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-16: Status Timeline / Notifications"

# =================================================================
#  0. Create a fresh application for isolated testing
# =================================================================
header "0. Create fresh application for isolated testing"

api_call POST "$BASE_URL/applications/" \
  "{\"program\": \"$PROGRAM_B_ID\", \"admission_cycle\": \"$CYCLE_B_ID\"}" "$TOKEN"
assert_status 201 "$API_STATUS" "create fresh app"
FRESH_APP_ID=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  FRESH_APP_ID=$FRESH_APP_ID"
pass "Fresh application created"

# =================================================================
#  1. Draft application has no history — 200 with empty list
# =================================================================
header "1. GET application history (draft → empty list)"

api_call GET "$BASE_URL/applications/$FRESH_APP_ID/history/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "history retrieval"
HISTORY_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d, list) else 0)")
echo "  history count=$HISTORY_COUNT"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert isinstance(d, list), 'Expected list type'
assert len(d) == 0, 'Expected empty list for draft, got %d entries' % len(d)
print('  ✓ Draft has empty history')
"
pass "Draft has no history (correct)"

# =================================================================
#  2. Upload required documents for submission
# =================================================================
header "2. Upload required documents"

for doc_type in transcript cv; do
  api_call POST "$BASE_URL/applications/$FRESH_APP_ID/documents/" \
    "{\"document_type\": \"$doc_type\", \"object_key\": \"test/${doc_type}.pdf\"}" "$TOKEN"
  assert_status 201 "$API_STATUS" "document upload ($doc_type)"
done
pass "Documents uploaded"

# =================================================================
#  3. Create payment intent (required before submit)
# =================================================================
header "3. Create payment intent"

api_call POST "$BASE_URL/applications/$FRESH_APP_ID/payment-intent/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "payment intent"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'payment_id' in d, 'Expected payment_id'
print('  payment_id=%s' % d['payment_id'])
"
pass "Payment intent created"

# =================================================================
#  4. Submit the application
# =================================================================
header "4. Submit the application"

api_call POST "$BASE_URL/applications/$FRESH_APP_ID/submit/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "app submission"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['status'] == 'submitted', 'Expected status submitted, got %s' % d['status']
print('  status=%s' % d['status'])
"
pass "Application submitted"

# =================================================================
#  5. History now has one entry (draft → submitted)
# =================================================================
header "5. GET application history (after submit)"

api_call GET "$BASE_URL/applications/$FRESH_APP_ID/history/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "history after submit"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert isinstance(d, list), 'Expected list'
assert len(d) >= 1, 'Expected at least 1 history entry'
entry = d[0]
assert 'from_status' in entry, 'Missing from_status'
assert 'to_status' in entry, 'Missing to_status'
assert 'changed_by_type' in entry, 'Missing changed_by_type'
assert 'reason' in entry, 'Missing reason'
assert 'created_at' in entry, 'Missing created_at'
print('  from_status=%s to_status=%s changed_by=%s reason=%s' % (
    entry.get('from_status'), entry.get('to_status'),
    entry.get('changed_by_type'), entry.get('reason'),
))
"
pass "History entry shape is correct"

# =================================================================
#  6. Verify history entry values
# =================================================================
header "6. Verify history entry values"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
entry = d[0]
assert entry['from_status'] == 'draft', 'Expected from_status=draft, got %s' % entry['from_status']
assert entry['to_status'] == 'submitted', 'Expected to_status=submitted, got %s' % entry['to_status']
assert entry['changed_by_type'] == 'applicant', 'Expected changed_by_type=applicant, got %s' % entry['changed_by_type']
assert 'submit' in entry['reason'].lower(), 'Reason should mention submission: %s' % entry['reason']
print('  ✓ All values correct')
"
pass "History entry values are correct"

# =================================================================
#  7. Staff can view history (role-isolated)
# =================================================================
header "7. Staff can view same history"

api_call GET "$BASE_URL/applications/$FRESH_APP_ID/history/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff history retrieval"
STAFF_COUNT=$(echo "$API_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))")
echo "  staff history count=$STAFF_COUNT"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert isinstance(d, list), 'Expected list'
assert len(d) >= 1, 'Expected at least 1 history entry'
entry = d[0]
assert 'from_status' in entry, 'Missing from_status'
assert 'to_status' in entry, 'Missing to_status'
assert entry['from_status'] == 'draft', 'Expected from_status=draft'
print('  ✓ Staff sees correct history')
"
pass "Staff can view history"

# =================================================================
#  8. Unauthorized user cannot access history
# =================================================================
header "8. Unauthorized user cannot access history"

api_call GET "$BASE_URL/applications/$FRESH_APP_ID/history/" "" "$BOB_TOKEN"
assert_status 404 "$API_STATUS" "unauthenticated history access"
pass "Unauthorized user gets 404"

echo ""
echo "=============================================="
echo "  ALL FE-16 QA CHECKS PASSED"
echo "=============================================="
