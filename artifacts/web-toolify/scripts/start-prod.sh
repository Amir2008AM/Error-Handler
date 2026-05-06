#!/bin/sh
# Production startup script — starts Redis then Next.js
# Used by Replit deployment and self-hosted environments.

set -e

# Start Redis if not already running
if ! redis-cli ping >/dev/null 2>&1; then
  echo "[start-prod] Starting Redis..."
  redis-server --daemonize yes --loglevel warning --save "" --appendonly no
  # Wait up to 5 s for Redis to be ready
  i=0
  while ! redis-cli ping >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 10 ]; then
      echo "[start-prod] WARNING: Redis did not start — queues will be unavailable"
      break
    fi
    sleep 0.5
  done
  echo "[start-prod] Redis ready"
else
  echo "[start-prod] Redis already running"
fi

export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export PORT="${PORT:-5000}"

echo "[start-prod] Starting Next.js on port $PORT..."
exec pnpm --filter @workspace/web-toolify run start-app
