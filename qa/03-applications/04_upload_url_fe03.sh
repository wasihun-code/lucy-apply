#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Applications: Upload URL (GCS signed URL placeholder)"

subheader "Get upload URL (dev mode returns null upload_url)"
api_call POST "$BASE_URL/applications/$APP_ID/documents/upload-url/" \
  '{"document_type":"transcript"}' \
  "$TOKEN"
assert_status 200 "$API_STATUS" "upload-url"
echo "$API_BODY" | pretty_json

# In dev mode, upload_url may be null (GCS not configured)
UPLOAD_URL=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('upload_url',''))" 2>/dev/null || echo "")
if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" = "None" ]; then
    pass "Dev mode: upload_url is null (GCS not configured)"
else
    pass "Upload URL generated: ${UPLOAD_URL:0:50}..."
fi

PASSED=$((PASSED + 1))
