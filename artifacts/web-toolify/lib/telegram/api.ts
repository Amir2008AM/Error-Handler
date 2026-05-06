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
    text:       text.slice(0, 4096),
    parse_mode: 'Markdown',
    ...extra,
  })
}

export async function sendAlert(chatIds: Iterable<number>, text: string): Promise<void> {
  const jobs = [...chatIds].map((id) => sendMessage(id, text))
  await Promise.allSettled(jobs)
}

/**
 * Validate the bot token. Returns bot info on success, null on failure.
 */
export async function getMe(): Promise<{ id: number; username: string; first_name: string } | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}/getMe`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json() as { ok: boolean; result?: { id: number; username: string; first_name: string } }
    if (!data.ok || !data.result) {
      console.error('[TelegramAPI] getMe failed:', JSON.stringify(data))
      return null
    }
    return data.result
  } catch (err) {
    console.error('[TelegramAPI] getMe error:', (err as Error).message)
    return null
  }
}

/**
 * Register the webhook with Telegram.
 * Returns true on success, false on failure.
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
    console.log('[TelegramAPI] setWebhook full response:', JSON.stringify(data))
    if (!data.ok) {
      console.error(`[TelegramAPI] setWebhook failed: ${data.description ?? 'unknown error'}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[TelegramAPI] setWebhook error:', (err as Error).message)
    return false
  }
}

/**
 * Fetch current webhook status from Telegram.
 */
export async function getWebhookInfo(): Promise<{
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_date?: number
  last_error_message?: string
  max_connections?: number
} | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json() as { ok: boolean; result?: Record<string, unknown> }
    if (!data.ok || !data.result) {
      console.error('[TelegramAPI] getWebhookInfo failed:', JSON.stringify(data))
      return null
    }
    return data.result as ReturnType<typeof getWebhookInfo> extends Promise<infer T> ? NonNullable<T> : never
  } catch (err) {
    console.error('[TelegramAPI] getWebhookInfo error:', (err as Error).message)
    return null
  }
}

/** Remove the webhook (switches back to polling — use in dev only). */
export async function deleteWebhook(): Promise<void> {
  await call('deleteWebhook', { drop_pending_updates: false })
}

/**
 * Delete a message from a chat.
 * Best-effort: bots cannot delete user messages in private chats —
 * the call is made silently and failures are swallowed.
 */
export async function deleteMessage(chatId: number, messageId: number): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, message_id: messageId }),
      signal:  AbortSignal.timeout(5_000),
    })
    // Response not checked — deletion is best-effort only.
    // Telegram does not allow bots to delete user messages in private chats.
  } catch {
    // Silently ignore — never let a failed deletion crash the auth flow
  }
}

/**
 * Edit the text (and optionally the keyboard) of an existing bot message.
 * Silently swallows "message is not modified" errors (Telegram returns 400
 * when text + markup haven't changed — this is expected and not an error).
 */
export async function editMessageText(
  chatId:    number,
  messageId: number,
  text:      string,
  extra:     Record<string, unknown> = {},
): Promise<void> {
  try {
    const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        message_id: messageId,
        text:       text.slice(0, 4096),
        parse_mode: 'Markdown',
        ...extra,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      // 400 "message is not modified" is normal — ignore it
      if (res.status === 400 && body.includes('message is not modified')) return
      console.error(`[TelegramAPI] editMessageText failed ${res.status}: ${body.slice(0, 200)}`)
    }
  } catch (err) {
    console.error('[TelegramAPI] editMessageText error:', (err as Error).message)
  }
}

/**
 * Acknowledge a callback_query (dismisses the loading spinner on the button).
 * Must be called within 10 s of receiving the callback_query update.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  })
}
