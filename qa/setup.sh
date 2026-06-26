#!/usr/bin/env bash
# ======================================================================
# setup.sh — QA Regression Suite Setup
# ======================================================================
# Sources env.sh, creates/retrieves all test data idempotently via
# setup_data.py, and exports tokens + IDs into the current shell.
#
# Usage in test scripts:
#   source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
#   source "$(cd "$(dirname "$0")/.." && pwd)/setup.sh"

QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$QA_DIR/env.sh"

# ── Run Django setup script ───────────────────────────────────
# Outputs: export TOKEN='...', export APP_ID='...', etc.
SETUP_OUTPUT=$(cd "$PROJECT_DIR" && venv/bin/python qa/setup_data.py 2>&1)
if [ $? -ne 0 ]; then
    echo "FATAL: setup_data.py failed:" >&2
    echo "$SETUP_OUTPUT" >&2
    exit 1
fi

eval "$SETUP_OUTPUT"

# ── Verify critical exports ────────────────────────────────────
: "${TOKEN:?setup_data.py did not export TOKEN}"
: "${UNIVERSITY_ID:?setup_data.py did not export UNIVERSITY_ID}"
: "${PROGRAM_ID:?setup_data.py did not export PROGRAM_ID}"
: "${CYCLE_ID:?setup_data.py did not export CYCLE_ID}"
: "${APP_ID:?setup_data.py did not export APP_ID}"
