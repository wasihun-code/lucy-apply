#!/usr/bin/env bash
# QA regression: Deactivated account login returns 403, not 401.
# Ensures no info leak about which accounts exist.

set -euo pipefail

QA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$QA_DIR/env.sh"
source "$QA_DIR/setup.sh"

PROJECT_DIR="$(cd "$QA_DIR/.." && pwd)"

echo "=============================================="
echo "  Security: Deactivated Login Returns 403"
echo "=============================================="

# ── 1. Create a staff user directly (needs password) ──
echo ""
echo "--- Create deactivatable staff user ---"
CREATE_OUTPUT=$(cd "$PROJECT_DIR" && DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa venv/bin/python -c "
import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'lucy_apply.settings_qa'
os.environ['OPENSE_TESTING'] = 'true'
django.setup()
from identity.models import UniversityStaff
from universities.models import University
u = University.objects.get(name='Test University')
staff, created = UniversityStaff.objects.get_or_create(
    email='deactivateme@test.com',
    defaults={
        'full_name': 'Deactivate Me',
        'university': u,
        'permission_level': 'officer',
    },
)
if created:
    staff.set_password('testpass123!')
    staff.save()
print(staff.id)
")
if [ -z "$CREATE_OUTPUT" ]; then
    echo "  FAIL: Could not create deactivated user"
    exit 1
fi
echo "  PASS: Created staff user $CREATE_OUTPUT"

# Deactivate via DELETE staff endpoint
echo ""
echo "--- Deactivate via DELETE staff/{id}/ ---"
DEACTIVATE_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
    "${BASE_URL}/universities/${UNIVERSITY_ID}/staff/${CREATE_OUTPUT}/" \
    -H "Authorization: Bearer ${STAFF_TOKEN}")
if [ "$DEACTIVATE_CODE" = "200" ]; then
    echo "  PASS: Staff deactivated (HTTP 200)"
else
    echo "  FAIL: Expected 200, got $DEACTIVATE_CODE"
    exit 1
fi

# ── 2. Login as deactivated user ──────────────────
echo ""
echo "--- Login as deactivated user (expect 403) ---"
LOGIN_RESULT=$(curl -s -w '\n%{http_code}' -X POST "${BASE_URL}/auth/login/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"deactivateme@test.com","password":"testpass123!"}')
HTTP_CODE=$(echo "$LOGIN_RESULT" | tail -1)
BODY=$(echo "$LOGIN_RESULT" | head -n -1)

if [ "$HTTP_CODE" = "403" ]; then
    echo "  PASS: Deactivated login returns 403"
    ERROR_MSG=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))" 2>/dev/null || echo "")
    if echo "$ERROR_MSG" | grep -qi "Invalid credentials"; then
        echo "  PASS: Error message is generic ('$ERROR_MSG')"
    else
        echo "  FAIL: Error message should be generic, got: $ERROR_MSG"
        exit 1
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    echo "  FAIL: Got 401 - leaks account existence info"
    echo "  $BODY"
    exit 1
else
    echo "  FAIL: Expected 403, got $HTTP_CODE"
    echo "  $BODY"
    exit 1
fi

# ── 3. Nonexistent email returns 401 (no info leak) ──
echo ""
echo "--- Login with nonexistent email ---"
NONEXIST_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/auth/login/" \
    -H 'Content-Type: application/json' \
    -d '{"email":"nonexistent@nowhere.com","password":"random123!"}')
if [ "$NONEXIST_CODE" = "401" ]; then
    echo "  PASS: Nonexistent email returns 401 (no info leak)"
else
    echo "  FAIL: Expected 401, got $NONEXIST_CODE"
    exit 1
fi

echo ""
echo "  ✓ PASS: qa/01-auth/10_deactivated_login_core.sh"
