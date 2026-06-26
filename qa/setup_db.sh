#!/usr/bin/env bash
# ======================================================================
# setup_db.sh — Create and migrate the isolated QA test database
# ======================================================================
# Run before starting the QA server. Destroys any existing QA database
# so each run starts with a clean slate.
#
# Usage:
#   export DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa
#   bash qa/setup_db.sh

set -e

QA_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$QA_DIR/env.sh"

cd "$PROJECT_DIR"

QA_DB="$PROJECT_DIR/qa_db.sqlite3"

echo "--- QA Database Setup ---"

# Remove existing QA database for a clean start
if [ -f "$QA_DB" ]; then
    echo "  Removing existing QA database..."
    rm -f "$QA_DB"
fi

# Remove any previous test migrations (bytecode caches etc.)
echo "  Running migrations on fresh QA database..."
DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa \
    venv/bin/python manage.py migrate --run-syncdb 2>&1 | tail -5

echo "  QA database created at $QA_DB"
