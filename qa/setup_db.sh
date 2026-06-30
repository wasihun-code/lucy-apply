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

# Remove existing QA database and any stale SQLite artifacts for a clean start
for f in "$QA_DB" "$QA_DB-wal" "$QA_DB-shm"; do
    if [ -f "$f" ]; then
        rm -f "$f"
    fi
done

echo "  Running migrations on fresh QA database..."
DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa \
    venv/bin/python manage.py migrate 2>&1
echo "  QA database created at $QA_DB"
