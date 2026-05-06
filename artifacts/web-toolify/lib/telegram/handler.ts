/**
 * Telegram Bot — Core Update Dispatcher
 *
 * UI Rules:
 *   • All features accessible through inline keyboard buttons — no manual typing required.
 *   • /start and /help → show the main menu.
 *   • Authentication success → show the main menu automatically.
 *   • Menu navigation edits the message in-place (no chat noise).
 *   • Command results replace the message text + append a Back button.
 *   • Destructive actions (Pause Workers, Clear Queue) require confirmation.
 *
 * Auth:
 *   • 2-step gate: Full name → Password before any command runs.
 *   • Sessions last 1 hour; 3 failures → 10-minute lockout.
 *   • No sensitive input is logged. User messages deleted best-effort.
 *
 * Stability (Safe Bot-Sync Rule):
 *   • Every callback handler is wrapped in try/catch — errors are logged,
 *     never thrown, so the poll loop and server keep running.
 */

import { sendMessage, editMessageText, answerCallbackQuery, deleteMessage } from './api'
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
import {
  mainMenu, analyticsMenu, systemMenu, controlMenu, settingsMenu,
  confirmMenu, languageMenu, backButton, sectionKeyboard, cmdSection,
  menuTitle, confirmTitle,
} from './menu'

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
  `✅ *Authenticated*\n\nSession active for ${minutesLeft} minutes.\nUse the menu below to navigate.`

const MSG_LOCKED = (minutesLeft: number) =>
  `🔒 Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`

// ── Auth gate ─────────────────────────────────────────────────────────────────

/**
 * Handles the 2-step auth flow.
 * Returns true once the user is fully authenticated and ready to run commands.
 * Returns false when the message was consumed by the auth flow.
 */
async function handleAuthFlow(msg: TelegramMessage, userId: number): Promise<boolean> {
  const chatId = msg.chat.id
  const lang   = dbGetLanguage(userId)

  if (isLockedOut(userId)) {
    await sendMessage(chatId, MSG_LOCKED(lockoutMinutesLeft(userId)))
    return false
  }

  if (isAuthenticated(userId)) return true

  const step = getStep(userId)

  if (step === 'IDLE') {
    setStep(userId, 'AWAITING_NAME')
    await sendMessage(chatId, MSG_ASK_NAME)
    return false
  }

  if (step === 'AWAITING_NAME') {
    const input = msg.text ?? ''
    void deleteMessage(chatId, msg.message_id)

    if (!validateName(input)) {
      const nowLocked = recordFailure(userId)
      await sendMessage(chatId, nowLocked ? MSG_LOCKED(lockoutMinutesLeft(userId)) : MSG_DENIED)
      console.warn(`[Auth] userId=${userId} failed name verification`)
      return false
    }

    setStep(userId, 'AWAITING_PASSWORD')
    await sendMessage(chatId, MSG_ASK_PASSWORD)
    return false
  }

  if (step === 'AWAITING_PASSWORD') {
    const input = msg.text ?? ''
    void deleteMessage(chatId, msg.message_id)

    if (!validatePassword(input)) {
      const nowLocked = recordFailure(userId)
      await sendMessage(chatId, nowLocked ? MSG_LOCKED(lockoutMinutesLeft(userId)) : MSG_DENIED)
      console.warn(`[Auth] userId=${userId} failed password verification`)
      return false
    }

    setStep(userId, 'AUTHENTICATED')
    auditLog(userId, msg.from?.username, 'authenticated')

    // Send auth-success message with the main menu keyboard attached
    await sendMessage(chatId, MSG_AUTHENTICATED(sessionMinutesLeft(userId)), {
      reply_markup: mainMenu(lang),
    })
    return false
  }

  return false
}

// ── callback_query handler ────────────────────────────────────────────────────

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const userId = query.from.id
  const chatId = query.message?.chat.id
  const msgId  = query.message?.message_id
  const data   = query.data ?? ''

  // Always answer first — dismisses the spinner on the button
  await answerCallbackQuery(query.id)

  if (!chatId || !isAuthenticated(userId)) return

  const lang = dbGetLanguage(userId)

  // ── Menu section navigation — edits the message in-place ─────────────────
  if (data.startsWith('menu:') && msgId) {
    const section = data.slice(5)
    const title   = menuTitle(section, lang)
    const kb      = sectionKeyboard(section, lang)
    await editMessageText(chatId, msgId, title, { reply_markup: kb })
    return
  }

  // ── Command buttons ───────────────────────────────────────────────────────
  if (data.startsWith('cmd:') && msgId) {
    const cmd     = data.slice(4)
    const section = cmdSection(cmd)

    // Language picker — show inline keyboard
    if (cmd === 'language') {
      const text = t(lang, 'language_prompt')
      await editMessageText(chatId, msgId, text, { reply_markup: languageMenu(lang) })
      return
    }

    // Help — show help text with main menu
    if (cmd === 'help') {
      const text = await handleHelp(lang)
      await editMessageText(chatId, msgId, text, { reply_markup: mainMenu(lang) })
      return
    }

    // All other commands — run, show result + back button
    try {
      let result: string
      switch (cmd) {
        case 'stats':    result = await handleStats(lang);          break
        case 'health':   result = await handleHealth(lang);         break
        case 'tools':    result = await handleTools(lang);          break
        case 'queue':    result = await handleQueue(lang);          break
        case 'users':    result = await handleUsers(lang);          break
        case 'errors':   result = await handleErrors(lang, chatId); break
        case 'live':     result = await handleLive(lang);           break
        case 'files':    result = await handleFiles(lang);          break
        case 'insights': result = await handleInsights(lang);       break
        case 'status':   result = await handleStatus(lang);         break
        case 'resume':
          result = await handleResumeWorkers(lang)
          auditLog(userId, query.from.username, 'resume-workers')
          break
        default:
          result = t(lang, 'unknown_command').replace('{cmd}', cmd)
      }
      await editMessageText(chatId, msgId, result, { reply_markup: backButton(section, lang) })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[TelegramBot] cmd:${cmd} error:`, msg)
      await editMessageText(
        chatId, msgId,
        t(lang, 'command_failed').replace('{err}', msg.slice(0, 200)),
        { reply_markup: backButton(section, lang) },
      )
    }
    return
  }

  // ── Confirmation dialogs for destructive actions ──────────────────────────
  if (data.startsWith('confirm:') && msgId) {
    const action = data.slice(8)
    await editMessageText(
      chatId, msgId,
      confirmTitle(action, lang),
      { reply_markup: confirmMenu(action, lang) },
    )
    return
  }

  // ── Execute confirmed destructive actions ─────────────────────────────────
  if (data.startsWith('do:') && msgId) {
    const action = data.slice(3)
    try {
      let result: string
      switch (action) {
        case 'pause': result = await handlePauseWorkers(lang); break
        case 'clear': result = await handleClearQueue(lang);   break
        default:      result = t(lang, 'unknown_command').replace('{cmd}', action)
      }
      auditLog(userId, query.from.username, `confirmed:${action}`)
      await editMessageText(chatId, msgId, result, { reply_markup: controlMenu(lang) })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[TelegramBot] do:${action} error:`, msg)
      await editMessageText(
        chatId, msgId,
        t(lang, 'command_failed').replace('{err}', msg.slice(0, 200)),
        { reply_markup: controlMenu(lang) },
      )
    }
    return
  }

  // ── Language selection ────────────────────────────────────────────────────
  if (data.startsWith('set_lang:')) {
    const newLang = data.split(':')[1] as Lang
    if (newLang !== 'en' && newLang !== 'ar') return

    dbSetLanguage(userId, newLang)
    auditLog(userId, query.from.username, `set_lang:${newLang}`)

    const confirmKey = newLang === 'ar' ? 'language_changed_ar' : 'language_changed_en'
    if (msgId) {
      await editMessageText(
        chatId, msgId,
        t(newLang, confirmKey),
        { reply_markup: settingsMenu(newLang) },
      )
    }
    return
  }
}

// ── Text message handler ──────────────────────────────────────────────────────

async function handleMessage(msg: TelegramMessage): Promise<void> {
  if (!msg.text) return

  const chatId   = msg.chat.id
  const userId   = msg.from?.id
  const username = msg.from?.username

  if (!userId) return

  const authenticated = await handleAuthFlow(msg, userId)
  if (!authenticated) return

  if (isRateLimited(userId)) {
    const lang = dbGetLanguage(userId)
    await sendMessage(chatId, t(lang, 'slow_down'))
    return
  }

  const rawText = msg.text.trim()
  const command = rawText.split('@')[0].split(' ')[0].toLowerCase()
  const lang    = dbGetLanguage(userId)

  auditLog(userId, username, command)

  // /start and /help → show main menu
  if (command === '/start' || command === '/help') {
    const text = menuTitle('main', lang)
    await sendMessage(chatId, text, { reply_markup: mainMenu(lang) })
    return
  }

  // /language → show language picker
  if (command === '/language') {
    const text = t(lang, 'language_prompt')
    await sendMessage(chatId, text, { reply_markup: languageMenu(lang) })
    return
  }

  // All other commands typed manually — still supported, result sent with back button
  const COMMAND_MAP: Record<string, (lang: Lang, chatId?: number) => Promise<string>> = {
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
  }

  const handler = COMMAND_MAP[command]
  if (!handler) {
    // Unknown command — show the menu so they can navigate
    await sendMessage(
      chatId,
      t(lang, 'unknown_command').replace('{cmd}', command),
      { reply_markup: mainMenu(lang) },
    )
    return
  }

  try {
    const cmdName = command.slice(1).replace('-', '')
    const section = cmdSection(cmdName)
    const response = await handler(lang, chatId)
    await sendMessage(chatId, response, { reply_markup: backButton(section, lang) })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[TelegramBot] Command ${command} error:`, errMsg)
    await sendMessage(chatId, t(lang, 'command_failed').replace('{err}', errMsg.slice(0, 200)))
  }
}

// ── Top-level update dispatcher ───────────────────────────────────────────────

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
    } else if (update.message) {
      await handleMessage(update.message)
    }
  } catch (err) {
    // Last-resort guard — errors here must never escape to the poll loop
    console.error('[TelegramBot] Unhandled error in handleUpdate:', (err as Error).message)
  }
}
