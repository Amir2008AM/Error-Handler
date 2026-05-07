#!/bin/sh
# Production startup — starts Redis (if available) then Next.js.
# Safe to run on Railway, Replit, or any VPS.
# Never exits due to Redis unavailability — degrades gracefully.

# ── 0. Verify production build exists ────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_ID_FILE="$APP_DIR/.next/BUILD_ID"

if [ ! -f "$BUILD_ID_FILE" ]; then
  echo "[start-prod] ERROR: No production build found at $APP_DIR/.next/"
  echo "[start-prod]   Run: pnpm --filter @workspace/web-toolify run build"
  exit 1
fi
echo "[start-prod] Production build: $(cat "$BUILD_ID_FILE")"

# ── 1. Locate redis-server (PATH first, then Nix store) ──────────────────────
REDIS_BIN=""
if command -v redis-server >/dev/null 2>&1; then
  REDIS_BIN="$(command -v redis-server)"
else
  REDIS_BIN="$(find /nix/store -maxdepth 3 -path "*/redis*/bin/redis-server" -type f 2>/dev/null | head -1)"
fi

REDIS_CLI=""
if [ -n "$REDIS_BIN" ]; then
  _cli="$(dirname "$REDIS_BIN")/redis-cli"
  [ -x "$_cli" ] && REDIS_CLI="$_cli"
fi

# ── 2. Start Redis (non-fatal if unavailable) ─────────────────────────────────
if [ -n "$REDIS_BIN" ]; then
  if [ -n "$REDIS_CLI" ] && "$REDIS_CLI" ping >/dev/null 2>&1; then
    echo "[start-prod] Redis already running"
  else
    echo "[start-prod] Starting Redis..."
    "$REDIS_BIN" --daemonize yes --loglevel warning --save "" --appendonly no || true
    i=0
    while [ -n "$REDIS_CLI" ] && ! "$REDIS_CLI" ping >/dev/null 2>&1; do
      i=$((i + 1))
      [ "$i" -ge 10 ] && break
      sleep 0.5
    done
    if [ -n "$REDIS_CLI" ] && "$REDIS_CLI" ping >/dev/null 2>&1; then
      echo "[start-prod] Redis ready"
    else
      echo "[start-prod] WARNING: Redis did not respond — queues will use in-memory fallback"
    fi
  fi
else
  echo "[start-prod] Redis not found — queues will use in-memory fallback"
fi

# ── 3. Start Next.js (uses Railway PORT or defaults to 5000) ──────────────────
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export PORT="${PORT:-5000}"

echo "[start-prod] Starting Next.js on port $PORT (app dir: $APP_DIR)..."
cd "$APP_DIR" && exec node_modules/.bin/next start --port "$PORT" --hostname 0.0.0.0
