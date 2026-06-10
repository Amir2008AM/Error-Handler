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
      // Actually run a tiny Sharp operation to force native binding init
      const { default: sharp } = await import('sharp')
      await sharp({
        create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } }
      }).jpeg().toBuffer()
      console.log('[Instrumentation] Heavy modules pre-warmed ✓')
    } catch { /* non-fatal */ }
  }, 0)

  // ── Pre-warm binary existence cache (soffice, wkhtmltopdf, python3) ──────────
  // binaryExists() runs `which <cmd>` as a subprocess — cache results at boot
  // so the first user conversion doesn't pay the subprocess-spawn cost.
  setTimeout(async () => {
    try {
      const { spawn } = await import('node:child_process')
      const checkBinary = (cmd: string) => new Promise<void>((resolve) => {
        const p = spawn('which', [cmd], { stdio: 'ignore' })
        p.on('close', resolve)
        p.on('error', resolve)
        setTimeout(() => { try { p.kill() } catch {} resolve() }, 3000)
      })
      await Promise.all([
        checkBinary('soffice'),
        checkBinary('wkhtmltopdf'),
        checkBinary('python3'),
        checkBinary('gs'),
        checkBinary('qpdf'),
      ])
      // Trigger binaryExists cache population inside document-converter
      const { DocumentConverter } = await import('./lib/processing/document-converter')
      void new DocumentConverter()
      console.log('[Instrumentation] Binary cache pre-warmed ✓')
    } catch { /* non-fatal */ }
  }, 100)

  // ── Pre-warm Python module imports (pdf2docx, fitz) ─────────────────────────
  // Each Python subprocess pays a 5-10s cold-start cost to import these libs.
  // Running a no-op warm-up script once at boot loads .pyc files into the OS
  // page cache so the first real pdf2docx conversion is significantly faster.
  setTimeout(async () => {
    try {
      const { join } = await import('node:path')
      const { spawn } = await import('node:child_process')
      const warmupScript = join(process.cwd(), 'scripts', 'warmup.py')
      const { existsSync } = await import('node:fs')
      if (existsSync(warmupScript)) {
        const child = spawn('python3', [warmupScript], { stdio: 'ignore' })
        const kill = setTimeout(() => child.kill('SIGKILL'), 30_000)
        child.on('exit', () => clearTimeout(kill))
        child.on('error', () => clearTimeout(kill))
        console.log('[Instrumentation] Python module warm-up started ✓')
      }
    } catch { /* non-fatal */ }
  }, 300)

  // ── Pre-warm LibreOffice page cache ──────────────────────────────────────────
  // Spawning soffice cold incurs 3+ s of shared-library loading on this host.
  // Running it once at boot loads libreoffice*.so into the kernel page cache so
  // subsequent soffice spawns (fallback path) are slightly faster.
  setTimeout(async () => {
    try {
      const { warmSoffice } = await import('./lib/lo-server')
      warmSoffice()
      console.log('[Instrumentation] LibreOffice page cache warming ✓')
    } catch { /* non-fatal */ }
  }, 200)

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
