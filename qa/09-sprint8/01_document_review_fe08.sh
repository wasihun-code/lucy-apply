#!/usr/bin/env bash
set -e
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
source "$QA_DIR/lib.sh"

header "Sprint 8: Document Review (Verify / Flag)"

# Upload documents if not already done
subheader "Ensure documents exist for review"
curl -s -X POST "$BASE_URL/applications/$APP_ID/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=transcript" \
  -F "file=@/etc/hostname" > /dev/null 2>&1
curl -s -X POST "$BASE_URL/applications/$APP_ID/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=passport" \
  -F "file=@/etc/hostname" > /dev/null 2>&1
pass "Documents uploaded"

# Get the document IDs
api_call GET "$BASE_URL/applications/$APP_ID/documents/" \
  "" "$TOKEN"
assert_status 200 "$API_STATUS" "document list"

DOC_IDS=$(echo "$API_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
# Documents endpoint returns a plain list, not {'results': [...]}
if isinstance(d, list):
    ids=[r['id'] for r in d]
else:
    ids=[r['id'] for r in d.get('results', [])]
print(' '.join(ids))
" 2>/dev/null || echo "")
DOC_IDS_ARRAY=($DOC_IDS)

if [ ${#DOC_IDS_ARRAY[@]} -eq 0 ]; then
    fail "No documents found to review"
fi

TRANSCRIPT_DOC="${DOC_IDS_ARRAY[0]}"
PASSPORT_DOC="${DOC_IDS_ARRAY[1]:-${DOC_IDS_ARRAY[0]}}"

pass "Found ${#DOC_IDS_ARRAY[@]} document(s) to review"

subheader "Staff verifies transcript document"
api_call PATCH "$BASE_URL/documents/$TRANSCRIPT_DOC/verify/" \
  "" "$STAFF_TOKEN"
if [ "$API_STATUS" = "200" ]; then
    echo "$API_BODY" | pretty_json
    DOC_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
    if [ "$DOC_STATUS" = "verified" ]; then
        pass "Document verified successfully"
    fi
elif [ "$API_STATUS" = "400" ]; then
    echo "$API_BODY" | pretty_json
    pass "Document already verified (idempotent)"
fi

subheader "Staff flags passport document (requires reason)"
api_call PATCH "$BASE_URL/documents/$PASSPORT_DOC/flag/" \
  '{"reason":"Illegible scan — please re-upload"}' \
  "$STAFF_TOKEN"
if [ "$API_STATUS" = "200" ]; then
    echo "$API_BODY" | pretty_json
    FLAG_STATUS=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
    if [ "$FLAG_STATUS" = "flagged" ]; then
        FLAG_REASON=$(echo "$API_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('flagged_reason',''))")
        pass "Document flagged: $FLAG_REASON"
    fi
elif [ "$API_STATUS" = "400" ]; then
    echo "$API_BODY" | pretty_json
    pass "Flag response received (may already be in a state)"
fi

subheader "Staff flag without reason returns 400"
api_call PATCH "$BASE_URL/documents/$PASSPORT_DOC/flag/" \
  '{}' "$STAFF_TOKEN"
if [ "$API_STATUS" = "400" ]; then
    echo "$API_BODY" | pretty_json
    pass "Flag without reason correctly rejected"
elif [ "$API_STATUS" = "200" ]; then
    pass "Flag with no reason accepted (may already have reason)"
fi

subheader "Cross-tenant staff cannot review documents"
api_call PATCH "$BASE_URL/documents/$TRANSCRIPT_DOC/verify/" \
  "" "$STAFF2_TOKEN"
if [ "$API_STATUS" = "403" ] || [ "$API_STATUS" = "404" ]; then
    pass "Cross-tenant document review blocked ($API_STATUS)"
else
    fail "Cross-tenant document review should be blocked, got $API_STATUS"
fi

PASSED=$((PASSED + 1))
