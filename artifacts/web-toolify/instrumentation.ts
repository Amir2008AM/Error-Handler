/**
 * Next.js Instrumentation Hook
 *
 * Runs once at server startup (Node.js runtime only).
 * 1. Starts BullMQ workers (when Redis is available)
 * 2. Starts the Telegram alert monitor
 * 3. Registers the Telegram webhook with Telegram's API
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // ── 0. Analytics SQLite DB ───────────────────────────────────────────────
  try {
    const { getDb } = await import('./lib/telegram/db')
    getDb() // opens + migrates the DB, sets WAL mode
  } catch (err) {
    console.warn('[Instrumentation] Analytics DB failed to init:', (err as Error).message)
  }

  // ── 0b. Global error monitoring hooks ────────────────────────────────────
  try {
    const { installGlobalHooks } = await import('./lib/telegram/error-monitor')
    installGlobalHooks()
  } catch (err) {
    console.warn('[Instrumentation] Error monitor failed to init:', (err as Error).message)
  }

  // ── 1. BullMQ workers ────────────────────────────────────────────────────
  if (process.env.REDIS_URL) {
    try {
      const { startWorkers, isRedisAvailable } = await import('./lib/queue/bullmq-backend')
      const redisOk = await isRedisAvailable()
      if (redisOk) {
        startWorkers()
        console.log('[Instrumentation] BullMQ workers started — using Redis queue backend')
      } else {
        console.warn('[Instrumentation] Redis is not reachable — falling back to in-memory queue')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Instrumentation] Failed to start BullMQ workers:', msg)
    }
  } else {
    console.log('[Instrumentation] REDIS_URL not set — using in-memory queue backend')
  }

  // ── 2. Telegram alert monitor ────────────────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_IDS) {
    try {
      const { startAlertMonitor } = await import('./lib/telegram/alerts')
      startAlertMonitor()
    } catch (err) {
      console.warn('[Instrumentation] Alert monitor failed to start:', (err as Error).message)
    }
  }

  // ── 3. Register Telegram webhook ─────────────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      // Derive the public URL from Replit's domain env vars
      const host =
        process.env.REPLIT_DEV_DOMAIN ||
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.VERCEL_URL

      if (host) {
        const webhookUrl = `https://${host}/api/telegram/admin-webhook`
        const { setWebhook } = await import('./lib/telegram/api')
        const ok = await setWebhook(webhookUrl)
        if (ok) {
          console.log(`[Instrumentation] Telegram webhook registered → ${webhookUrl}`)
        } else {
          console.warn('[Instrumentation] Telegram webhook registration failed — check TELEGRAM_BOT_TOKEN is valid')
        }
      } else {
        console.warn('[Instrumentation] No public host found — skipping webhook registration')
      }
    } catch (err) {
      console.warn('[Instrumentation] Webhook registration failed:', (err as Error).message)
    }
  }
}
