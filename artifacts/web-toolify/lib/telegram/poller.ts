/**
 * Telegram Bot — Long Polling
 *
 * Polls Telegram's getUpdates API in a persistent loop.
 * Used instead of webhooks in environments where the dev domain
 * proxy blocks inbound external connections (e.g. Replit dev).
 *
 * The bot reaches OUT to Telegram — no inbound connectivity needed.
 *
 * Hot-reload safety (Next.js Turbopack / HMR):
 * - State is stored on `globalThis` via a Symbol key, so it survives
 *   module re-imports during hot reloads.
 * - Calling startPolling() while a loop is already running immediately
 *   aborts the in-flight fetch and replaces the loop — preventing the
 *   409 "Conflict: terminated by other getUpdates request" error.
 *
 * Safe Bot-Sync Rule compliance:
 * - Exponential backoff on errors (3 s → 6 s → 12 s → ... → 60 s cap)
 * - Backoff resets to 0 on the first successful poll
 * - Each update is processed in isolation — one bad update cannot
 *   stop the poll loop or crash the server
 */

import { TELEGRAM_API } from './config'
import { handleUpdate, type TelegramUpdate } from './handler'

const POLL_TIMEOUT_SEC    = 30
const BACKOFF_BASE_MS     = 3_000
const BACKOFF_MAX_MS      = 60_000
const WARN_AFTER_FAILURES = 5

// ── Global state — survives Next.js hot module reloads ────────────────────────

const GLOBAL_KEY = Symbol.for('toolify.telegram.polling')

interface PollingState {
  running: boolean
  abort:   AbortController | null
  generation: number   // incremented on each start — lets old loops self-exit
}

function getState(): PollingState {
  const g = globalThis as Record<symbol, PollingState>
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { running: false, abort: null, generation: 0 }
  }
  return g[GLOBAL_KEY]
}

// ── API call ──────────────────────────────────────────────────────────────────

async function getUpdates(offset: number, signal: AbortSignal): Promise<TelegramUpdate[]> {
  const res = await fetch(`${TELEGRAM_API}/getUpdates`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      offset,
      timeout: POLL_TIMEOUT_SEC,
      limit:   100,
      allowed_updates: ['message', 'callback_query'],
    }),
    signal: AbortSignal.any
      ? AbortSignal.any([signal, AbortSignal.timeout((POLL_TIMEOUT_SEC + 5) * 1000)])
      : signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`getUpdates ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json() as { ok: boolean; result?: TelegramUpdate[] }
  if (!data.ok) throw new Error(`getUpdates not ok: ${JSON.stringify(data)}`)
  return data.result ?? []
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the polling loop. If one is already running, it is stopped first
 * (abort signal cancels the in-flight fetch immediately) and a new loop
 * takes over. This prevents 409 conflicts on hot reloads.
 */
export function startPolling(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN) return
  const state = getState()

  // Abort any in-flight long-poll from a previous loop
  if (state.abort) {
    state.abort.abort()
    state.abort = null
  }

  state.running = true
  state.generation++

  console.log('[TelegramBot] Long polling started — waiting for messages...')
  void pollLoop(state.generation)
}

export function stopPolling(): void {
  const state = getState()
  state.running = false
  if (state.abort) {
    state.abort.abort()
    state.abort = null
  }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function pollLoop(myGeneration: number): Promise<void> {
  const state  = getState()
  let offset           = 0
  let consecutiveFails = 0
  let backoffMs        = 0

  while (state.running && state.generation === myGeneration) {
    const ac = new AbortController()
    state.abort = ac

    try {
      const updates = await getUpdates(offset, ac.signal)

      // ── Success — reset error state ────────────────────────────────────────
      if (consecutiveFails > 0) {
        console.log(`[TelegramBot] Polling recovered after ${consecutiveFails} error(s)`)
        consecutiveFails = 0
        backoffMs        = 0
      }

      for (const update of updates) {
        if (update.update_id >= offset) offset = update.update_id + 1
        // Each update isolated — errors never kill the loop
        void handleUpdate(update).catch((err) => {
          console.error('[TelegramBot] handleUpdate error:', (err as Error).message)
        })
      }

    } catch (err) {
      const msg = (err as Error).message

      // Abort = intentional stop (startPolling replaced us) — exit silently
      if (
        msg.includes('abort') || msg.includes('Abort') ||
        msg.includes('TimeoutError') || msg.includes('AbortError')
      ) {
        break
      }

      consecutiveFails++

      if (consecutiveFails >= WARN_AFTER_FAILURES) {
        console.warn(
          `[TelegramBot] Polling has failed ${consecutiveFails} consecutive time(s). ` +
          `Bot degraded but server running. Last error: ${msg}`
        )
      } else {
        console.error(`[TelegramBot] Polling error (#${consecutiveFails}):`, msg)
      }

      // Exponential backoff, capped at BACKOFF_MAX_MS
      backoffMs = backoffMs === 0
        ? BACKOFF_BASE_MS
        : Math.min(backoffMs * 2, BACKOFF_MAX_MS)

      await new Promise<void>((r) => setTimeout(r, backoffMs))
    } finally {
      // Clear the reference only if it's still ours
      if (state.abort === ac) state.abort = null
    }
  }

  if (state.generation !== myGeneration) {
    console.log('[TelegramBot] Poll loop superseded by newer instance — exiting.')
  } else {
    console.log('[TelegramBot] Poll loop stopped.')
  }
}
