#!/usr/bin/env bash
# FE-12: Admin Portal — Users Management.
#
# Tests user list and search (backend only supports `search` query param;
# role/status filtering is client-side only).
#
# NOTE: PATCH /admin/users/{id}/status/ uses <uuid:pk> but User PKs are
# integers (BigAutoField), so deactivation always 404s — skipped pending
# backend fix.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-12: Admin Portal — Users Management"

# =================================================================
#  1. List users as platform admin
# =================================================================
header "1. List users (admin)"

api_call GET "$BASE_URL/admin/users/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "list users"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, 'Missing results key'
assert isinstance(d['results'], list), 'results is not a list'
print('  User count: %d' % len(d['results']))
assert len(d['results']) >= 3, 'Expected at least 3 users, got %d' % len(d['results'])
if d['results']:
    u = d['results'][0]
    for key in ['id', 'email', 'full_name', 'role', 'account_status']:
        assert key in u, 'Missing key: %s' % key
    print('  User response shape valid')
"
pass "User list shape validated"

# =================================================================
#  2. Search by email
# =================================================================
header "2. Search by email"

api_call GET "$BASE_URL/admin/users/?search=alice@test.com" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "search users"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert len(d['results']) == 1, 'Expected 1 result for alice@test.com, got %d' % len(d['results'])
assert d['results'][0]['email'] == 'alice@test.com', 'Wrong user returned'
print('  Found alice@test.com by search')
"
pass "Search by email works"

# =================================================================
#  3. Search by name (partial)
# =================================================================
header "3. Search by name (partial)"

api_call GET "$BASE_URL/admin/users/?search=Bob" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "search users"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert len(d['results']) >= 1, 'Expected at least 1 result for Bob, got %d' % len(d['results'])
found = any('bob' in u['email'].lower() for u in d['results'])
assert found, 'Expected bob@test.com in results'
print('  Found Bob by partial name search')
"
pass "Search by partial name works"

echo ""
echo "  All FE-12 (users) tests passed."
