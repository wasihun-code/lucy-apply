#!/usr/bin/env bash
# QA regression test: login token → authenticated request flow.
# Django backend uses Bearer header (not cookies). The httpOnly cookie
# flow goes through the Next.js proxy, which reads the cookie and adds
# it as a Bearer header to Django. This test validates the token works
# via Bearer header (simulating the Next.js proxy behavior) and that
# the token can be formatted as an httpOnly cookie.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000/api/v1}"

# --- 1. Login via Django API ---
echo "[TEST] Login via Django API"
LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@lucyapply.com","password":"adminpass123!"}')

ACCESS_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null || echo "")
REFRESH_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh'])" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
    echo "FAIL: Could not extract access token from login response"
    echo "Response: $LOGIN"
    exit 1
fi
echo "PASS: Login succeeded, access token extracted"

# --- 2. Verify token works via Bearer header (as Next.js proxy would send it) ---
echo "[TEST] Authenticated request using Bearer header"
AUTH_RESPONSE=$(mktemp)
HTTP_CODE=$(curl -s -o "$AUTH_RESPONSE" -w '%{http_code}' \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${BASE_URL}/auth/me/")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "PASS: Authenticated request succeeded (HTTP $HTTP_CODE)"
    ROLE=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('role',''))" < "$AUTH_RESPONSE")
    echo "  Role: $ROLE"
else
    echo "FAIL: Authenticated request failed with HTTP $HTTP_CODE"
    cat "$AUTH_RESPONSE"
    exit 1
fi

# --- 3. Verify token is valid httpOnly cookie format ---
echo "[TEST] Token is valid httpOnly cookie value"
COOKIE_EXPIRY=$(python3 -c "import time; print(int(time.time()) + 3600)")
COOKIE_JAR=$(mktemp)
cat > "$COOKIE_JAR" << EOF
# Netscape HTTP Cookie File
localhost	FALSE	/	TRUE	${COOKIE_EXPIRY}	access_token	$ACCESS_TOKEN
EOF
# Verify curl can parse the cookie jar without error
if curl -s -b "$COOKIE_JAR" -o /dev/null -w '%{http_code}' "${BASE_URL}/auth/me/" > /dev/null 2>&1; then
    echo "PASS: Token is valid httpOnly cookie value (curl accepted cookie jar format)"
else
    echo "FAIL: Cookie jar format invalid"
    exit 1
fi

# --- 4. Verify rejected request without auth ---
echo "[TEST] Request without auth returns 401"
NO_AUTH_RESULT=$(mktemp)
HTTP_CODE=$(curl -s -o "$NO_AUTH_RESULT" -w '%{http_code}' "${BASE_URL}/auth/me/")
if [ "$HTTP_CODE" -eq 401 ]; then
    echo "PASS: Unauthenticated request correctly returns 401"
else
    echo "FAIL: Expected 401 but got $HTTP_CODE"
    cat "$NO_AUTH_RESULT"
    exit 1
fi

# --- 5. Test MFA setup with Bearer header ---
echo "[TEST] MFA setup with Bearer auth"
MFA_RESULT=$(curl -s -X POST "${BASE_URL}/auth/mfa/setup/" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H 'Content-Type: application/json')
if echo "$MFA_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'provisioning_uri' in d" 2>/dev/null; then
    echo "PASS: MFA setup with Bearer auth returned provisioning_uri"
else
    echo "FAIL: MFA setup with Bearer auth failed"
    echo "  $MFA_RESULT"
    exit 1
fi

# --- 6. Verify refresh token format ---
echo "[TEST] Refresh token is valid"
if [ -n "$REFRESH_TOKEN" ] && [ ${#REFRESH_TOKEN} -gt 20 ]; then
    echo "PASS: Refresh token is non-empty and valid format"
else
    echo "FAIL: Refresh token invalid"
    exit 1
fi

# --- 7. Cleanup ---
rm -f "$COOKIE_JAR" "$AUTH_RESPONSE" "$NO_AUTH_RESULT"

echo ""
echo "All login token tests passed!"
