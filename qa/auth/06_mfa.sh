#!/usr/bin/env bash
# QA regression: MFA setup, verify, and lockout flow.
# Tests the idempotency of MFA setup and the 5-attempt lockout.

set -euo pipefail

QA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$QA_DIR/env.sh"
source "$QA_DIR/setup.sh"

echo "=============================================="
echo "  MFA Flow: Setup, Verify & Lockout"
echo "=============================================="

# ── 1. MFA Setup ────────────────────────────────────
echo ""
echo "--- MFA Setup (first call) ---"
SETUP1=$(curl -s -X POST "${BASE_URL}/auth/mfa/setup/" \
    -H "Authorization: Bearer ${STAFF_TOKEN}" \
    -H 'Content-Type: application/json')
PROVISIONING_URI=$(echo "$SETUP1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('provisioning_uri',''))" 2>/dev/null || echo "")
if [ -n "$PROVISIONING_URI" ]; then
    echo "  PASS: First call returns provisioning_uri"
else
    echo "  FAIL: No provisioning_uri in response"
    echo "  $SETUP1"
    exit 1
fi

echo ""
echo "--- MFA Setup (second call — idempotent) ---"
SETUP2=$(curl -s -X POST "${BASE_URL}/auth/mfa/setup/" \
    -H "Authorization: Bearer ${STAFF_TOKEN}" \
    -H 'Content-Type: application/json')
URI2=$(echo "$SETUP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('provisioning_uri',''))" 2>/dev/null || echo "")
if [ -n "$URI2" ]; then
    echo "  PASS: Second call also returns provisioning_uri (idempotent)"
else
    echo "  FAIL: Second call did not return provisioning_uri"
    echo "  $SETUP2"
    exit 1
fi

# ── 2. MFA Verify ──────────────────────────────────
echo ""
echo "--- MFA Verify with wrong code (should return 400) ---"
VERIFY1=$(curl -s -X POST "${BASE_URL}/auth/mfa/verify/" \
    -H "Authorization: Bearer ${STAFF_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"code":"000000"}')
HTTP_CODE=$(echo "$VERIFY1" | python3 -c "import sys; d=__import__('json').load(sys.stdin); print(d.get('error',{}).get('code',''))" 2>/dev/null || echo "error")
REMAINING=$(echo "$VERIFY1" | python3 -c "import sys; d=__import__('json').load(sys.stdin); print(d.get('remaining_attempts','missing'))" 2>/dev/null || echo "")
if [ "$HTTP_CODE" = "400" ] && [ -n "$REMAINING" ]; then
    echo "  PASS: Wrong code returns 400 with remaining_attempts=$REMAINING"
else
    echo "  FAIL: Expected 400 with remaining_attempts"
    echo "  $VERIFY1"
    exit 1
fi

# ── 3. MFA on AuthMe (after setup, before verify) ──
echo ""
echo "--- AuthMe shows mfa_enabled and mfa_verified ---"
ME=$(curl -s "${BASE_URL}/auth/me/" \
    -H "Authorization: Bearer ${STAFF_TOKEN}")
MFA_ENABLED=$(echo "$ME" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mfa_enabled','missing'))" 2>/dev/null || echo "")
MFA_VERIFIED=$(echo "$ME" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mfa_verified','missing'))" 2>/dev/null || echo "")
if [ "$MFA_ENABLED" = "True" ] && [ "$MFA_VERIFIED" = "False" ]; then
    echo "  PASS: AuthMe shows mfa_enabled=True, mfa_verified=False"
else
    echo "  FAIL: Unexpected MFA status (enabled=$MFA_ENABLED, verified=$MFA_VERIFIED)"
    echo "  $ME"
    exit 1
fi

# ── 4. Applicant cannot access MFA endpoints ───────
echo ""
echo "--- Applicant denied from MFA endpoints ---"
MFA_AS_APP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/auth/mfa/setup/" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json')
if [ "$MFA_AS_APP" = "403" ]; then
    echo "  PASS: Applicant correctly denied from MFA setup (HTTP 403)"
else
    echo "  FAIL: Expected 403 for applicant MFA setup, got $MFA_AS_APP"
    exit 1
fi

echo ""
echo "  ✓ PASS: qa/auth/06_mfa.sh"
