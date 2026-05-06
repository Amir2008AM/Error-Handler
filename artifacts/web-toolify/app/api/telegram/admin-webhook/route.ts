/**
 * POST /api/telegram/admin-webhook
 *
 * Telegram webhook receiver. Handles all incoming updates, validates
 * admin access, applies rate limiting, dispatches commands.
 * Non-blocking: always returns 200 immediately; processing is async.
 *
 * Supports:
 *  - message updates  → command dispatch (with per-user language)
 *  - callback_query   → inline keyboard responses (language selection)
 */

import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_IDS } from '@/lib/telegram/config'
import { sendMessage, answerCallbackQuery } from '@/lib/telegram/api'
import { isRateLimited } from '@/lib/telegram/rate-limiter'
import { dbGetLanguage, dbSetLanguage } from '@/lib/telegram/db'
import { t, type Lang } from '@/lib/telegram/i18n'
import {
  handleStats, handleHealth, handleTools, handleQueue,
  handleUsers, handleErrors, handleLive, handleFiles,
  handleInsights, handlePauseWorkers, handleResumeWorkers,
  handleClearQueue, handleHelp, handleLanguage,
} from '@/lib/telegram/commands'

// ── Telegram update types ─────────────────────────────────────────────────────

interface TelegramUser    { id: number; first_name?: string; username?: string }
interface TelegramChat    { id: number }
interface TelegramMessage { message_id: number; from?: TelegramUser; chat: TelegramChat; text?: string }

interface TelegramCallbackQuery {
  id:       string
  from:     TelegramUser
  message?: { message_id: number; chat: TelegramChat }
  data?:    string
}

interface TelegramUpdate {
  update_id:       number
  message?:        TelegramMessage
  callback_query?: TelegramCallbackQuery
}

function parseUpdate(body: unknown): TelegramUpdate | null {
  if (!body || typeof body !== 'object') return null
  const u = body as Record<string, unknown>
  if (typeof u.update_id !== 'number') return null
  return u as unknown as TelegramUpdate
}

function auditLog(userId: number, username: string | undefined, action: string): void {
  console.log(`[TelegramBot] Admin ${userId} (${username ?? 'unknown'}) → ${action}`)
}

// ── Command map ───────────────────────────────────────────────────────────────

type Handler = (lang: Lang) => Promise<string>

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
    // Acknowledge to dismiss spinner even for non-admins
    await answerCallbackQuery(query.id)
    return
  }

  // Dismiss the button spinner immediately
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

  // Security: admin-only
  if (!userId || !ADMIN_IDS.has(userId)) {
    await sendMessage(chatId, '⛔ Access denied. This bot is restricted to admins only.')
    console.warn(`[TelegramBot] Rejected non-admin userId=${userId} chatId=${chatId}`)
    return
  }

  // Rate limiting
  if (isRateLimited(userId)) {
    const lang = dbGetLanguage(userId)
    await sendMessage(chatId, t(lang, 'slow_down'))
    return
  }

  // Strip @BotName suffix (e.g. /stats@MyBot → /stats)
  const rawText = msg.text.trim()
  const command = rawText.split('@')[0].split(' ')[0].toLowerCase()

  auditLog(userId, username, command)

  const lang = dbGetLanguage(userId)

  // /language is special — response includes an inline keyboard
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
    const response = await handler(lang)
    await sendMessage(chatId, response)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[TelegramBot] Command ${command} error:`, errMsg)
    await sendMessage(chatId, t(lang, 'command_failed').replace('{err}', errMsg.slice(0, 200)))
  }
}

// ── Top-level update dispatcher ───────────────────────────────────────────────

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query)
  } else if (update.message) {
    await handleMessage(update.message)
  }
}

// ── Next.js route handlers ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  const update = parseUpdate(body)
  if (!update) {
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  // Fire-and-forget — return 200 instantly so Telegram doesn't retry
  void handleUpdate(update).catch((err) => {
    console.error('[TelegramBot] Unhandled error in handleUpdate:', err)
  })

  return NextResponse.json({ ok: true })
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    bot:    'Toolify Admin Bot',
    admins: ADMIN_IDS.size,
  })
}
