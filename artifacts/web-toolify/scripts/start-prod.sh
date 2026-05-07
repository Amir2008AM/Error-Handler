#!/bin/sh
# Production startup — checks for build, starts Redis, then Next.js.
# Degrades gracefully when Redis is not present.

set -e

# ── 0. Verify production build exists ────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_ID="$APP_DIR/.next/BUILD_ID"

if [ ! -f "$BUILD_ID" ]; then
  echo "[start-prod] ❌ ERROR: No production build found at $APP_DIR/.next/"
  echo "[start-prod]    Run 'pnpm --filter @workspace/web-toolify run build' first."
  exit 1
fi
echo "[start-prod] ✅ Production build found ($(cat "$BUILD_ID"))"

# ── 1. Locate redis-server ───────────────────────────────────────────────────
REDIS_BIN=""
if command -v redis-server >/dev/null 2>&1; then
  REDIS_BIN=$(command -v redis-server)
else
  REDIS_BIN=$(find /nix/store -maxdepth 3 -path "*/redis*/bin/redis-server" -type f 2>/dev/null | head -1)
fi

# Derive redis-cli from the same directory
REDIS_CLI=""
if [ -n "$REDIS_BIN" ]; then
  _cli="$(dirname "$REDIS_BIN")/redis-cli"
  [ -x "$_cli" ] && REDIS_CLI="$_cli"
fi

# ── 2. Start Redis if available ──────────────────────────────────────────────
if [ -n "$REDIS_BIN" ]; then
  if [ -n "$REDIS_CLI" ] && "$REDIS_CLI" ping >/dev/null 2>&1; then
    echo "[start-prod] Redis already running"
  else
    echo "[start-prod] Starting Redis..."
    "$REDIS_BIN" --daemonize yes --loglevel warning --save "" --appendonly no
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

# ── 3. Start Next.js ─────────────────────────────────────────────────────────
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export PORT="${PORT:-5000}"

echo "[start-prod] Starting Next.js on port $PORT..."
exec pnpm --filter @workspace/web-toolify run start-app
