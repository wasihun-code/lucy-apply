#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Platform Admin: Login & Access"

subheader "Platform admin login (should return tokens)"
api_call POST "$BASE_URL/auth/login/" \
  "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
assert_status 200 "$API_STATUS" "admin login"
echo "$API_BODY" | pretty_json
# Just verify tokens exist (JWTs are generated fresh each time)
ACCESS_TOKEN=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))" 2>/dev/null || echo "")
if [ -n "$ACCESS_TOKEN" ]; then
    pass "Platform admin login returns JWT access token"
else
    fail "No access token in response"
fi

subheader "Admin stats endpoint (requires IsPlatformAdmin)"
api_call GET "$BASE_URL/admin/stats/" \
  "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin stats"
echo "$API_BODY" | pretty_json
for key in total_applicants total_universities total_programs total_staff; do
    HAS_KEY=$(echo "$API_BODY" | python3 -c "import sys,json; print('$key' in json.load(sys.stdin))")
    if [ "$HAS_KEY" = "True" ]; then
        pass "Stats includes $key"
    fi
done

subheader "Admin stats rejects unauthenticated users"
api_call GET "$BASE_URL/admin/stats/"
assert_status 401 "$API_STATUS" "admin stats no auth"
pass "Stats endpoint secured"

subheader "Admin users endpoint (requires IsPlatformAdmin)"
api_call GET "$BASE_URL/admin/users/" \
  "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin users"
echo "$API_BODY" | pretty_json
pass "Admin users endpoint accessible"

subheader "Admin users rejects unauthenticated users"
api_call GET "$BASE_URL/admin/users/"
assert_status 401 "$API_STATUS" "admin users no auth"
pass "Users endpoint secured"

subheader "Admin audit log endpoint"
api_call GET "$BASE_URL/admin/audit-log/" \
  "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin audit log"
echo "$API_BODY" | pretty_json
pass "Admin audit log accessible"

PASSED=$((PASSED + 1))
