#!/usr/bin/env bash
# FE-14: MFA Setup and Verify Flow.
#
# Tests MFA setup endpoint, wrong code rejection, and lockout.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-14: MFA Setup and Verify"

# =================================================================
#  1. Staff auth/me/ returns mfa_enabled and mfa_verified
# =================================================================
header "1. Staff /auth/me/ returns MFA fields"

api_call GET "$BASE_URL/auth/me/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff me"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['role'] == 'universitystaff', 'Expected universitystaff role'
assert 'mfa_enabled' in d, 'Missing mfa_enabled'
assert 'mfa_verified' in d, 'Missing mfa_verified'
print('  mfa_enabled: %s, mfa_verified: %s' % (d['mfa_enabled'], d['mfa_verified']))
"
pass "Staff MFA fields present"

# =================================================================
#  2. Applicant auth/me/ does NOT have MFA fields
# =================================================================
header "2. Applicant /auth/me/ has no MFA fields"

api_call GET "$BASE_URL/auth/me/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "applicant me"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['role'] == 'applicant', 'Expected applicant role'
assert 'mfa_enabled' not in d, 'mfa_enabled should not be present for applicant'
assert 'mfa_verified' not in d, 'mfa_verified should not be present for applicant'
"
pass "Applicant has no MFA fields"

# =================================================================
#  3. Admin auth/me/ returns MFA fields
# =================================================================
header "3. Admin /auth/me/ returns MFA fields"

api_call GET "$BASE_URL/auth/me/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin me"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['role'] == 'platformadmin', 'Expected platformadmin role'
assert 'mfa_enabled' in d, 'Missing mfa_enabled'
assert 'mfa_verified' in d, 'Missing mfa_verified'
"
pass "Admin MFA fields present"

# =================================================================
#  4. MFA setup returns provisioning_uri
# =================================================================
header "4. POST /auth/mfa/setup/"

api_call POST "$BASE_URL/auth/mfa/setup/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "mfa setup"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'provisioning_uri' in d, 'Missing provisioning_uri'
uri = d['provisioning_uri']
assert uri.startswith('otpauth://'), 'provisioning_uri should start with otpauth://'
print('  provisioning_uri: %s' % uri)
"
pass "MFA setup returns valid provisioning_uri"

# =================================================================
#  5. MFA verify with wrong code returns 400 + remaining_attempts
# =================================================================
header "5. POST /auth/mfa/verify/ with wrong code"

api_call POST "$BASE_URL/auth/mfa/verify/" '{"code":"000000"}' "$STAFF_TOKEN"
assert_status 400 "$API_STATUS" "mfa verify wrong code"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'remaining_attempts' in d, 'Missing remaining_attempts'
remaining = d['remaining_attempts']
assert isinstance(remaining, int), 'remaining_attempts must be int'
assert remaining >= 0, 'remaining_attempts should be >= 0'
print('  remaining_attempts: %d' % remaining)
assert d['error']['code'] == '400', 'Expected error code 400'
assert 'message' in d['error'], 'Missing error message'
"
pass "Wrong code returns remaining_attempts"

# =================================================================
#  6. Repeated wrong codes trigger lockout (429)
#    Note: Lockout uses Django sessions, so we use a cookie jar
#    to persist the session across requests.
# =================================================================
header "6. Repeated wrong codes → lockout (429)"

COOKIE_JAR=$(mktemp)
cleanup_cookies() { rm -f "$COOKIE_JAR"; }
trap cleanup_cookies EXIT

for i in $(seq 1 5); do
  LOCKOUT_OUTPUT=$(curl -s -X POST "$BASE_URL/auth/mfa/verify/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $STAFF_TOKEN" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -d '{"code":"000001"}' \
    -w '\n%{http_code}')
  LOCKOUT_BODY=$(echo "$LOCKOUT_OUTPUT" | sed '$d')
  LOCKOUT_STATUS=$(echo "$LOCKOUT_OUTPUT" | tail -1)
  if [ "$LOCKOUT_STATUS" = "429" ]; then
    echo "  Lockout triggered after $i wrong attempts"
    break
  fi
done

if [ "$LOCKOUT_STATUS" != "429" ]; then
  fail "Expected lockout (429) after repeated wrong codes, got HTTP $LOCKOUT_STATUS"
fi

echo "$LOCKOUT_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['error']['code'] == '429', 'Expected error code 429'
print('  Lockout message: %s' % d['error']['message'])
"
pass "Lockout correctly triggered"

# =================================================================
#  7. Delete TOTP device so later tests aren't blocked
# =================================================================
header "7. Delete MFA device for subsequent tests"

cd "$PROJECT_DIR" && venv/bin/python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings_qa')
django.setup()
from django.contrib.contenttypes.models import ContentType
from django_otp.plugins.otp_totp.models import TOTPDevice
total, _ = TOTPDevice.objects.all().delete()
print('  Deleted %d TOTP device(s)' % total)
" 2>&1 | tail -1
pass "MFA device deleted"

echo ""
echo "  All FE-14 (MFA setup) tests passed."
