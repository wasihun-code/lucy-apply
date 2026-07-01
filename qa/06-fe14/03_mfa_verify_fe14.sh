#!/usr/bin/env bash
# FE-14: MFA Happy Path — Setup, generate valid code, verify, confirm mfa_verified.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-14: MFA Happy Path (setup → verify → confirmed)"

# =================================================================
#  1. Login as staff, get token
# =================================================================
header "1. Staff login"

LOGIN=$(curl -s -X POST "$BASE_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STAFF_EMAIL\",\"password\":\"$STAFF_PASSWORD\"}")
STAFF_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")
assert_json_eq "$LOGIN" "email" "$STAFF_EMAIL" "login email"
pass "Staff logged in"

# =================================================================
#  2. MFA Setup — get provisioning_uri
# =================================================================
header "2. POST /auth/mfa/setup/"

SETUP=$(curl -s -X POST "$BASE_URL/auth/mfa/setup/" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json")
assert_json_eq "$SETUP" "detail" "MFA setup initiated. Use the provisioning URI to configure your authenticator app." "setup detail"
PROVISIONING_URI=$(echo "$SETUP" | python3 -c "import sys,json; print(json.load(sys.stdin)['provisioning_uri'])")
echo "  provisioning_uri: $PROVISIONING_URI"
pass "MFA setup returned provisioning_uri"

# =================================================================
#  3. btoa check / TOTP code generation
# =================================================================
header "3. Generate valid TOTP code from provisioning_uri"

# Extract secret from otpauth:// URI and generate code via python3
TOTP_CODE=$(cd "$PROJECT_DIR" && venv/bin/python3 -c "
from urllib.parse import urlparse, parse_qs
uri = '$PROVISIONING_URI'
parsed = urlparse(uri)
params = parse_qs(parsed.query)
secret = params['secret'][0]
import pyotp
totp = pyotp.TOTP(secret)
print(totp.now())
" 2>/dev/null) || TOTP_CODE=""

if [ -z "$TOTP_CODE" ]; then
  # Fallback: try oathtool
  SECRET=$(echo "$PROVISIONING_URI" | python3 -c "
import sys
from urllib.parse import urlparse, parse_qs
uri = sys.stdin.read().strip()
parsed = urlparse(uri)
params = parse_qs(parsed.query)
print(params['secret'][0])")
  TOTP_CODE=$(oathtool --totp -b "$SECRET" 2>/dev/null) || TOTP_CODE=""
fi

if [ -n "$TOTP_CODE" ]; then
  echo "  Generated TOTP code: $TOTP_CODE"
  pass "Generated valid TOTP code"
else
  fail "Could not generate TOTP code — install pyotp (pip install pyotp) or oathtool"
fi

# =================================================================
#  4. Verify with correct code → success
# =================================================================
header "4. POST /auth/mfa/verify/ with correct code"

VERIFY=$(curl -s -X POST "$BASE_URL/auth/mfa/verify/" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$TOTP_CODE\"}")
assert_json_eq "$VERIFY" "detail" "MFA verification successful." "verify detail"
pass "MFA verified with correct code"

# =================================================================
#  5. Confirm mfa_verified=True on /auth/me/
# =================================================================
header "5. /auth/me/ shows mfa_verified=True"

ME=$(curl -s "$BASE_URL/auth/me/" \
  -H "Authorization: Bearer $STAFF_TOKEN")
MFA_VERIFIED=$(echo "$ME" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mfa_verified','missing'))")
if [ "$MFA_VERIFIED" = "True" ]; then
  pass "auth/me/ shows mfa_verified=True"
else
  fail "Expected mfa_verified=True, got $MFA_VERIFIED"
fi

# =================================================================
#  6. Clean up TOTP device for subsequent tests
# =================================================================
header "6. Delete MFA device"

cd "$PROJECT_DIR" && venv/bin/python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings_qa')
django.setup()
from django_otp.plugins.otp_totp.models import TOTPDevice
total, _ = TOTPDevice.objects.all().delete()
print('  Deleted %d TOTP device(s)' % total)
" 2>&1 | tail -1
pass "MFA device deleted"

echo ""
echo "  All FE-14 MFA happy path tests passed."
