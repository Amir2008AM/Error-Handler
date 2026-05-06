/**
 * Telegram Bot — core update dispatcher.
 *
 * Shared between the webhook HTTP route and the long-polling loop.
 * Contains all message handling, command dispatch, and callback_query logic.
 */

import { ADMIN_IDS } from './config'
import { sendMessage, answerCallbackQuery } from './api'
import { isRateLimited } from './rate-limiter'
import { dbGetLanguage, dbSetLanguage } from './db'
import { t, type Lang } from './i18n'
import {
  handleStats, handleHealth, handleTools, handleQueue,
  handleUsers, handleErrors, handleLive, handleFiles,
  handleInsights, handleStatus, handlePauseWorkers, handleResumeWorkers,
  handleClearQueue, handleHelp, handleLanguage,
} from './commands'

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

// ── callback_query handler ────────────────────────────────────────────────────

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const userId = query.from.id
  const chatId = query.message?.chat.id

  if (!chatId || !ADMIN_IDS.has(userId)) {
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

  if (!userId || !ADMIN_IDS.has(userId)) {
    await sendMessage(chatId, '⛔ Access denied. This bot is restricted to admins only.')
    console.warn(`[TelegramBot] Rejected non-admin userId=${userId} chatId=${chatId}`)
    return
  }

  if (isRateLimited(userId)) {
    const lang = dbGetLanguage(userId)
    await sendMessage(chatId, t(lang, 'slow_down'))
    return
  }

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
