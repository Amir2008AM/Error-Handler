/**
 * Telegram Bot — Long Polling
 *
 * Polls Telegram's getUpdates API in a persistent loop.
 * Used instead of webhooks in environments where the dev domain
 * proxy blocks inbound external connections (e.g. Replit dev).
 *
 * The bot reaches OUT to Telegram — no inbound connectivity needed.
 *
 * Safe Bot-Sync Rule compliance:
 * - Exponential backoff on errors (3 s → 6 s → 12 s → ... → 60 s cap)
 * - Backoff resets to 0 on the first successful poll
 * - Consecutive failure counter logged as a warning (never throws)
 * - Each update is processed in isolation — one bad update cannot
 *   stop the poll loop or crash the server
 */

import { TELEGRAM_API } from './config'
import { handleUpdate, type TelegramUpdate } from './handler'

const POLL_TIMEOUT_SEC     = 30   // long-poll window per request
const BACKOFF_BASE_MS      = 3_000
const BACKOFF_MAX_MS       = 60_000
const WARN_AFTER_FAILURES  = 5    // log a warning after this many consecutive errors

async function getUpdates(offset: number): Promise<TelegramUpdate[]> {
  const res = await fetch(`${TELEGRAM_API}/getUpdates`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      offset,
      timeout: POLL_TIMEOUT_SEC,
      limit:   100,
      allowed_updates: ['message', 'callback_query'],
    }),
    // Give 5 s of headroom beyond the long-poll timeout
    signal: AbortSignal.timeout((POLL_TIMEOUT_SEC + 5) * 1000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`getUpdates ${res.status}: ${text.slice(0, 120)}`)
  }

  const data = await res.json() as { ok: boolean; result?: TelegramUpdate[] }
  if (!data.ok) throw new Error(`getUpdates not ok: ${JSON.stringify(data)}`)
  return data.result ?? []
}

let _running = false

export function startPolling(): void {
  if (_running) return
  _running = true
  console.log('[TelegramBot] Long polling started — waiting for messages...')
  void pollLoop()
}

export function stopPolling(): void {
  _running = false
}

async function pollLoop(): Promise<void> {
  let offset           = 0
  let consecutiveFails = 0
  let backoffMs        = 0

  while (_running) {
    try {
      const updates = await getUpdates(offset)

      // ── Success path — reset error state ──────────────────────────────────
      if (consecutiveFails > 0) {
        console.log(`[TelegramBot] Polling recovered after ${consecutiveFails} error(s)`)
        consecutiveFails = 0
        backoffMs        = 0
      }

      for (const update of updates) {
        // Advance offset so we never reprocess the same update
        if (update.update_id >= offset) offset = update.update_id + 1

        // Each update processed in isolation — errors never stop the loop
        void handleUpdate(update).catch((err) => {
          console.error('[TelegramBot] handleUpdate error:', (err as Error).message)
        })
      }
    } catch (err) {
      const msg = (err as Error).message

      // AbortError = expected long-poll timeout expiry — loop silently
      if (msg.includes('abort') || msg.includes('Abort') || msg.includes('TimeoutError')) {
        continue
      }

      consecutiveFails++

      // Escalating warning after repeated failures
      if (consecutiveFails >= WARN_AFTER_FAILURES) {
        console.warn(
          `[TelegramBot] Polling has failed ${consecutiveFails} consecutive time(s). ` +
          `Bot is degraded but server remains running. Last error: ${msg}`
        )
      } else {
        console.error(`[TelegramBot] Polling error (#${consecutiveFails}):`, msg)
      }

      // Exponential backoff capped at BACKOFF_MAX_MS
      backoffMs = backoffMs === 0
        ? BACKOFF_BASE_MS
        : Math.min(backoffMs * 2, BACKOFF_MAX_MS)

      await new Promise((r) => setTimeout(r, backoffMs))
    }
  }

  console.log('[TelegramBot] Poll loop stopped.')
}
