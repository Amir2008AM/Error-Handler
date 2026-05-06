/**
 * Telegram Bot — Long Polling
 *
 * Polls Telegram's getUpdates API in a persistent loop.
 * Used instead of webhooks in environments where the dev domain
 * proxy blocks inbound external connections (e.g. Replit dev).
 *
 * The bot reaches OUT to Telegram — no inbound connectivity needed.
 */

import { TELEGRAM_API } from './config'
import { handleUpdate, type TelegramUpdate } from './handler'

const POLL_TIMEOUT_SEC = 30  // long-poll window per request

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

async function pollLoop(): Promise<void> {
  let offset = 0

  while (_running) {
    try {
      const updates = await getUpdates(offset)

      for (const update of updates) {
        // Advance offset so we never reprocess the same update
        if (update.update_id >= offset) offset = update.update_id + 1

        console.log(`[TelegramBot] Received update_id=${update.update_id}`)

        void handleUpdate(update).catch((err) => {
          console.error('[TelegramBot] handleUpdate error:', (err as Error).message)
        })
      }
    } catch (err) {
      const msg = (err as Error).message
      // AbortError = expected timeout expiry — just loop again silently
      if (msg.includes('abort') || msg.includes('Abort')) {
        continue
      }
      console.error('[TelegramBot] Polling error:', msg)
      // Back off before retrying on real errors
      await new Promise((r) => setTimeout(r, 3_000))
    }
  }
}
