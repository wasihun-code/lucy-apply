#!/usr/bin/env bash
# ======================================================================
# run_server.sh — Start the QA Django server with an isolated database
# ======================================================================
# Starts the server with DJANGO_SETTINGS_MODULE=settings_qa so it uses
# qa_db.sqlite3 instead of the development database.
#
# Prints the chosen port number to stdout (only the number, nothing else).
# All informational messages go to stderr.
#
# Usage:
#   QA_PORT=$(bash qa/run_server.sh)
#
# Environment:
#   QA_PORT        — preferred port (default: 8001, will try subsequent
#                    ports if taken)
#   QA_SERVER_LOG  — log file path (default: /tmp/lucy_qa_server.log)

set -e

QA_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$QA_DIR/env.sh"

cd "$PROJECT_DIR"

QA_PORT="${QA_PORT:-8001}"
QA_SERVER_LOG="${QA_SERVER_LOG:-/tmp/lucy_qa_server.log}"
SERVER_PID_FILE="/tmp/lucy_qa_server.pid"

# Kill any previous QA server registered in PID file
if [ -f "$SERVER_PID_FILE" ]; then
    OLD_PID=$(cat "$SERVER_PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null || true
        wait "$OLD_PID" 2>/dev/null || true
    fi
    rm -f "$SERVER_PID_FILE"
fi

# Try ports starting from QA_PORT, find first free one
PORT=""
for try_port in $(seq "$QA_PORT" "$((QA_PORT + 9))"); do
    if ! ss -tln "sport = :$try_port" 2>/dev/null | grep -q ":$try_port"; then
        PORT="$try_port"
        break
    fi
done

if [ -z "$PORT" ]; then
    echo "  ERROR: No free port found in range $QA_PORT-$((QA_PORT + 9))." >&2
    exit 1
fi

# Fresh log
rm -f "$QA_SERVER_LOG"

echo "  Starting QA server on port $PORT..." >&2

DJANGO_SETTINGS_MODULE=lucy_apply.settings_qa \
    nohup venv/bin/python manage.py runserver --noreload "0.0.0.0:$PORT" \
    > "$QA_SERVER_LOG" 2>&1 &

SERVER_PID=$!
echo "$SERVER_PID" > "$SERVER_PID_FILE"

# Wait for server to be ready (up to 20 seconds)
echo "  Waiting for server..." >&2
for i in $(seq 1 20); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "  ERROR: Server process (PID $SERVER_PID) died during startup." >&2
        tail -20 "$QA_SERVER_LOG" >&2
        rm -f "$SERVER_PID_FILE"
        exit 1
    fi
    if curl -sf "http://localhost:$PORT/api/v1/universities/" > /dev/null 2>&1; then
        echo "  Server ready on port $PORT (PID $SERVER_PID)" >&2
        echo "$PORT"
        exit 0
    fi
    sleep 1
done

echo "  ERROR: Server failed to start within 20 seconds. Check log:" >&2
tail -20 "$QA_SERVER_LOG" >&2
rm -f "$SERVER_PID_FILE"
exit 1
