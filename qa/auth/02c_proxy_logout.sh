#!/usr/bin/env bash
# QA regression test: Logout flow through Next.js proxy.
#
# Tests that:
#   1. Logout with valid cookie → 205, cookies cleared
#   2. /api/auth/me/ returns 401 after logout
#   3. Logout without auth header returns 401
#   4. Re-login after logout works (fresh session)
set -euo pipefail

QA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$QA_DIR/env.sh"
source "$QA_DIR/lib.sh"

PROXY_URL="${PROXY_URL:-http://localhost:3000}"

# Skip in QA pipeline — proxy tests need Next.js frontend with matching backend data.
if [ -n "${QA_PORT:-}" ]; then
  echo ""
  echo "=============================================="
  echo "  SKIPPED: Proxy test — requires Next.js frontend"
  echo "  Run 'npm run dev' in frontend/ and re-run without QA_PORT."
  echo "=============================================="
  exit 0
fi

PASSED=0
FAILED=0

# ── Helper: login and save cookies ───────────────────────────────
# Sets: LOGIN_CODE, ACCESS_TOKEN, sets COOKIE_JAR
login_and_capture() {
  COOKIE_JAR=$(mktemp)
  local out=$(mktemp)

  LOGIN_CODE=$(curl -s -o "$out" -w '%{http_code}' \
    -X POST "$PROXY_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
    -c "$COOKIE_JAR")

  ACCESS_TOKEN=$(cat "$out" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null || echo "")
}

# ── Helper: logout via proxy ─────────────────────────────────────
# Sets: LOGOUT_CODE
logout_via_proxy() {
  local jar="${1:-$COOKIE_JAR}"
  local out=$(mktemp)

  LOGOUT_CODE=$(curl -s -o "$out" -w '%{http_code}' \
    -b "$jar" \
    -c "${jar}_after" \
    -X POST "$PROXY_URL/api/auth/logout" \
    -H 'Content-Type: application/json' \
    -d '{}')

  LOGOUT_BODY=$(cat "$out")
  COOKIE_JAR_AFTER="${jar}_after"
}

# =================================================================
#  TEST GROUP: Logout flow
# =================================================================
header "Proxy Logout: Full flow"

subheader "1. Login then verify auth"
login_and_capture "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
assert_status 200 "$LOGIN_CODE" "login before logout"
ME_BEFORE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" "$PROXY_URL/api/auth/me")
assert_status 200 "$ME_BEFORE" "me before logout"
pass "Authenticated before logout"

subheader "2. Logout returns 205 and clears cookies"
logout_via_proxy
assert_status 205 "$LOGOUT_CODE" "logout status"
pass "Logout returned HTTP 205"

TOKEN_IN_JAR=$(grep -c "access_token" "$COOKIE_JAR_AFTER" 2>/dev/null || true)
if [ -z "$TOKEN_IN_JAR" ] || [ "$TOKEN_IN_JAR" = "0" ]; then
  pass "access_token cookie cleared after logout"
else
  fail "access_token cookie still present after logout ($TOKEN_IN_JAR entries)"
fi

subheader "3. Me after logout returns 401"
ME_AFTER=$(curl -s -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR_AFTER" "$PROXY_URL/api/auth/me")
assert_status 401 "$ME_AFTER" "me after logout"
pass "Unauthenticated after logout (HTTP 401)"

subheader "4. Logout without auth returns 401"
NOAUTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$PROXY_URL/api/auth/logout" \
  -H 'Content-Type: application/json' \
  -d '{}')
assert_status 401 "$NOAUTH_CODE" "logout without auth"
pass "Logout without auth correctly returns 401"

subheader "5. Re-login works after logout (fresh session)"
login_and_capture "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
assert_status 200 "$LOGIN_CODE" "re-login"
ME_RELOGIN=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" "$PROXY_URL/api/auth/me")
assert_status 200 "$ME_RELOGIN" "me after re-login"
pass "Re-login after logout works"

PASSED=$((PASSED + 1))

# =================================================================
#  Cleanup
# =================================================================
rm -f "$COOKIE_JAR" "$COOKIE_JAR_AFTER" 2>/dev/null || true

echo ""
echo "=============================================="
echo "  Proxy Logout Flow: $PASSED groups passed, $FAILED failed"
echo "=============================================="

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
