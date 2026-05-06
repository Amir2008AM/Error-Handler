/**
 * Live Session Manager
 *
 * Auto-refreshes a Telegram message every REFRESH_MS with live server data.
 * No time limit — runs until the owner explicitly presses ⏹ Stop.
 * No session cap — owner has full control.
 *
 * Safe Bot-Sync Rule:
 *  - Every tick is fully wrapped in try/catch
 *  - Telegram API errors (rate-limit, message deleted, etc.) are silently ignored
 *  - setInterval.unref() lets the process exit cleanly if needed
 */

import { editMessageText } from './api'
import { handleLive } from './commands'
import { type Lang } from './i18n'

const REFRESH_MS = 10_000  // 10 seconds between edits

interface LiveSession {
  intervalId: ReturnType<typeof setInterval>
  messageId:  number
  userId:     number
  lang:       Lang
  startedAt:  number
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

async function tick(chatId: number): Promise<void> {
  const session = sessions.get(chatId)
  if (!session) return

  try {
    const data = await handleLive(session.lang)
    const ts   = new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })

    const runningSec = Math.floor((Date.now() - session.startedAt) / 1000)
    const runningFmt = runningSec >= 60
      ? `${Math.floor(runningSec / 60)}m ${runningSec % 60}s`
      : `${runningSec}s`

    const footer = session.lang === 'ar'
      ? `\n\n🕐 آخر تحديث: \`${ts} UTC\`  •  ⏱ منذ: \`${runningFmt}\``
      : `\n\n🕐 Updated: \`${ts} UTC\`  •  ⏱ Running: \`${runningFmt}\``

    await editMessageText(chatId, session.messageId, data + footer, {
      reply_markup: stopButton(session.lang),
    })
  } catch {
    // Silently ignore — message may have been deleted or Telegram rate-limited us
  }
}

/**
 * Start a live auto-refresh session for a chat.
 * Replaces any existing session for the same chatId.
 * Runs indefinitely until stopLiveSession() is called.
 */
export function startLiveSession(
  chatId:    number,
  messageId: number,
  userId:    number,
  lang:      Lang,
): void {
  // Stop any existing session for this chat first
  stopLiveSession(chatId)

  const intervalId = setInterval(() => { void tick(chatId) }, REFRESH_MS)
  if ((intervalId as unknown as { unref?: () => void }).unref) {
    (intervalId as unknown as { unref: () => void }).unref()
  }

  sessions.set(chatId, {
    intervalId,
    messageId,
    userId,
    lang,
    startedAt: Date.now(),
  })
}

/** Stop and remove an active live session. Returns true if one was running. */
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
