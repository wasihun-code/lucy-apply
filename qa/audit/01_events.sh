#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Audit: Event Logging Verification"

TIMESTAMP=$(date +%s)
AUDIT_STAFF_EMAIL="audit_staff_${TIMESTAMP}@test.com"

# ── 1. University status change ───────────────────────────────────
# Toggle to inactive, then back to active so we have a change to verify
subheader "University status change audit event"
api_call PATCH "$BASE_URL/universities/$UNIVERSITY_ID/status/" \
  '{"status":"inactive"}' \
  "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "set inactive"

api_call PATCH "$BASE_URL/universities/$UNIVERSITY_ID/status/" \
  '{"status":"active"}' \
  "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "set active"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/audit-log/" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "audit log"
EVENT=$(echo "$API_BODY" | python3 -c "
import sys,json
d = json.load(sys.stdin)
results = d.get('results', d if isinstance(d, list) else [])
events = [e for e in results if e.get('action') == 'university_status_change']
if events:
    print('FOUND')
    print('From:', events[0].get('before_state', {}).get('status'))
    print('To:', events[0].get('after_state', {}).get('status'))
else:
    print('NOT_FOUND')
" 2>/dev/null)
echo "  $EVENT"
echo "$EVENT" | grep -q 'FOUND' || fail "University status change audit event not found"
pass "University status change audit event recorded"

# ── 2. Staff invite ───────────────────────────────────────────────
subheader "Staff invite audit event"
api_call POST "$BASE_URL/universities/$UNIVERSITY_ID/staff/" \
  "{\"email\":\"$AUDIT_STAFF_EMAIL\",\"full_name\":\"Audit Staff\",\"permission_level\":\"officer\"}" \
  "$STAFF_TOKEN"
assert_status 201 "$API_STATUS" "invite staff"
STAFF_ID=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
echo "  Created staff $AUDIT_STAFF_EMAIL (id=$STAFF_ID)"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/audit-log/?action=staff_invited" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "audit log"
EVENT=$(echo "$API_BODY" | python3 -c "
import sys,json
d = json.load(sys.stdin)
results = d.get('results', d if isinstance(d, list) else [])
events = [e for e in results if e.get('action') == 'staff_invited']
if events:
    print('FOUND')
    print('Email:', events[0].get('after_state', {}).get('email'))
else:
    print('NOT_FOUND')
" 2>/dev/null)
echo "  $EVENT"
echo "$EVENT" | grep -q 'FOUND' || fail "Staff invite audit event not found"
echo "$EVENT" | grep -q "$AUDIT_STAFF_EMAIL" || fail "Staff invite email mismatch"
pass "Staff invite audit event recorded for $AUDIT_STAFF_EMAIL"

# ── 3. Staff deactivation ─────────────────────────────────────────
subheader "Staff deactivation audit event"
api_call DELETE "$BASE_URL/universities/$UNIVERSITY_ID/staff_remove/" \
  "{\"staff_id\":\"$STAFF_ID\"}" \
  "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "deactivate staff"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/audit-log/?action=staff_deactivated" \
  "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "audit log"
EVENT=$(echo "$API_BODY" | python3 -c "
import sys,json
d = json.load(sys.stdin)
results = d.get('results', d if isinstance(d, list) else [])
events = [e for e in results if e.get('action') == 'staff_deactivated']
if events:
    print('FOUND')
    print('From:', events[0].get('before_state', {}).get('account_status'))
    print('To:', events[0].get('after_state', {}).get('account_status'))
else:
    print('NOT_FOUND')
" 2>/dev/null)
echo "  $EVENT"
echo "$EVENT" | grep -q 'FOUND' || fail "Staff deactivation audit event not found"
echo "$EVENT" | grep -q '"To:.*deactivated"' || {
  STATUS=$(echo "$EVENT" | grep "To:" | awk '{print $2}')
  [ "$STATUS" = "deactivated" ] || fail "Expected deactivated status, got $STATUS"
}
pass "Staff deactivation audit event recorded"

PASSED=$((PASSED + 1))
