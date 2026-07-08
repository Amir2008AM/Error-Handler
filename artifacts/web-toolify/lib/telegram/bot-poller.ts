/**
 * Telegram Bot — Long Polling
 *
 * Replaces webhook. The bot proactively fetches updates from Telegram
 * every cycle (long-poll with timeout=25s). Works on any host without
 * needing a public URL.
 *
 * Started once from instrumentation.ts via globalThis guard.
 * Uses AbortController so old loop is cleanly cancelled before a new one starts.
 */

import { handleUpdate, type TgUpdate } from './bot-handler'

declare global {
  var __botPollingActive: boolean | undefined
  var __botAbortController: AbortController | undefined
  var __botPollOffset: number | undefined   // persists across HMR so updates aren't replayed
}

const POLL_TIMEOUT = 25        // seconds — Telegram holds connection this long
const RETRY_DELAY  = 5_000     // ms — wait before retrying on error

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function poll(signal: AbortSignal): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[Bot] TELEGRAM_BOT_TOKEN not set — polling disabled')
    return
  }

  // Delete webhook + drop any pending session conflicts
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`, {
      signal: AbortSignal.timeout(8_000),
    })
    // Close any existing getUpdates sessions
    await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1&timeout=0`, {
      signal: AbortSignal.timeout(8_000),
    })
    console.log('[Bot] Session cleared, long polling starting ✓')
  } catch { /* non-fatal */ }

  let offset = 0

  while (!signal.aborted) {
    try {
      // Combine our signal with a timeout signal
      const timeoutSignal = AbortSignal.timeout((POLL_TIMEOUT + 10) * 1000)
      const combined = AbortSignal.any
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal

      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=${POLL_TIMEOUT}&offset=${offset}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'callback_query']))}`,
        { signal: combined },
      )

      if (signal.aborted) break

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        // 409 Conflict: another instance is running — wait and retry
        if (res.status === 409) {
          await sleep(10_000)
          continue
        }
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
      if (signal.aborted) break
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('TimeoutError') && !msg.includes('aborted')) {
        console.warn('[Bot] poll error:', msg)
      }
      await sleep(RETRY_DELAY)
    }
  }
}

/** Call once at server startup — safe to call multiple times (cancels previous loop first) */
export function startBotPolling(): void {
  // Cancel any existing polling loop
  if (globalThis.__botAbortController) {
    globalThis.__botAbortController.abort()
    globalThis.__botAbortController = undefined
  }

  if (globalThis.__botPollingActive) {
    // Let the old loop die, then restart after a short delay
    globalThis.__botPollingActive = false
    setTimeout(() => startBotPolling(), 3_000)
    return
  }

  const controller = new AbortController()
  globalThis.__botAbortController = controller
  globalThis.__botPollingActive = true

  poll(controller.signal).catch((err) => {
    console.error('[Bot] polling crashed:', err)
    globalThis.__botPollingActive = false
    globalThis.__botAbortController = undefined
  }).finally(() => {
    globalThis.__botPollingActive = false
  })
}
