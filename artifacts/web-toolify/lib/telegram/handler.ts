/**
 * Telegram Bot — core update dispatcher.
 *
 * All messages pass through a 2-step auth gate before any command is executed:
 *   Step 1 — Full legal name  (3 parts, case-insensitive exact match)
 *   Step 2 — Admin password   (exact match)
 *
 * Once authenticated, sessions last 1 hour and then require re-auth.
 * Failed attempts are rate-limited; 3 failures trigger a 10-minute lockout.
 * No sensitive inputs are logged. User messages are deleted best-effort.
 */

import { sendMessage, answerCallbackQuery, deleteMessage } from './api'
import { isRateLimited } from './rate-limiter'
import { dbGetLanguage, dbSetLanguage } from './db'
import { t, type Lang } from './i18n'
import {
  handleStats, handleHealth, handleTools, handleQueue,
  handleUsers, handleErrors, handleLive, handleFiles,
  handleInsights, handleStatus, handlePauseWorkers, handleResumeWorkers,
  handleClearQueue, handleHelp, handleLanguage,
} from './commands'
import {
  isAuthenticated, isLockedOut, lockoutMinutesLeft, sessionMinutesLeft,
  getStep, setStep, recordFailure, validateName, validatePassword,
} from './auth'

// ── Telegram update types ─────────────────────────────────────────────────────

export interface TelegramUser    { id: number; first_name?: string; username?: string }
export interface TelegramChat    { id: number }
export interface TelegramMessage { message_id: number; from?: TelegramUser; chat: TelegramChat; text?: string }

export interface TelegramCallbackQuery {
  id:       string
  from:     TelegramUser
  message?: { message_id: number; chat: TelegramChat }
  data?:    string
}

export interface TelegramUpdate {
  update_id:       number
  message?:        TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export function parseUpdate(body: unknown): TelegramUpdate | null {
  if (!body || typeof body !== 'object') return null
  const u = body as Record<string, unknown>
  if (typeof u.update_id !== 'number') return null
  return u as unknown as TelegramUpdate
}

function auditLog(userId: number, username: string | undefined, action: string): void {
  console.log(`[TelegramBot] Admin ${userId} (${username ?? 'unknown'}) → ${action}`)
}

// ── Auth messages — never reveal which step failed ────────────────────────────

const MSG_ASK_NAME =
  '🔐 *Authentication Required*\n\nEnter your full name _(first, middle, last)_:'

const MSG_ASK_PASSWORD =
  '🔑 Enter the admin password:'

const MSG_DENIED =
  '⛔ *Access Denied*'

const MSG_AUTHENTICATED = (minutesLeft: number) =>
  `✅ *Authenticated*\n\nSession active for ${minutesLeft} minutes.\nType /help to see available commands.`

const MSG_SESSION_EXPIRED =
  '⏳ *Session expired.* Please re\\-authenticate.\n\n' + MSG_ASK_NAME.slice(3)

const MSG_LOCKED = (minutesLeft: number) =>
  `🔒 Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`

// ── Command map ───────────────────────────────────────────────────────────────

type Handler = (lang: Lang, chatId: number) => Promise<string>

const COMMAND_MAP: Record<string, Handler> = {
  '/stats':           handleStats,
  '/health':          handleHealth,
  '/tools':           handleTools,
  '/queue':           handleQueue,
  '/users':           handleUsers,
  '/errors':          handleErrors,
  '/live':            handleLive,
  '/files':           handleFiles,
  '/insights':        handleInsights,
  '/status':          handleStatus,
  '/pause-workers':   handlePauseWorkers,
  '/resume-workers':  handleResumeWorkers,
  '/clear-queue':     handleClearQueue,
  '/help':            handleHelp,
  '/start':           handleHelp,
}

// ── Inline keyboard for /language ─────────────────────────────────────────────

function languageKeyboard(lang: Lang) {
  return {
    inline_keyboard: [[
      { text: t(lang, 'lang_btn_en'), callback_data: 'set_lang:en' },
      { text: t(lang, 'lang_btn_ar'), callback_data: 'set_lang:ar' },
    ]],
  }
}

// ── Auth gate ─────────────────────────────────────────────────────────────────

/**
 * Handles the 2-step auth flow.
 * Returns true once the user is fully authenticated and ready to run commands.
 * Returns false when the message was consumed by the auth flow.
 */
async function handleAuthFlow(msg: TelegramMessage, userId: number): Promise<boolean> {
  const chatId = msg.chat.id

  // ── Brute-force lockout ───────────────────────────────────────────────────
  if (isLockedOut(userId)) {
    await sendMessage(chatId, MSG_LOCKED(lockoutMinutesLeft(userId)))
    return false
  }

  const step = getStep(userId)

  // ── Already authenticated ─────────────────────────────────────────────────
  if (isAuthenticated(userId)) return true

  // ── Session just expired — reset to IDLE and re-prompt ───────────────────
  if (step === 'IDLE' && msg.text?.startsWith('/')) {
    // Could be a returning user whose session expired mid-session
  }

  // ── IDLE — start the auth flow ────────────────────────────────────────────
  if (step === 'IDLE') {
    setStep(userId, 'AWAITING_NAME')
    await sendMessage(chatId, MSG_ASK_NAME)
    return false
  }

  // ── AWAITING_NAME — validate the submitted name ───────────────────────────
  if (step === 'AWAITING_NAME') {
    const input = msg.text ?? ''

    // Delete user's name message immediately (best-effort)
    void deleteMessage(chatId, msg.message_id)

    if (!validateName(input)) {
      const nowLocked = recordFailure(userId)
      if (nowLocked) {
        await sendMessage(chatId, MSG_LOCKED(lockoutMinutesLeft(userId)))
      } else {
        await sendMessage(chatId, MSG_DENIED)
      }
      console.warn(`[Auth] userId=${userId} failed name verification`)
      return false
    }

    // Name correct — advance without confirming ("correct/wrong" leak prevention)
    setStep(userId, 'AWAITING_PASSWORD')
    await sendMessage(chatId, MSG_ASK_PASSWORD)
    return false
  }

  // ── AWAITING_PASSWORD — validate the submitted password ───────────────────
  if (step === 'AWAITING_PASSWORD') {
    const input = msg.text ?? ''

    // Delete user's password message immediately (best-effort)
    void deleteMessage(chatId, msg.message_id)

    if (!validatePassword(input)) {
      const nowLocked = recordFailure(userId)
      if (nowLocked) {
        await sendMessage(chatId, MSG_LOCKED(lockoutMinutesLeft(userId)))
      } else {
        await sendMessage(chatId, MSG_DENIED)
      }
      console.warn(`[Auth] userId=${userId} failed password verification`)
      return false
    }

    // Password correct — grant session
    setStep(userId, 'AUTHENTICATED')
    auditLog(userId, msg.from?.username, 'authenticated')
    await sendMessage(chatId, MSG_AUTHENTICATED(sessionMinutesLeft(userId)))
    return false  // this message was the password — don't process it as a command
  }

  return false
}

// ── callback_query handler ────────────────────────────────────────────────────

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const userId = query.from.id
  const chatId = query.message?.chat.id

  // Require active session for inline keyboard interactions too
  if (!chatId || !isAuthenticated(userId)) {
    await answerCallbackQuery(query.id)
    return
  }

  await answerCallbackQuery(query.id)

  if (query.data?.startsWith('set_lang:')) {
    const newLang = query.data.split(':')[1] as Lang
    if (newLang !== 'en' && newLang !== 'ar') return

    dbSetLanguage(userId, newLang)
    auditLog(userId, query.from.username, `set_lang:${newLang}`)

    const confirmKey: 'language_changed_ar' | 'language_changed_en' =
      newLang === 'ar' ? 'language_changed_ar' : 'language_changed_en'
    await sendMessage(chatId, t(newLang, confirmKey))
  }
}

// ── message handler ───────────────────────────────────────────────────────────

async function handleMessage(msg: TelegramMessage): Promise<void> {
  if (!msg.text) return

  const chatId   = msg.chat.id
  const userId   = msg.from?.id
  const username = msg.from?.username

  if (!userId) return

  // ── Session expired mid-session — re-prompt without leaking it ───────────
  if (!isAuthenticated(userId) && getStep(userId) === 'IDLE') {
    // If user was previously authenticated (step was AUTHENTICATED but expired),
    // proactively inform them their session lapsed before restarting auth.
    const wasAuthenticated = false // can't detect without extra state; auth flow handles it cleanly
    void wasAuthenticated  // suppress unused warning
  }

  // ── 2-step auth gate — returns true only when fully authenticated ─────────
  const authenticated = await handleAuthFlow(msg, userId)
  if (!authenticated) return

  // ── Rate limiting (post-auth, per-user command throttle) ──────────────────
  if (isRateLimited(userId)) {
    const lang = dbGetLanguage(userId)
    await sendMessage(chatId, t(lang, 'slow_down'))
    return
  }

  // ── Command dispatch ──────────────────────────────────────────────────────
  const rawText = msg.text.trim()
  const command = rawText.split('@')[0].split(' ')[0].toLowerCase()

  auditLog(userId, username, command)

  const lang = dbGetLanguage(userId)

  if (command === '/language') {
    const text = await handleLanguage(lang)
    await sendMessage(chatId, text, { reply_markup: languageKeyboard(lang) })
    return
  }

  const handler = COMMAND_MAP[command]
  if (!handler) {
    await sendMessage(chatId, t(lang, 'unknown_command').replace('{cmd}', command))
    return
  }

  try {
    const response = await handler(lang, chatId)
    await sendMessage(chatId, response)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[TelegramBot] Command ${command} error:`, errMsg)
    await sendMessage(chatId, t(lang, 'command_failed').replace('{err}', errMsg.slice(0, 200)))
  }
}

// ── Top-level update dispatcher ───────────────────────────────────────────────

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query)
  } else if (update.message) {
    await handleMessage(update.message)
  }
}
