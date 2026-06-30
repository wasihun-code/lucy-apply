#!/usr/bin/env bash
# FE-10: Team Management — Invite, List, Remove Staff.
#
# Tests staff listing shape, inviting a new staff member,
# verifying the invite appears in the list, and removing them.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-10: Team Management — Invite, List, Remove Staff"

PASSED=0
FAILED=0

# =================================================================
#  1. List staff for the university
# =================================================================
header "1. List staff"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/staff/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "list staff"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert isinstance(d, list), 'Expected a list'
print('  Staff count: %d' % len(d))
if d:
    s = d[0]
    for key in ['id', 'email', 'full_name', 'permission_level', 'account_status']:
        assert key in s, 'Missing key: %s' % key
    print('  Staff response shape valid')
"
pass "Staff list shape validated"

# =================================================================
#  2. Invite a new staff member (officer)
# =================================================================
header "2. Invite staff (officer)"

INVITE_DATA=$(cat <<JSON
{
  "email": "fe10_officer@univ.com",
  "full_name": "FE-10 Officer",
  "permission_level": "officer"
}
JSON
)

api_call POST "$BASE_URL/universities/$UNIVERSITY_ID/staff/" "$INVITE_DATA" "$STAFF_TOKEN"
assert_status 201 "$API_STATUS" "invite staff"

NEW_STAFF_ID=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  Created staff ID: $NEW_STAFF_ID"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('email') == 'fe10_officer@univ.com', 'Email mismatch'
assert d.get('full_name') == 'FE-10 Officer', 'Name mismatch'
assert d.get('permission_level') == 'officer', 'Level mismatch'
print('  Staff invite validated')
"
pass "Staff invited successfully"

# =================================================================
#  3. Verify new staff appears in list
# =================================================================
header "3. Verify staff in list"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/staff/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "re-list staff"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ids = [s['id'] for s in d]
assert '$NEW_STAFF_ID' in ids, 'New staff ID not found in list'
print('  New staff member present in staff list')
"
pass "Staff list includes new member"

# =================================================================
#  4. Remove the new staff member
# =================================================================
header "4. Remove staff"

api_call DELETE "$BASE_URL/universities/$UNIVERSITY_ID/staff/$NEW_STAFF_ID/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "remove staff"
pass "Staff removed"

# =================================================================
#  5. Verify removal
# =================================================================
header "5. Verify removal"

api_call GET "$BASE_URL/universities/$UNIVERSITY_ID/staff/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "re-list staff after removal"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
staff = [s for s in d if s['id'] == '$NEW_STAFF_ID']
assert len(staff) == 1, 'Staff ID not found in list'
assert staff[0]['account_status'] in ('inactive', 'deactivated'), 'Expected inactive/deactivated, got: %s' % staff[0]['account_status']
print('  Staff member now %s (soft-deleted)' % staff[0]['account_status'])
"
pass "Staff member deactivated"

# =================================================================
#  Summary
# =================================================================
header "FE-10 Team Management Results"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
exit $FAILED
