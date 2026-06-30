#!/usr/bin/env bash
# FE-13: Admin Portal — Platform Stats Dashboard.
#
# Tests that the admin/stats/ endpoint returns expected data and
# supporting endpoints (universities, audit-log) are accessible.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lucy_apply.settings_qa}"
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "FE-13: Admin Portal — Platform Stats Dashboard"

# =================================================================
#  1. Fetch stats as platform admin
# =================================================================
header "1. Fetch platform stats"

api_call GET "$BASE_URL/admin/stats/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin stats"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
required_keys = [
    'total_applicants', 'total_universities', 'active_universities',
    'inactive_universities', 'total_programs', 'total_staff',
    'applications_by_status',
]
for key in required_keys:
    assert key in d, 'Missing key: %s' % key
apps_by_status = d['applications_by_status']
for sk in ['draft', 'submitted', 'under_review', 'admitted', 'rejected', 'waitlisted', 'accepted', 'declined']:
    assert sk in apps_by_status, 'Missing applications_by_status.%s' % sk
    assert isinstance(apps_by_status[sk], int), 'applications_by_status.%s not int' % sk
print('  total_applicants: %d' % d['total_applicants'])
print('  total_universities: %d' % d['total_universities'])
print('  total_programs: %d' % d['total_programs'])
print('  total_staff: %d' % d['total_staff'])
print('  apps_by_status: %s' % apps_by_status)
assert d['total_applicants'] >= 1, 'Expected >=1 applicant'
assert d['total_universities'] >= 1, 'Expected >=1 university'
assert d['total_programs'] >= 1, 'Expected >=1 program'
sum_apps = sum(apps_by_status.values())
assert sum_apps >= 1, 'Expected >=1 total application'
"
pass "Stats response shape validated"

# =================================================================
#  2. Fetch universities (for top universities table)
# =================================================================
header "2. Fetch universities list"

api_call GET "$BASE_URL/admin/universities/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin universities"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, 'Missing results key'
assert len(d['results']) >= 1, 'Expected >=1 university'
u = d['results'][0]
for key in ['id', 'name', 'status', 'application_count', 'program_count']:
    assert key in u, 'Missing key: %s in university' % key
print('  Universities count: %d' % len(d['results']))
print('  First university: %s (apps=%d, progs=%d)' % (u['name'], u.get('application_count', 0), u.get('program_count', 0)))
"
pass "Universities response shape validated"

# =================================================================
#  3. Fetch audit log (for recent activity)
# =================================================================
header "3. Fetch audit log (recent activity)"

api_call GET "$BASE_URL/admin/audit-log/" "" "$ADMIN_TOKEN"
assert_status 200 "$API_STATUS" "admin audit-log"

echo "$API_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'results' in d, 'Missing results key'
print('  Audit entries: %d' % len(d['results']))
"
pass "Audit log response shape validated"

# =================================================================
#  4. Non-admin access denied
# =================================================================
header "4. Non-admin access denied"

api_call GET "$BASE_URL/admin/stats/" "" "$TOKEN"
assert_status 403 "$API_STATUS" "non-admin stats"
pass "Non-admin correctly denied"

echo ""
echo "  All FE-13 (admin stats) tests passed."
