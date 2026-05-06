#!/bin/sh
# Production startup — starts Redis (if available) then Next.js.
# Degrades gracefully when Redis is not present.

# Locate redis-server: check PATH first, then search the Nix store
if command -v redis-server >/dev/null 2>&1; then
  REDIS_BIN=$(command -v redis-server)
else
  REDIS_BIN=$(find /nix/store -maxdepth 3 -path "*/redis*/bin/redis-server" -type f 2>/dev/null | head -1)
fi

# Derive redis-cli from the same directory
if [ -n "$REDIS_BIN" ]; then
  REDIS_CLI="$(dirname "$REDIS_BIN")/redis-cli"
  [ -x "$REDIS_CLI" ] || REDIS_CLI=""
fi

if [ -n "$REDIS_BIN" ]; then
  # Check if Redis is already running
  if [ -n "$REDIS_CLI" ] && "$REDIS_CLI" ping >/dev/null 2>&1; then
    echo "[start-prod] Redis already running"
  else
    echo "[start-prod] Starting Redis..."
    "$REDIS_BIN" --daemonize yes --loglevel warning --save "" --appendonly no
    # Wait up to 5 s for Redis to accept connections
    i=0
    while [ -n "$REDIS_CLI" ] && ! "$REDIS_CLI" ping >/dev/null 2>&1; do
      i=$((i + 1))
      [ "$i" -ge 10 ] && break
      sleep 0.5
    done
    echo "[start-prod] Redis ready"
  fi
else
  echo "[start-prod] WARNING: redis-server not found — queues will be unavailable"
fi

export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export PORT="${PORT:-5000}"

echo "[start-prod] Starting Next.js on port $PORT..."
exec pnpm --filter @workspace/web-toolify run start-app
