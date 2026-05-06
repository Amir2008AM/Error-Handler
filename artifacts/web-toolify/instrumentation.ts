/**
 * Next.js Instrumentation Hook
 *
 * Runs once at server startup (Node.js runtime only).
 * 1. Validates required Telegram env vars — CRASHES if missing
 * 2. Starts BullMQ workers (when Redis is available)
 * 3. Starts the Telegram alert monitor
 * 4. Validates the bot token via getMe
 * 5. Registers the Telegram webhook and verifies it via getWebhookInfo
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

  // ── 2. Telegram secrets validation — HARD FAIL if missing ────────────────
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

  // ── 5. Register webhook + verify ─────────────────────────────────────────
  const host =
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.VERCEL_URL

  if (!host) {
    console.warn('[Instrumentation] No public host env var found — skipping webhook registration')
    return
  }

  const webhookUrl = `https://${host}/api/telegram/admin-webhook`

  try {
    const { setWebhook, getWebhookInfo } = await import('./lib/telegram/api')

    const ok = await setWebhook(webhookUrl)
    if (!ok) {
      throw new Error('setWebhook returned false — check token and URL')
    }
    console.log(`[TelegramBot] ✅ Webhook registered → ${webhookUrl}`)

    const info = await getWebhookInfo()
    console.log('[TelegramBot] Webhook info:', JSON.stringify(info, null, 2))

    if (info?.last_error_message) {
      console.warn(`[TelegramBot] ⚠️  Last webhook error: ${info.last_error_message}`)
    }
    if (info?.pending_update_count > 0) {
      console.log(`[TelegramBot] Pending updates in queue: ${info.pending_update_count}`)
    }
  } catch (err) {
    throw new Error(`❌ Webhook registration failed: ${(err as Error).message}`)
  }
}
