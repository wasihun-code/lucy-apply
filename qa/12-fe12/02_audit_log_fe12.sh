#!/usr/bin/env bash
# FE-12: Admin Portal — Audit Log.
#
# Tests audit log list (paginated), university/action/date filtering,
# and expandable state detail.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-12: Admin Portal — Audit Log"

# =================================================================
#  1. Trigger audit events by changing university status
# =================================================================
header "1. Trigger audit events (university status change)"

api_call PATCH "$BASE_URL/universities/$UNIVERSITY_ID/status/" \
  '{"status":"inactive"}' \
  "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "set university inactive"

api_call PATCH "$BASE_URL/universities/$UNIVERSITY_ID/status/" \
  '{"status":"active"}' \
  "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "set university active"

pass "Audit events triggered (university status changes)"

# =================================================================
#  2. List admin audit log entries
# =================================================================
header "2. List admin audit log"

api_call GET "$BASE_URL/admin/audit-log/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list audit log"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, 'Missing results key (expected paginated response)'
assert 'count' in d, 'Missing count key'
assert isinstance(d['results'], list), 'results is not a list'
print('  Total entries: %d' % d['count'])
print('  Page entries: %d' % len(d['results']))

if d['results']:
    entry = d['results'][0]
    for key in ['id', 'action', 'actor_type', 'actor_id', 'created_at']:
        assert key in entry, 'Missing key: %s' % key
    print('  Audit entry shape valid (id, action, actor_type, actor_id, created_at)')
"
pass "Audit log list shape validated"

# =================================================================
#  3. Verify university status change events exist
# =================================================================
header "3. Verify university_status_change events"

api_call GET "$BASE_URL/admin/audit-log/?action=university_status_change" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "filter by action"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert len(d['results']) >= 2, 'Expected at least 2 status change events, got %d' % len(d['results'])
for entry in d['results']:
    assert entry['action'] == 'university_status_change', 'Unexpected action: %s' % entry['action']
print('  Found %d university_status_change events' % len(d['results']))
"
pass "Action filter works"

# =================================================================
#  4. Filter by university
# =================================================================
header "4. Filter by university"

api_call GET "$BASE_URL/admin/audit-log/?university=$UNIVERSITY_ID" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "filter by university"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for entry in d['results']:
    if entry.get('university'):
        assert entry['university'] == '$UNIVERSITY_ID', 'Expected university %s, got %s' % ('$UNIVERSITY_ID', entry['university'])
print('  Filtered entries for university: %s' % '$UNIVERSITY_ID')
"
pass "University filter works"

# =================================================================
#  5. Verify state detail in audit entries
# =================================================================
header "5. Verify state detail in audit entries"

api_call GET "$BASE_URL/admin/audit-log/?action=university_status_change" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list for state detail"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d['results']:
    entry = d['results'][0]
    has_before = entry.get('before_state') is not None and len(entry.get('before_state', {})) > 0
    has_after = entry.get('after_state') is not None and len(entry.get('after_state', {})) > 0
    assert has_before or has_after, 'Expected before_state or after_state to be populated'
    if has_before:
        print('  before_state: %s' % json.dumps(entry['before_state']))
    if has_after:
        print('  after_state: %s' % json.dumps(entry['after_state']))
    print('  State detail present')
"
pass "State detail verified"

echo ""
echo "  All FE-12 (audit log) tests passed."
