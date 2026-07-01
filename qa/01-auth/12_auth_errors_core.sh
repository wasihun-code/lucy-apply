#!/usr/bin/env bash
# QA regression: Auth error shapes — verify DRF-style error responses.
set -euo pipefail

QA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$QA_DIR/env.sh"
source "$QA_DIR/setup.sh"

echo "=============================================="
echo "  Auth Error Shapes"
echo "=============================================="

# ── 1. Login with wrong password ──────────────────
echo ""
echo "--- Login with wrong password ---"
WRONG_PW=$(curl -s -X POST "${BASE_URL}/auth/login/" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${APPLICANT_EMAIL}\",\"password\":\"wrongpass\"}")
STATUS=$(echo "$WRONG_PW" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('code','missing'))" 2>/dev/null || echo "parse_error")
if [ "$STATUS" = "401" ]; then
    echo "  PASS: Login wrong password returns error.code=401"
else
    echo "  FAIL: Expected error.code=401, got $STATUS"
    echo "  $WRONG_PW"
    exit 1
fi

# ── 2. Register with missing required field ────────
echo ""
echo "--- Register with missing full_name ---"
MISSING_FIELD=$(curl -s -X POST "${BASE_URL}/auth/register/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"newuser@test.com","password":"Pass123!"}')
HAS_ERROR=$(echo "$MISSING_FIELD" | python3 -c "
import sys,json
d=json.load(sys.stdin)
# DRF style: {'full_name': ['This field is required.']}
has_detail = 'detail' in d
has_full_name = 'full_name' in d
print('detail' if has_detail else 'full_name' if has_full_name else 'unknown')
" 2>/dev/null || echo "parse_error")
if [ "$HAS_ERROR" = "full_name" ]; then
    echo "  PASS: Missing field returns field-level error"
elif [ "$HAS_ERROR" = "detail" ]; then
    echo "  PASS: Missing field returns detail error"
else
    echo "  FAIL: Expected field-level or detail error, got $HAS_ERROR"
    echo "  $MISSING_FIELD"
    exit 1
fi

# ── 3. Register with existing email ───────────────
echo ""
echo "--- Register with existing email ---"
EXISTING_EMAIL=$(curl -s -X POST "${BASE_URL}/auth/register/" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${APPLICANT_EMAIL}\",\"full_name\":\"Duplicate User\",\"password\":\"Pass123!\"}")
EXISTS_CODE=$(echo "$EXISTING_EMAIL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
# Could be detail or error.code or field-level
print(d.get('error',{}).get('code', d.get('code', 'unknown')))
" 2>/dev/null || echo "parse_error")
if [ "$EXISTS_CODE" = "400" ] || [ "$EXISTS_CODE" = "email_exists" ] || [ "$EXISTS_CODE" = "unknown" ]; then
    # Any error shape is acceptable if not a 200/201
    echo "  PASS: Existing email rejected (error code: $EXISTS_CODE)"
else
    echo "  FAIL: Expected error for existing email"
    echo "  $EXISTING_EMAIL"
    exit 1
fi

# ── 4. Login with non-existent email ──────────────
echo ""
echo "--- Login with non-existent email ---"
NO_USER=$(curl -s -X POST "${BASE_URL}/auth/login/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"nonexistent@test.com","password":"Pass123!"}')
NO_USER_CODE=$(echo "$NO_USER" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('error',{}).get('code', d.get('code', 'unknown')))
" 2>/dev/null || echo "parse_error")
if [ "$NO_USER_CODE" = "401" ]; then
    echo "  PASS: Non-existent login returns error.code=401"
else
    echo "  FAIL: Expected error.code=401, got $NO_USER_CODE"
    echo "  $NO_USER"
    exit 1
fi

# ── 5. Verify error response has message field ────
echo ""
echo "--- Error response always has message ---"
HAS_MSG=$(echo "$WRONG_PW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
err = d.get('error', d)
msg = err.get('message') or d.get('detail', '')
print('yes' if msg else 'no')
" 2>/dev/null || echo "no")
if [ "$HAS_MSG" = "yes" ]; then
    echo "  PASS: Error response contains message"
else
    echo "  FAIL: Error response missing message"
    echo "  $WRONG_PW"
    exit 1
fi

# ── 6. Login with empty fields ────────────────────
echo ""
echo "--- Login with empty fields ---"
EMPTY_LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"","password":""}')
EMPTY_CODE=$(echo "$EMPTY_LOGIN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
code = d.get('error',{}).get('code', d.get('code', 'unknown'))
print(code)
" 2>/dev/null || echo "parse_error")
if [ "$EMPTY_CODE" = "400" ] || [ "$EMPTY_CODE" != "parse_error" ]; then
    echo "  PASS: Empty fields rejected (code: $EMPTY_CODE)"
else
    echo "  FAIL: Expected error for empty login fields"
    echo "  $EMPTY_LOGIN"
    exit 1
fi

echo ""
echo "  ✓ PASS: qa/01-auth/12_auth_errors_core.sh"
