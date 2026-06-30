#!/usr/bin/env bash
# FE-14: Login Redirect Logic — MFA state routing.
#
# Tests that /auth/me/ returns correct MFA fields per role.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-14: Login Redirect Logic"

# =================================================================
#  1. Staff login → /auth/me/ shows mfa_enabled=false initially
# =================================================================
header "1. Staff /auth/me/ returns mfa_enabled=false initially"

api_call GET "$BASE_URL/auth/me/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff me"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['role'] == 'universitystaff', 'Expected universitystaff'
assert d['mfa_enabled'] is False, 'Staff should have MFA disabled initially'
assert d['mfa_verified'] is False, 'Staff should have MFA unverified initially'
print('  role=%s mfa_enabled=%s mfa_verified=%s' % (d['role'], d['mfa_enabled'], d['mfa_verified']))
"
pass "Staff MFA shows disabled initially"

# =================================================================
#  2. Admin login → /auth/me/ shows mfa_enabled=false initially
# =================================================================
header "2. Admin /auth/me/ returns mfa_enabled=false initially"

api_call GET "$BASE_URL/auth/me/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin me"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['role'] == 'platformadmin', 'Expected platformadmin'
assert d['mfa_enabled'] is False, 'Admin should have MFA disabled initially'
assert d['mfa_verified'] is False, 'Admin should have MFA unverified initially'
print('  role=%s mfa_enabled=%s mfa_verified=%s' % (d['role'], d['mfa_enabled'], d['mfa_verified']))
"
pass "Admin MFA shows disabled initially"

# =================================================================
#  3. Applicant login → no MFA fields
# =================================================================
header "3. Applicant /auth/me/ has no MFA fields"

api_call GET "$BASE_URL/auth/me/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "applicant me"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['role'] == 'applicant', 'Expected applicant'
assert 'mfa_enabled' not in d, 'Applicant should not have mfa_enabled'
assert 'mfa_verified' not in d, 'Applicant should not have mfa_verified'
print('  role=%s (no MFA fields)' % d['role'])
"
pass "Applicant has no MFA fields"

# =================================================================
#  4. After MFA setup, mfa_enabled becomes true
# =================================================================
header "4. After MFA setup, mfa_enabled=true"

api_call POST "$BASE_URL/auth/mfa/setup/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "mfa setup"

api_call GET "$BASE_URL/auth/me/" "" "$STAFF_TOKEN"
assert_status 200 "$API_STATUS" "staff me after setup"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['mfa_enabled'] is True, 'Staff should have MFA enabled after setup'
assert d['mfa_verified'] is False, 'Staff should still not be verified'
print('  After setup: mfa_enabled=%s mfa_verified=%s' % (d['mfa_enabled'], d['mfa_verified']))
"
pass "MFA enabled after setup"

# =================================================================
#  5. Test access control: applicants cannot access MFA endpoints
# =================================================================
header "5. Applicants denied from MFA endpoints"

api_call POST "$BASE_URL/auth/mfa/setup/" "" "$TOKEN"
assert_status 403 "$API_STATUS" "applicant mfa setup"

api_call POST "$BASE_URL/auth/mfa/verify/" '{"code":"000000"}' "$TOKEN"
assert_status 403 "$API_STATUS" "applicant mfa verify"
pass "Applicants correctly denied from MFA endpoints"

# =================================================================
#  6. Delete TOTP device created during testing
# =================================================================
header "6. Clean up MFA device"

cd "$PROJECT_DIR" && venv/bin/python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucy_apply.settings_qa')
django.setup()
from django_otp.plugins.otp_totp.models import TOTPDevice
total, _ = TOTPDevice.objects.all().delete()
print('  Cleaned up %d TOTP device(s)' % total)
" 2>&1 | tail -1
pass "MFA device cleaned up"

echo ""
echo "  All FE-14 (login redirect) tests passed."
