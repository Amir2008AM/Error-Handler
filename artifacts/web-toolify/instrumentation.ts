/**
 * Next.js Instrumentation Hook
 *
 * Runs once at server startup (Node.js runtime only).
 * 1.  Init analytics SQLite DB
 * 2.  Init Supabase monitoring (if configured)
 * 3.  Start BullMQ workers
 * 4.  Start Telegram admin bot
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // ── -1. Automatic file cleanup (startup sweep + periodic orphan sweep) ────
  // Runs immediately — lightweight, non-blocking
  try {
    const { runStartupCleanup, startPeriodicOrphanSweep } = await import('./lib/storage/file-cleanup')
    void runStartupCleanup().catch((err: Error) =>
      console.warn('[FileCleanup] Startup sweep error (non-fatal):', err.message)
    )
    startPeriodicOrphanSweep()
  } catch (err) {
    console.warn('[FileCleanup] Failed to init (non-fatal):', (err as Error).message)
  }

  // ── Pre-warm heavy native modules so first user request is instant ──────────
  // Runs in background — never blocks startup
  setTimeout(async () => {
    try {
      await import('./lib/processing/pdf-processor')
      await import('./lib/processing/image-processor')
      console.log('[Instrumentation] Heavy modules pre-warmed ✓')
    } catch { /* non-fatal */ }
  }, 0)

  // ── All heavy background services delayed 2s so server responds immediately ──
  setTimeout(async () => {

    // ── 0. Analytics SQLite DB ────────────────────────────────────────────────
    try {
      const { getDb } = await import('./lib/telegram/db')
      getDb()
    } catch (err) {
      console.warn('[Instrumentation] Analytics DB failed to init:', (err as Error).message)
    }

    // ── 0b. Global error monitoring hooks ─────────────────────────────────────
    try {
      const { installGlobalHooks } = await import('./lib/telegram/error-monitor')
      installGlobalHooks()
    } catch (err) {
      console.warn('[Instrumentation] Error monitor failed to init:', (err as Error).message)
    }

    // ── 0c. Supabase monitoring layer ──────────────────────────────────────────
    try {
      const { getMonitoringClient, isMonitoringEnabled } = await import('./lib/monitoring/client')
      getMonitoringClient()
      if (isMonitoringEnabled()) {
        const { startMetricsCollector } = await import('./lib/monitoring/emitter')
        startMetricsCollector()
      }
    } catch (err) {
      console.warn('[Monitoring] Failed to init (non-fatal):', (err as Error).message)
    }

    // ── 0d. Central state manager (MUST start before analytics-cache) ──────────
    try {
      const { startCentralState } = await import('./lib/monitoring/central-state')
      startCentralState()
    } catch (err) {
      console.warn('[CentralState] Failed to start (non-fatal):', (err as Error).message)
    }

    // ── 0e. Analytics cache — isolated background collectors ───────────────────
    try {
      const { startAnalyticsCache } = await import('./lib/telegram/analytics-cache')
      startAnalyticsCache()
    } catch (err) {
      console.warn('[AC] Failed to start (non-fatal):', (err as Error).message)
    }

    // ── 0f. Dashboard engine — auto-refresh live sessions ─────────────────────
    try {
      const { startDashboardEngine } = await import('./lib/telegram/dashboard')
      startDashboardEngine()
    } catch (err) {
      console.warn('[Dashboard] Failed to start (non-fatal):', (err as Error).message)
    }

    // ── 1. BullMQ workers ─────────────────────────────────────────────────────
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

    // ── 2. Telegram bot (optional) ────────────────────────────────────────────
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_ADMIN_IDS) {
      console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_IDS not set — Telegram admin bot disabled')
      return
    }
    console.log('[TelegramBot] ✅ TELEGRAM_BOT_TOKEN loaded')
    console.log('[TelegramBot] ✅ TELEGRAM_ADMIN_IDS loaded')

    // ── 3. Alert monitor ───────────────────────────────────────────────────────
    try {
      const { startAlertMonitor } = await import('./lib/telegram/alerts')
      startAlertMonitor()
    } catch (err) {
      console.warn('[Instrumentation] Alert monitor failed to start:', (err as Error).message)
    }

    // ── 4. Validate Telegram token ─────────────────────────────────────────────
    try {
      const { getMe } = await import('./lib/telegram/api')
      const bot = await getMe()
      if (bot) {
        console.log(`[TelegramBot] ✅ Token valid — bot: @${bot.username} (id: ${bot.id})`)
      } else {
        console.warn('[TelegramBot] getMe returned null — token may be invalid or Telegram unreachable')
        return
      }
    } catch (err) {
      console.warn(`[TelegramBot] Token validation failed: ${(err as Error).message} — bot disabled`)
      return
    }

    // ── 5. Remove stale webhook + start long polling ───────────────────────────
    try {
      const { deleteWebhook } = await import('./lib/telegram/api')
      await deleteWebhook()
      console.log('[TelegramBot] Webhook cleared — switching to long polling mode')
    } catch (err) {
      console.warn('[TelegramBot] Could not clear webhook:', (err as Error).message)
    }

    try {
      const { stopPolling, startPolling } = await import('./lib/telegram/poller')
      stopPolling()
      startPolling()
    } catch (err) {
      console.warn(`[TelegramBot] Failed to start polling: ${(err as Error).message} — bot disabled`)
    }

  }, 2_000)
}
