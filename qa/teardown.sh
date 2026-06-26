#!/usr/bin/env bash
# ======================================================================
# teardown.sh — Stop the QA server and clean up the isolated database
# ======================================================================
# Should be called after QA tests complete (or on error) to ensure
# no test data persists and no orphan processes remain.
#
# Usage:
#   bash qa/teardown.sh

set -e

QA_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$QA_DIR/env.sh"

cd "$PROJECT_DIR"

SERVER_PID_FILE="/tmp/lucy_qa_server.pid"
QA_DB="$PROJECT_DIR/qa_db.sqlite3"

echo "--- QA Teardown ---"

# Stop the QA server via PID file
if [ -f "$SERVER_PID_FILE" ]; then
    PID=$(cat "$SERVER_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "  Stopping QA server (PID $PID)..."
        kill "$PID" 2>/dev/null || true
        wait "$PID" 2>/dev/null || true
        echo "  Server stopped."
    fi
    rm -f "$SERVER_PID_FILE"
fi

# Fallback: kill any process on the QA port
for port in 8001 8002; do
    FPID=$(lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null || true)
    if [ -n "$FPID" ]; then
        echo "  Cleaning up orphan server on port $port (PID $FPID)..."
        kill -9 "$FPID" 2>/dev/null || true
    fi
done

# Remove the QA database and any test artifacts
if [ -f "$QA_DB" ]; then
    rm -f "$QA_DB"
    echo "  QA database removed."
fi

echo "  Teardown complete."
