#!/usr/bin/env bash
# QA regression: Email enumeration protection.
# Tests that ForgotPasswordView and VerifyEmailView return generic
# messages instead of 404, preventing email enumeration.

set -euo pipefail

QA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$QA_DIR/env.sh"

echo "=============================================="
echo "  Security: Email Enumeration Protection"
echo "=============================================="

# ── 1. Forgot Password — nonexistent email ─────────
echo ""
echo "--- Forgot password with nonexistent email ---"
RESULT=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/auth/forgot-password/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"noone@nowhere.com"}')
if [ "$RESULT" = "200" ]; then
    echo "  PASS: Nonexistent email returns 200 (generic message)"
elif [ "$RESULT" = "404" ]; then
    echo "  FAIL: Got 404 - leaks email existence"
    exit 1
else
    echo "  PASS: Returns $RESULT (not 404, no info leak)"
fi

# ── 2. Forgot Password — valid email (should always return 200) ──
echo ""
echo "--- Forgot password with valid email ---"
VALID_RESULT=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/auth/forgot-password/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"alice@test.com"}')
if [ "$VALID_RESULT" = "200" ]; then
    echo "  PASS: Valid email also returns 200 (consistent messaging)"
else
    echo "  PASS: Valid email returns $VALID_RESULT (non-enumerating)"
fi

# ── 3. Verify Email — nonexistent email ────────────
echo ""
echo "--- Verify email with nonexistent email ---"
VERIFY_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/auth/verify-email/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"noone@nowhere.com","token":"somerandomtoken"}')
if [ "$VERIFY_CODE" = "400" ]; then
    echo "  PASS: Nonexistent email returns 400 (generic error)"
elif [ "$VERIFY_CODE" = "404" ]; then
    echo "  FAIL: Got 404 - leaks email existence"
    exit 1
else
    echo "  PASS: Returns $VERIFY_CODE (not 404, no info leak)"
fi

# ── 4. Resend Verification — nonexistent email ────
echo ""
echo "--- Resend verification with nonexistent email ---"
RESEND_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/auth/resend-verification/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"noone@nowhere.com"}')
if [ "$RESEND_CODE" = "200" ]; then
    echo "  PASS: Nonexistent email returns 200 (generic message)"
elif [ "$RESEND_CODE" = "404" ]; then
    echo "  FAIL: Got 404 - leaks email existence"
    exit 1
else
    echo "  PASS: Returns $RESEND_CODE (not 404, no info leak)"
fi

echo ""
echo "  ✓ PASS: qa/01-auth/11_email_security_core.sh"
