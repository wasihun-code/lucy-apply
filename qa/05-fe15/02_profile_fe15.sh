#!/usr/bin/env bash
# FE-15: Applicant Profile page.
#
# Tests GET/PATCH /api/v1/applicants/me/ and the
# forgot-password flow for authenticated password changes.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-15: Applicant Profile"

# =================================================================
#  1. GET /applicants/me/ returns full profile for Alice
# =================================================================
header "1. GET applicants/me/ returns profile fields"

api_call GET "$BASE_URL/applicants/me/" "" "$TOKEN"
assert_status 200 "$API_STATUS" "applicant me"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['email'] == '$APPLICANT_EMAIL', 'Expected applicant email'
assert d['full_name'] == '$APPLICANT_FULL_NAME', 'Expected full_name'
assert d['country_of_residence'] == '$APPLICANT_COUNTRY', 'Expected country_of_residence'
assert 'date_of_birth' in d, 'date_of_birth field required'
assert 'nationality' in d, 'nationality field required'
assert d['email_verified'] == True, 'Expected email_verified'
print('  email=%s full_name=%s country=%s verified=%s' % (d['email'], d['full_name'], d['country_of_residence'], d['email_verified']))
"
pass "Profile fields match"

# =================================================================
#  2. PATCH /applicants/me/ updates writable fields
# =================================================================
header "2. PATCH applicants/me/ updates writable fields"

PATCH_DATA='{"full_name": "Alice Updated", "country_of_residence": "Tanzania", "nationality": "Tanzanian"}'
api_call PATCH "$BASE_URL/applicants/me/" "$PATCH_DATA" "$TOKEN"
assert_status 200 "$API_STATUS" "applicant me patch"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['full_name'] == 'Alice Updated', 'full_name not updated'
assert d['country_of_residence'] == 'Tanzania', 'country_of_residence not updated'
assert d['nationality'] == 'Tanzanian', 'nationality not updated'
print('  full_name=%s country=%s nationality=%s' % (d['full_name'], d['country_of_residence'], d['nationality']))
"
pass "Writable fields updated"

# =================================================================
#  3. PATCH restores original values
# =================================================================
header "3. Restore original profile values"

PATCH_DATA='{"full_name": "'"$APPLICANT_FULL_NAME"'", "country_of_residence": "'"$APPLICANT_COUNTRY"'", "nationality": ""}'
api_call PATCH "$BASE_URL/applicants/me/" "$PATCH_DATA" "$TOKEN"
assert_status 200 "$API_STATUS" "restore profile"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['full_name'] == '$APPLICANT_FULL_NAME', 'full_name not restored'
print('  restored to: full_name=%s country=%s' % (d['full_name'], d['country_of_residence']))
"
pass "Profile restored"

# =================================================================
#  4. Email field is read-only — PATCH should ignore email changes
# =================================================================
header "4. Email is read-only — PATCH ignores email"

PATCH_DATA='{"email": "hacker@evil.com"}'
api_call PATCH "$BASE_URL/applicants/me/" "$PATCH_DATA" "$TOKEN"
assert_status 200 "$API_STATUS" "patch email ignored"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['email'] == '$APPLICANT_EMAIL', 'Email should not change'
print('  email unchanged: %s' % d['email'])
"
pass "Email is read-only"

# =================================================================
#  5. Date of birth can be updated
# =================================================================
header "5. Date of birth is writable"

PATCH_DATA='{"date_of_birth": "2001-01-01"}'
api_call PATCH "$BASE_URL/applicants/me/" "$PATCH_DATA" "$TOKEN"
assert_status 200 "$API_STATUS" "patch dob"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['date_of_birth'] == '2001-01-01', 'DOB not updated: %s' % d.get('date_of_birth')
print('  date_of_birth updated to: %s' % d['date_of_birth'])
"
# Restore original DOB
PATCH_DATA='{"date_of_birth": ""}'
api_call PATCH "$BASE_URL/applicants/me/" "$PATCH_DATA" "$TOKEN"
pass "Date of birth is writable"

# =================================================================
#  6. Forgot-password endpoint accepts applicant email
# =================================================================
header "6. Forgot-password accepts applicant email"

api_call POST "$BASE_URL/auth/forgot-password/" '{"email": "'"$APPLICANT_EMAIL"'"}' ""
assert_status 200 "$API_STATUS" "forgot password"
echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'detail' in d, 'Expected detail in response'
print('  detail=%s' % d['detail'])
"
pass "Forgot-password succeeds"

echo ""
echo "=============================================="
echo "  ALL FE-15 PROFILE QA CHECKS PASSED"
echo "=============================================="
