/**
 * Telegram Bot API — thin async wrapper around the REST API.
 * Uses fetch (built into Node 18+). Never blocks the event loop.
 */

import { TELEGRAM_API } from './config'

async function call(method: string, body: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[TelegramAPI] ${method} failed ${res.status}: ${text.slice(0, 200)}`)
    }
  } catch (err) {
    console.error(`[TelegramAPI] ${method} error:`, (err as Error).message)
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  await call('sendMessage', {
    chat_id:    chatId,
    text:       text.slice(0, 4096),   // Telegram hard limit
    parse_mode: 'Markdown',
    ...extra,
  })
}

export async function sendAlert(chatIds: Iterable<number>, text: string): Promise<void> {
  const jobs = [...chatIds].map((id) => sendMessage(id, text))
  await Promise.allSettled(jobs)
}

/**
 * Register the webhook with Telegram.
 * Returns true on success, false on failure (so the caller can log clearly).
 */
export async function setWebhook(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, max_connections: 40, drop_pending_updates: true }),
      signal:  AbortSignal.timeout(10_000),
    })
    const data = await res.json() as { ok: boolean; description?: string }
    if (!data.ok) {
      console.error(`[TelegramAPI] setWebhook failed: ${data.description ?? 'unknown error'}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`[TelegramAPI] setWebhook error:`, (err as Error).message)
    return false
  }
}

/** Remove the webhook (switches back to polling — use in dev only). */
export async function deleteWebhook(): Promise<void> {
  await call('deleteWebhook', { drop_pending_updates: false })
}
