#!/usr/bin/env bash
# ======================================================================
# run_test.sh — Run a single QA test in an isolated environment
# ======================================================================

set -e

if [ $# -ne 1 ]; then
  echo "Usage: bash qa/run_test.sh <test-script>"
  echo
  echo "Examples:"
  echo "  bash qa/run_test.sh auth/login.sh"
  echo "  bash qa/run_test.sh public/universities.sh"
  echo "  bash qa/run_test.sh qa/10-fe10/01_team_management_fe10.sh"
  exit 1
fi

QA_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$QA_DIR/env.sh"

cd "$PROJECT_DIR"

SCRIPT="$1"

if [ ! -f "$SCRIPT" ]; then
  echo "ERROR: Test script not found: $SCRIPT"
  exit 1
fi

cleanup() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  CLEANUP: Tearing down QA environment                   ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  bash qa/teardown.sh
}

trap cleanup EXIT INT TERM

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 1: Creating isolated QA database                  ║"
echo "╚══════════════════════════════════════════════════════════╝"

bash qa/setup_db.sh

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 2: Seeding test data                              ║"
echo "╚══════════════════════════════════════════════════════════╝"

QA_SEED_OUTPUT=$(cd "$PROJECT_DIR" &&
  DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa \
    venv/bin/python qa/setup_data.py 2>&1)

eval "$QA_SEED_OUTPUT"

echo "  Test data seeded."

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  STEP 3: Starting QA server                             ║"
echo "╚══════════════════════════════════════════════════════════╝"

QA_PORT=$(bash qa/run_server.sh)

export QA_PORT
export BASE_URL="http://localhost:$QA_PORT/api/v1"
export DJANGO_SETTINGS_MODULE="lucy_apply.settings_qa"

echo ""
echo "══════════════════════════════════════════════════════════"
echo " RUNNING: $1"
echo "══════════════════════════════════════════════════════════"

bash "$SCRIPT"

echo ""
echo "✅ PASS: $1"
