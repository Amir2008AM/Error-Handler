/**
 * Next.js Instrumentation Hook
 *
 * Runs once at server startup (Node.js runtime only).
 * 1.  Validates required Telegram env vars — CRASHES if missing
 * 2.  Starts BullMQ workers (when Redis is available)
 * 3.  Validates the bot token via getMe
 * 4.  Removes any stale webhook and starts long polling
 *     (Replit's dev-domain proxy blocks inbound external connections,
 *      so polling is used in dev; webhooks work in production deployments)
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // ── 0. Analytics SQLite DB ───────────────────────────────────────────────
  try {
    const { getDb } = await import('./lib/telegram/db')
    getDb()
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

  // ── 2. Telegram secrets — HARD FAIL if missing ───────────────────────────
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('❌ TELEGRAM_BOT_TOKEN is MISSING — set it in Replit Secrets and restart')
  }
  if (!process.env.TELEGRAM_ADMIN_IDS) {
    throw new Error('❌ TELEGRAM_ADMIN_IDS is MISSING — set it in Replit Secrets and restart')
  }
  console.log('[TelegramBot] ✅ TELEGRAM_BOT_TOKEN loaded')
  console.log('[TelegramBot] ✅ TELEGRAM_ADMIN_IDS loaded')

  // ── 3. Telegram alert monitor ─────────────────────────────────────────────
  try {
    const { startAlertMonitor } = await import('./lib/telegram/alerts')
    startAlertMonitor()
  } catch (err) {
    console.warn('[Instrumentation] Alert monitor failed to start:', (err as Error).message)
  }

  // ── 4. Validate token via getMe ───────────────────────────────────────────
  try {
    const { getMe } = await import('./lib/telegram/api')
    const bot = await getMe()
    if (bot) {
      console.log(`[TelegramBot] ✅ Token valid — bot: @${bot.username} (id: ${bot.id})`)
    } else {
      throw new Error('getMe returned null — token is invalid or Telegram is unreachable')
    }
  } catch (err) {
    throw new Error(`❌ Telegram token validation failed: ${(err as Error).message}`)
  }

  // ── 5. Remove stale webhook + start long polling ──────────────────────────
  //
  // Replit's dev-domain proxy blocks inbound requests from external services
  // (Telegram's servers get a 502). Long polling avoids this entirely:
  // the bot reaches OUT to Telegram instead of waiting for inbound calls.
  //
  // When deployed to production (stable public HTTPS URL), you can switch
  // back to webhooks by calling setWebhook() here instead.
  try {
    const { deleteWebhook } = await import('./lib/telegram/api')
    await deleteWebhook()
    console.log('[TelegramBot] Webhook cleared — switching to long polling mode')
  } catch (err) {
    console.warn('[TelegramBot] Could not clear webhook:', (err as Error).message)
  }

  try {
    const { startPolling } = await import('./lib/telegram/poller')
    startPolling()
  } catch (err) {
    throw new Error(`❌ Failed to start Telegram polling: ${(err as Error).message}`)
  }
}
