/**
 * Telegram Bot — Long Polling
 *
 * Replaces webhook. The bot proactively fetches updates from Telegram
 * every cycle (long-poll with timeout=25s). Works on any host without
 * needing a public URL.
 *
 * Started once from instrumentation.ts via globalThis guard.
 */

import { handleUpdate, type TgUpdate } from './bot-handler'

declare global {
  // eslint-disable-next-line no-var
  var __botPollingActive: boolean | undefined
}

const POLL_TIMEOUT = 25          // seconds — Telegram holds connection this long
const RETRY_DELAY  = 5_000      // ms — wait before retrying on error

async function poll(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[Bot] TELEGRAM_BOT_TOKEN not set — polling disabled')
    return
  }

  // Delete webhook first — required before getUpdates works
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`)
    console.log('[Bot] Webhook deleted ✓')
  } catch { /* non-fatal */ }

  let offset = 0
  console.log('[Bot] Long polling started ✓')

  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=${POLL_TIMEOUT}&offset=${offset}&allowed_updates=${encodeURIComponent(JSON.stringify(['message','callback_query']))}`,
        { signal: AbortSignal.timeout((POLL_TIMEOUT + 10) * 1000) },
      )

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.warn(`[Bot] getUpdates error ${res.status}:`, body.slice(0, 200))
        await sleep(RETRY_DELAY)
        continue
      }

      const data = await res.json() as { ok: boolean; result: TgUpdate[] }
      if (!data.ok || !Array.isArray(data.result)) {
        await sleep(RETRY_DELAY)
        continue
      }

      for (const update of data.result) {
        offset = update.update_id + 1
        handleUpdate(update).catch((err) =>
          console.error('[Bot] handler error:', err),
        )
      }
    } catch (err: unknown) {
      // Timeout or network error — just retry
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('TimeoutError') && !msg.includes('aborted')) {
        console.warn('[Bot] poll error:', msg)
      }
      await sleep(RETRY_DELAY)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Call once at server startup — safe to call multiple times (guarded) */
export function startBotPolling(): void {
  if (globalThis.__botPollingActive) return
  globalThis.__botPollingActive = true

  // Run in background — don't await
  poll().catch((err) => {
    console.error('[Bot] polling crashed:', err)
    globalThis.__botPollingActive = false
  })
}
