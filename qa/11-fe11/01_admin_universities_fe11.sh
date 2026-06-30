#!/usr/bin/env bash
# FE-11: Admin Portal — Universities Management.
#
# Tests university list (paginated), status transitions (activate/deactivate),
# and onboarding a new university.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-11: Admin Portal — Universities Management"

# =================================================================
#  1. List universities as platform admin
# =================================================================
header "1. List universities (admin)"

api_call GET "$BASE_URL/admin/universities/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list universities"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, 'Missing results key (expected paginated response)'
assert isinstance(d['results'], list), 'results is not a list'
print('  University count: %d' % len(d['results']))
if d['results']:
    u = d['results'][0]
    for key in ['id', 'name', 'status', 'program_count', 'application_count', 'created_at']:
        assert key in u, 'Missing key: %s' % key
    print('  University response shape valid')
"
pass "University list shape validated"

# =================================================================
#  2. Verify at least 2 universities exist
# =================================================================
header "2. Verify seed data has multiple universities"

UNI_COUNT=$(echo "$API_BODY" | python3 -c "
import sys, json
print(len(json.load(sys.stdin)['results']))
")
if [ "$UNI_COUNT" -lt 2 ]; then
    fail "Expected at least 2 universities, got $UNI_COUNT"
fi
pass "Found $UNI_COUNT universities"

# =================================================================
#  3. Deactivate a university
# =================================================================
header "3. Deactivate a university"

ACTIVE_ID=$(echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for u in d['results']:
    if u['status'] == 'active':
        print(u['id'])
        break
")
if [ -z "$ACTIVE_ID" ]; then
    fail "No active university found to deactivate"
fi

api_call PATCH "$BASE_URL/universities/$ACTIVE_ID/status/" '{"status": "inactive"}' "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "deactivate university"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('status') == 'inactive', 'Expected status inactive, got: %s' % d.get('status')
print('  University status now: inactive')
"
pass "University deactivated successfully"

# =================================================================
#  4. Verify deactivated in list
# =================================================================
header "4. Verify deactivated status in list"

api_call GET "$BASE_URL/admin/universities/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list universities after deactivate"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
found = False
for u in d['results']:
    if u['id'] == '$ACTIVE_ID':
        assert u['status'] == 'inactive', 'Expected inactive, got: %s' % u['status']
        found = True
        break
assert found, 'Deactivated university not found in list'
print('  Deactivated university confirmed in list with inactive status')
"
pass "Deactivated status confirmed"

# =================================================================
#  5. Reactivate the university
# =================================================================
header "5. Reactivate university"

api_call PATCH "$BASE_URL/universities/$ACTIVE_ID/status/" '{"status": "active"}' "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "reactivate university"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('status') == 'active', 'Expected status active, got: %s' % d.get('status')
print('  University status now: active')
"
pass "University reactivated successfully"

# =================================================================
#  6. Verify reactivated in list
# =================================================================
header "6. Verify reactivated status in list"

api_call GET "$BASE_URL/admin/universities/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list universities after reactivate"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
found = False
for u in d['results']:
    if u['id'] == '$ACTIVE_ID':
        assert u['status'] == 'active', 'Expected active, got: %s' % u['status']
        found = True
        break
assert found, 'Reactivated university not found in list'
print('  Reactivated university confirmed in list with active status')
"
pass "Reactivated status confirmed"

# =================================================================
#  7. Onboard a new university
# =================================================================
header "7. Onboard new university"

NEW_UNI_NAME="QA Test University $(date +%s)"
NEW_ADMIN_EMAIL="qaadmin${RANDOM}@test.com"

api_call POST "$BASE_URL/universities/" \
    "$(python3 -c "
import json
print(json.dumps({
    'name': '$NEW_UNI_NAME',
    'description': 'Created by FE-11 QA test',
    'initial_admin_email': '$NEW_ADMIN_EMAIL',
    'initial_admin_name': 'QA Admin'
}))")" \
    "$ADMIN_TOKEN"

assert_status 201 "$API_STATUS" "create university"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('name') == '$NEW_UNI_NAME', 'Name mismatch'
assert d.get('status') == 'inactive' or d.get('status') == 'active', 'Unexpected status: %s' % d.get('status')
assert 'id' in d, 'Missing id'
print('  Created: %s (id=%s, status=%s)' % (d['name'], d['id'], d.get('status')))
"
pass "University onboarded: $NEW_UNI_NAME"

# =================================================================
#  8. Verify new university appears in admin list
# =================================================================
header "8. Verify new university in admin list"

api_call GET "$BASE_URL/admin/universities/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list universities after create"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
found = False
for u in d['results']:
    if u['name'] == '$NEW_UNI_NAME':
        found = True
        break
assert found, 'Newly created university not found in admin list'
print('  New university found in list')
"
pass "New university visible in admin list"

echo ""
echo "  All FE-11 tests passed."
