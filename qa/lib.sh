#!/usr/bin/env bash
# ======================================================================
# lib.sh — Shared helper functions for QA test scripts
# ======================================================================
# Intended to be sourced AFTER env.sh + setup.sh.

# Assert that a curl response contains expected HTTP status
assert_status() {
    local expected="$1"
    local actual="$2"
    local label="${3:-response}"
    if [ "$actual" != "$expected" ]; then
        echo "FAIL: $label — expected HTTP $expected, got HTTP $actual" >&2
        exit 1
    fi
}

# Assert that a JSON key equals an expected value
assert_json_eq() {
    local json="$1"
    local key="$2"
    local expected="$3"
    local label="${4:-$key}"
    local actual
    actual=$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin)['$key'])" 2>/dev/null)
    if [ "$actual" != "$expected" ]; then
        echo "FAIL: $label — expected '$expected', got '$actual'" >&2
        exit 1
    fi
}

# Pretty-print JSON from stdin/stdout
pretty_json() {
    python3 -m json.tool
}

# Make a curl request and capture status + body
# Usage: api_call METHOD URL [DATA]
# Sets: API_STATUS, API_BODY
api_call() {
    local method="$1"
    local url="$2"
    local data="${3:-}"
    local auth="${4:-}"

    local args=(-s -X "$method" -w '\n%{http_code}')
    if [ -n "$auth" ]; then
        args+=(-H "Authorization: Bearer $auth")
    fi
    if [ "$method" = "POST" ] || [ "$method" = "PATCH" ] || [ "$method" = "PUT" ] || [ "$method" = "DELETE" ]; then
        args+=(-H "Content-Type: application/json")
        if [ -n "$data" ]; then
            args+=(-d "$data")
        fi
    fi

    local output
    output=$(curl "${args[@]}" "$url")
    API_STATUS=$(echo "$output" | tail -1)
    API_BODY=$(echo "$output" | sed '$d')
}

# Print section header
header() {
    echo ""
    echo "=============================================="
    echo "  $1"
    echo "=============================================="
}

# Print sub-header
subheader() {
    echo ""
    echo "--- $1 ---"
}

# Print PASS
pass() {
    echo "  PASS: $1"
}

# Print FAIL and exit
fail() {
    echo "  FAIL: $1" >&2
    exit 1
}
