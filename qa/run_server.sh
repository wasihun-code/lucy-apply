#!/usr/bin/env bash
# ======================================================================
# run_server.sh — Start the QA Django server with an isolated database
# ======================================================================
# Starts the server with DJANGO_SETTINGS_MODULE=settings_qa so it uses
# qa_db.sqlite3 instead of the development database.
#
# Usage:
#   bash qa/run_server.sh
#
# Environment:
#   QA_PORT        — port to listen on (default: 8001)
#   QA_SERVER_LOG  — log file path (default: /tmp/lucy_qa_server.log)

set -e

QA_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$QA_DIR/env.sh"

cd "$PROJECT_DIR"

QA_PORT="${QA_PORT:-8001}"
QA_SERVER_LOG="${QA_SERVER_LOG:-/tmp/lucy_qa_server.log}"
SERVER_PID_FILE="/tmp/lucy_qa_server.pid"

# Check that the port is free
if lsof -i ":$QA_PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    OLD_PIDS=$(lsof -i ":$QA_PORT" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ')
    echo "  ERROR: Port $QA_PORT is already in use by PID(s): $OLD_PIDS"
    echo "  Run 'bash qa/teardown.sh' or kill them manually."
    exit 1
fi

# Kill any previous QA server registered in PID file
if [ -f "$SERVER_PID_FILE" ]; then
    OLD_PID=$(cat "$SERVER_PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null || true
        wait "$OLD_PID" 2>/dev/null || true
    fi
    rm -f "$SERVER_PID_FILE"
fi

# Fresh log
rm -f "$QA_SERVER_LOG"

echo "  Starting QA server on port $QA_PORT..."

DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa \
    nohup venv/bin/python manage.py runserver --noreload "0.0.0.0:$QA_PORT" \
    > "$QA_SERVER_LOG" 2>&1 &

SERVER_PID=$!
echo "$SERVER_PID" > "$SERVER_PID_FILE"

# Wait for server to be ready (up to 20 seconds)
echo "  Waiting for server..."
for i in $(seq 1 20); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "  ERROR: Server process (PID $SERVER_PID) died during startup."
        tail -20 "$QA_SERVER_LOG"
        rm -f "$SERVER_PID_FILE"
        exit 1
    fi
    if curl -sf "http://localhost:$QA_PORT/api/v1/universities/" > /dev/null 2>&1; then
        echo "  Server ready on port $QA_PORT (PID $SERVER_PID)"
        exit 0
    fi
    sleep 1
done

echo "  ERROR: Server failed to start within 20 seconds. Check log:"
tail -20 "$QA_SERVER_LOG"
rm -f "$SERVER_PID_FILE"
exit 1
