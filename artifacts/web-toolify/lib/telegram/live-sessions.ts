/**
 * Live Session Manager
 *
 * Provides auto-refreshing Telegram messages — the bot edits the same
 * message every REFRESH_MS milliseconds with fresh data.
 *
 * Design:
 *  - One session per chatId (starting a new one replaces the old one)
 *  - Auto-stops after SESSION_TTL_MS (5 minutes) to avoid runaway timers
 *  - Max MAX_SESSIONS concurrent sessions (evicts oldest if exceeded)
 *  - Every tick is fully try/catch — a Telegram API error never kills the interval
 *  - Uses setInterval.unref() so the process can exit cleanly
 */

import { editMessageText } from './api'
import { handleLive } from './commands'
import { type Lang } from './i18n'

const REFRESH_MS     = 10_000        // 10 seconds between edits
const SESSION_TTL_MS = 5 * 60_000   // auto-stop after 5 minutes
const MAX_SESSIONS   = 20

interface LiveSession {
  intervalId: ReturnType<typeof setInterval>
  messageId:  number
  userId:     number
  lang:       Lang
  stopAt:     number
}

const sessions = new Map<number, LiveSession>() // chatId → session

function stopButton(lang: Lang): Record<string, unknown> {
  return {
    inline_keyboard: [[{
      text:          lang === 'ar' ? '⏹ إيقاف التحديث' : '⏹ Stop Live',
      callback_data: 'live:stop',
    }]],
  }
}

function expiredText(lang: Lang): string {
  return lang === 'ar'
    ? '⏹ *انتهى التحديث المباشر*\n\nانتهت الجلسة تلقائياً بعد 5 دقائق.'
    : '⏹ *Live session ended*\n\nAuto-stopped after 5 minutes.'
}

async function tick(chatId: number): Promise<void> {
  const session = sessions.get(chatId)
  if (!session) return

  // Auto-stop on TTL expiry
  if (Date.now() >= session.stopAt) {
    stopLiveSession(chatId)
    try {
      await editMessageText(chatId, session.messageId, expiredText(session.lang))
    } catch { /* ignore */ }
    return
  }

  try {
    const data = await handleLive(session.lang)
    const ts   = new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })
    const footer = session.lang === 'ar'
      ? `\n\n🕐 آخر تحديث: \`${ts} UTC\``
      : `\n\n🕐 Updated: \`${ts} UTC\``

    await editMessageText(chatId, session.messageId, data + footer, {
      reply_markup: stopButton(session.lang),
    })
  } catch {
    // Silently ignore edit errors (message deleted, rate-limited, etc.)
  }
}

/** Start a live auto-refresh session for a chat. Replaces any existing session. */
export function startLiveSession(
  chatId:    number,
  messageId: number,
  userId:    number,
  lang:      Lang,
): void {
  // Replace existing session for this chat
  stopLiveSession(chatId)

  // Evict oldest session if at capacity
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value
    if (oldest !== undefined) stopLiveSession(oldest)
  }

  const intervalId = setInterval(() => { void tick(chatId) }, REFRESH_MS)
  if ((intervalId as unknown as { unref?: () => void }).unref) {
    (intervalId as unknown as { unref: () => void }).unref()
  }

  sessions.set(chatId, {
    intervalId,
    messageId,
    userId,
    lang,
    stopAt: Date.now() + SESSION_TTL_MS,
  })
}

/** Stop and remove an active live session. */
export function stopLiveSession(chatId: number): boolean {
  const session = sessions.get(chatId)
  if (!session) return false
  clearInterval(session.intervalId)
  sessions.delete(chatId)
  return true
}

/** How many live sessions are currently active. */
export function activeLiveSessions(): number {
  return sessions.size
}
