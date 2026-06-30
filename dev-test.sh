#!/usr/bin/env bash
set -Eeuo pipefail

cleanup() {
  echo
  echo "=== Cleaning up Docker ==="

  # Stop and remove containers, networks and orphan containers
  docker-compose down --remove-orphans

  # Remove dangling build cache
  docker builder prune -f

  # Remove unused images, networks and stopped containers
  docker system prune -f

  echo "✓ Docker cleanup complete"
}

trap cleanup EXIT

run() {
  local title="$1"
  local lines="$2"
  shift 2

  echo
  echo "=== $title ==="
  "$@" 2>&1 | tail -n "$lines"
}

run "Stopping containers" 8 docker-compose down --remove-orphans
run "Building images" 5 docker-compose build
run "Starting containers" 8 docker-compose up -d
run "Container status" 8 docker-compose ps
run "Frontend tests" 12 docker-compose run --rm frontend-test
run "Backend tests" 4 docker-compose exec backend pytest
run "QA tests" 20 bash qa/run_all.sh

echo
echo "✅ All checks passed."
