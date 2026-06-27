#!/usr/bin/env bash
# ======================================================================
# run_all.sh — QA Regression Suite Entry Point (Isolated Mode)
# ======================================================================
# Automatically:
#   1. Creates an isolated QA database (qa_db.sqlite3)
#   2. Applies migrations & seeds test data
#   3. Starts a QA Django server on port 8001
#   4. Discovers and executes every *.sh test script under qa/,
#      excluding env.sh, setup.sh, lib.sh, run_all.sh, and browser/
#   5. Tears down the server and QA database
#
# NEVER touches the development database (db.sqlite3).
#
# Usage:
#   bash qa/run_all.sh

set -e

QA_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$QA_DIR/env.sh"

cd "$PROJECT_DIR"

# ── Pre-flight checks ────────────────────────────────────────────
if [ ! -f manage.py ]; then
    echo "FATAL: manage.py not found in $PROJECT_DIR"
    exit 1
fi

# Clean up any leftover QA environment from a previous run
bash qa/teardown.sh 2>&1 | tail -2
echo ""

# ── Step 1: Setup isolated QA database ───────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 1: Creating isolated QA database                  ║"
echo "╚══════════════════════════════════════════════════════════╝"

bash qa/setup_db.sh
echo ""

# ── Step 2: Seed test data ──────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 2: Seeding test data                              ║"
echo "╚══════════════════════════════════════════════════════════╝"

QA_SEED_OUTPUT=$(cd "$PROJECT_DIR" && \
    DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa \
    venv/bin/python qa/setup_data.py 2>&1)
eval "$QA_SEED_OUTPUT"
echo "  Test data seeded."
echo ""

# ── Step 3: Start QA server ─────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 3: Starting QA server (isolated DB)               ║"
echo "╚══════════════════════════════════════════════════════════╝"

QA_PORT=$(bash qa/run_server.sh)

# Override BASE_URL for all test scripts to point to QA server
export QA_PORT
export BASE_URL="http://localhost:$QA_PORT/api/v1"
# All test scripts sourcing env.sh use ${BASE_URL:-...} so this takes effect

# Ensure setup.sh → setup_data.py uses the QA settings, not dev settings
export DJANGO_SETTINGS_MODULE="lucy_apply.settings_qa"
echo ""

# ── Step 4: Discover & run test scripts ──────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 4: Running test scripts                           ║"
echo "╚══════════════════════════════════════════════════════════╝"

EXCLUDE_PATTERNS="/(env|setup|lib|run_all|setup_db|run_server|teardown)\.sh$"
TEST_SCRIPTS=()
while IFS= read -r -d '' script; do
    if [[ ! "$script" =~ $EXCLUDE_PATTERNS ]] && [[ "$script" != */browser/* ]]; then
        TEST_SCRIPTS+=("$script")
    fi
done < <(find qa -name '*.sh' -print0 | sort -z)

TOTAL=${#TEST_SCRIPTS[@]}
PASSED=0
FAILED=0
FAILED_SCRIPTS=()

echo "Discovered $TOTAL test scripts"
echo ""

# Trap to ensure cleanup even if a test script fails or user interrupts
cleanup() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  CLEANUP: Tearing down QA environment                   ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    bash qa/teardown.sh
}
trap cleanup EXIT INT TERM

for script in "${TEST_SCRIPTS[@]}"; do
    rel="${script#$QA_DIR/}"
    echo ""
    echo "══════════════════════════════════════════════════════════"
    echo "  RUNNING: $rel"
    echo "══════════════════════════════════════════════════════════"

    set +e
    bash "$script"
    exit_code=$?
    set -e

    if [ $exit_code -eq 0 ]; then
        echo ""
        echo "  ✓ PASS: $rel"
        PASSED=$((PASSED + 1))
    else
        echo ""
        echo "  ✗ FAIL: $rel (exit code $exit_code)"
        FAILED=$((FAILED + 1))
        FAILED_SCRIPTS+=("$rel (exit $exit_code)")
    fi
done

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  RESULTS SUMMARY"
echo "══════════════════════════════════════════════════════════"
echo "  Database:        qa_db.sqlite3 (isolated, cleaned up)"
echo "  Server port:     $QA_PORT"
echo "  Total:           $TOTAL"
echo "  Passed:          $PASSED"
echo "  Failed:          $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "  FAILED SCRIPTS:"
    for f in "${FAILED_SCRIPTS[@]}"; do
        echo "    - $f"
    done
    echo ""
    exit 1
fi

echo "  All tests passed."
echo ""
