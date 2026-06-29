#!/usr/bin/env bash
set -euo pipefail

run() {
  local title="$1"
  local lines="$2"
  shift 2

  echo
  echo "=== $title ==="
  "$@" 2>&1 | tail -n "$lines"
}

run "Stopping containers" 8 docker-compose down
run "Building images" 2 docker-compose build
run "Starting containers" 8 docker-compose up -d
run "Container status" 8 docker-compose ps
run "Frontend tests" 12 docker-compose run --rm frontend-test
run "Backend tests" 4 docker-compose exec backend pytest
run "QA tests" 20 bash qa/run_all.sh
run "Stopping containers" 8 docker-compose down

echo
echo "✅ All checks passed."
