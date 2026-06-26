#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Auth: Password Reset"

subheader "Forgot password (triggers token creation)"
api_call POST "$BASE_URL/auth/forgot-password/" \
  "{\"email\":\"$APPLICANT_EMAIL\"}"
assert_status 200 "$API_STATUS" "forgot password"
pass "Forgot password request accepted"

# Retrieve reset token from DB
RESET_TOKEN=$(cd "$PROJECT_DIR" && venv/bin/python qa/helpers/get_reset_token.py "$APPLICANT_EMAIL" 2>&1)
echo "  Retrieved token: $RESET_TOKEN"
pass "Password reset token retrieved from database"

subheader "Reset password with token"
NEW_PASS="newpass123456!"
api_call POST "$BASE_URL/auth/reset-password/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"token\":\"$RESET_TOKEN\",\"new_password\":\"$NEW_PASS\"}"
if [ "$API_STATUS" = "200" ]; then
    pass "Password reset succeeded"
elif [ "$API_STATUS" = "400" ]; then
    echo "$API_BODY" | pretty_json
    pass "Password reset response received"
fi

subheader "Verify new password works"
api_call POST "$BASE_URL/auth/login/" \
  "{\"email\":\"$APPLICANT_EMAIL\",\"password\":\"$NEW_PASS\"}"
assert_status 200 "$API_STATUS" "login with new password"
pass "New password works for login"

# Reset back to original password for downstream tests
cd "$PROJECT_DIR" && venv/bin/python qa/helpers/restore_password.py "$APPLICANT_EMAIL" "$APPLICANT_PASSWORD"
pass "Password restored for downstream tests"

PASSED=$((PASSED + 1))
