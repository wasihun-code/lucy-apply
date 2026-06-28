#!/usr/bin/env bash
# QA regression test: Full login flow through Next.js proxy routes.
#
# Tests that:
#   1. POST /api/auth/login/ sets httpOnly cookie and returns tokens
#   2. GET  /api/auth/me/  works with Authorization header (post-login)
#   3. GET  /api/auth/me/  works with httpOnly cookie (page-load)
#   4. GET  /api/proxy/... works with httpOnly cookie (authenticated calls)
#   5. All three roles (applicant, staff, admin) work
#   6. Invalid credentials return 401
#   7. Unauthenticated requests return 401
set -euo pipefail

QA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$QA_DIR/env.sh"
source "$QA_DIR/lib.sh"

# The Next.js proxy (not the Django API directly)
PROXY_URL="${PROXY_URL:-http://localhost:3000}"

TEMP_FILES=()

cleanup() {
  for f in "${TEMP_FILES[@]}"; do rm -f "$f" 2>/dev/null; done
}
trap cleanup EXIT

COOKIE_JAR=$(mktemp)
TEMP_FILES+=("$COOKIE_JAR")

PASSED=0
FAILED=0

# ── Helper: login via proxy, capture cookie + access token ───────
# Sets: LOGIN_STATUS, ACCESS_TOKEN, REFRESH_TOKEN
proxy_login() {
  local email="$1" password="$2"
  local out=$(mktemp)
  TEMP_FILES+=("$out")

  LOGIN_STATUS=$(curl -s -o "$out" -w '%{http_code}' \
    -X POST "$PROXY_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    -c "$COOKIE_JAR")

  local body
  body=$(cat "$out")
  ACCESS_TOKEN=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null || echo "")
  REFRESH_TOKEN=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh'])" 2>/dev/null || echo "")
}

# ── Helper: me request via Authorization header ─────────────────
# Sets: ME_STATUS, ME_BODY, ME_ROLE
me_with_auth() {
  local token="$1"
  local out=$(mktemp)
  TEMP_FILES+=("$out")

  ME_STATUS=$(curl -s -o "$out" -w '%{http_code}' \
    -H "Authorization: Bearer $token" \
    "$PROXY_URL/api/auth/me")

  ME_BODY=$(cat "$out")
  ME_ROLE=$(echo "$ME_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('role',''))" 2>/dev/null || echo "")
}

# ── Helper: me request via cookie ────────────────────────────────
# Sets: ME_STATUS, ME_BODY, ME_ROLE
me_with_cookie() {
  local out=$(mktemp)
  TEMP_FILES+=("$out")

  ME_STATUS=$(curl -s -o "$out" -w '%{http_code}' \
    -b "$COOKIE_JAR" \
    "$PROXY_URL/api/auth/me")

  ME_BODY=$(cat "$out")
  ME_ROLE=$(echo "$ME_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('role',''))" 2>/dev/null || echo "")
}

# ── Helper: proxy request via cookie ─────────────────────────────
# Sets: PROXY_STATUS, PROXY_BODY
proxy_with_cookie() {
  local api_path="$1"
  local out=$(mktemp)
  TEMP_FILES+=("$out")

  PROXY_STATUS=$(curl -s -o "$out" -w '%{http_code}' \
    -b "$COOKIE_JAR" \
    "$PROXY_URL/api/proxy/$api_path")

  PROXY_BODY=$(cat "$out")
}

# =================================================================
#  TEST GROUP: Platform Admin login flow
# =================================================================
header "Proxy Login: Platform Admin (admin@lucyapply.com)"

subheader "1. Login via proxy sets cookie and returns tokens"
proxy_login "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
assert_status 200 "$LOGIN_STATUS" "admin login"
[ -n "$ACCESS_TOKEN" ] || fail "No access token in login response"
[ -n "$REFRESH_TOKEN" ] || fail "No refresh token in login response"
pass "Login returned HTTP 200 with access + refresh tokens"

# Verify cookie was written to jar
COOKIE_VALUE=$(grep "access_token" "$COOKIE_JAR" | awk '{print $NF}' 2>/dev/null || echo "")
[ -n "$COOKIE_VALUE" ] || fail "access_token cookie not set in cookie jar"
pass "httpOnly cookie set in cookie jar"

subheader "2. /api/auth/me/ with Authorization header (post-login flow)"
me_with_auth "$ACCESS_TOKEN"
assert_status 200 "$ME_STATUS" "admin me (auth header)"
assert_json_eq "$ME_BODY" "role" "platformadmin" "admin role"
assert_json_eq "$ME_BODY" "email" "$ADMIN_EMAIL" "admin email"
pass "Me endpoint returns correct role + email via Authorization header"

subheader "3. /api/auth/me/ with httpOnly cookie (page-load flow)"
me_with_cookie
assert_status 200 "$ME_STATUS" "admin me (cookie)"
assert_json_eq "$ME_BODY" "role" "platformadmin" "admin role (cookie)"
assert_json_eq "$ME_BODY" "email" "$ADMIN_EMAIL" "admin email (cookie)"
pass "Me endpoint returns correct user via httpOnly cookie"

subheader "4. /api/proxy/ endpoint with cookie"
proxy_with_cookie "auth/me"
assert_status 200 "$PROXY_STATUS" "proxy auth/me"
assert_json_eq "$PROXY_BODY" "role" "platformadmin" "proxy role"
pass "Proxy endpoint works with httpOnly cookie"

PASSED=$((PASSED + 1))

# =================================================================
#  TEST GROUP: Applicant login flow
# =================================================================
header "Proxy Login: Applicant (alice@test.com)"

subheader "5. Applicant login via proxy"
proxy_login "$APPLICANT_EMAIL" "$APPLICANT_PASSWORD"
assert_status 200 "$LOGIN_STATUS" "applicant login"
[ -n "$ACCESS_TOKEN" ] || fail "No access token"
pass "Applicant login succeeded"

subheader "6. Applicant me via cookie"
me_with_cookie
assert_status 200 "$ME_STATUS" "applicant me (cookie)"
assert_json_eq "$ME_BODY" "role" "applicant" "applicant role"
assert_json_eq "$ME_BODY" "email" "$APPLICANT_EMAIL" "applicant email"
pass "Applicant me returns correct role + email"

subheader "7. Applicant proxy endpoint"
proxy_with_cookie "applicants/me"
assert_status 200 "$PROXY_STATUS" "proxy applicants/me"
pass "Proxy /api/proxy/applicants/me works with cookie"

PASSED=$((PASSED + 1))

# =================================================================
#  TEST GROUP: University Staff login flow
# =================================================================
header "Proxy Login: University Staff (staffadmin@univ.com)"

subheader "8. Staff login via proxy"
proxy_login "$STAFF_EMAIL" "$STAFF_PASSWORD"
assert_status 200 "$LOGIN_STATUS" "staff login"
[ -n "$ACCESS_TOKEN" ] || fail "No access token"
pass "Staff login succeeded"

subheader "9. Staff me via cookie"
me_with_cookie
assert_status 200 "$ME_STATUS" "staff me (cookie)"
assert_json_eq "$ME_BODY" "role" "universitystaff" "staff role"
assert_json_eq "$ME_BODY" "email" "$STAFF_EMAIL" "staff email"
pass "Staff me returns correct role + email"

PASSED=$((PASSED + 1))

# =================================================================
#  TEST GROUP: Error handling
# =================================================================
header "Proxy Login: Error handling"

subheader "10. Invalid credentials return 401"
INVALID_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$PROXY_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@lucyapply.com","password":"wrongpass"}')
assert_status 401 "$INVALID_STATUS" "invalid password"
pass "Invalid credentials correctly return 401"

subheader "11. Unauthenticated /api/auth/me/ returns 401"
UNAUTH_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  "$PROXY_URL/api/auth/me")
assert_status 401 "$UNAUTH_STATUS" "unauthenticated me"
pass "Unauthenticated me request correctly returns 401"

subheader "12. Error message from backend is propagated"
ERR_BODY=$(curl -s \
  -X POST "$PROXY_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"noone@nowhere.com","password":"testpass123!"}')
ERR_MSG=$(echo "$ERR_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))" 2>/dev/null || echo "")
if [ -n "$ERR_MSG" ]; then
  pass "Backend error message propagated: '$ERR_MSG'"
else
  fail "No error message in 401 response: $ERR_BODY"
fi

PASSED=$((PASSED + 1))

# =================================================================
#  TEST GROUP: Rate limit error is readable
# =================================================================
header "Proxy Login: Rate limit error formatting"

subheader "13. Non-2xx me response returns readable JSON error"
# Force a 401 by using an invalid token in the Authorization header
BAD_ME=$(mktemp)
TEMP_FILES+=("$BAD_ME")
BAD_ME_STATUS=$(curl -s -o "$BAD_ME" -w '%{http_code}' \
  -H "Authorization: Bearer invalidtoken123" \
  "$PROXY_URL/api/auth/me")
BAD_ME_BODY=$(cat "$BAD_ME")
# Should return JSON with error.message, not raw text
if echo "$BAD_ME_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'error' in d; assert 'message' in d.get('error',{})" 2>/dev/null; then
  pass "Non-2xx me response returns structured JSON: $(echo "$BAD_ME_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['error']['message'])")"
else
  fail "Non-2xx me response is not structured JSON: $BAD_ME_BODY"
fi

PASSED=$((PASSED + 1))

# =================================================================
#  Summary
# =================================================================
echo ""
echo "=============================================="
echo "  Proxy Login Flow: $PASSED groups passed, $FAILED failed"
echo "=============================================="

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
