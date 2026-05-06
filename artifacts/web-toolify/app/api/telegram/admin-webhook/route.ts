/**
 * POST /api/telegram/admin-webhook
 *
 * Telegram webhook receiver. Handles all incoming updates, validates
 * admin access, applies rate limiting, dispatches commands.
 * Non-blocking: always returns 200 immediately; processing is async.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_IDS } from '@/lib/telegram/config'
import { sendMessage } from '@/lib/telegram/api'
import { isRateLimited } from '@/lib/telegram/rate-limiter'
import {
  handleStats, handleHealth, handleTools, handleQueue,
  handleUsers, handleErrors, handleLive, handleFiles,
  handleInsights, handlePauseWorkers, handleResumeWorkers,
  handleClearQueue, handleHelp,
} from '@/lib/telegram/commands'

interface TelegramUser { id: number; first_name?: string; username?: string }
interface TelegramMessage { message_id: number; from?: TelegramUser; chat: { id: number }; text?: string }
interface TelegramUpdate { update_id: number; message?: TelegramMessage }

/** Validate the update has the minimum required shape. */
function parseUpdate(body: unknown): TelegramUpdate | null {
  if (!body || typeof body !== 'object') return null
  const u = body as Record<string, unknown>
  if (typeof u.update_id !== 'number') return null
  return u as unknown as TelegramUpdate
}

/** Log all admin interactions for audit purposes. */
function auditLog(userId: number, username: string | undefined, command: string): void {
  console.log(`[TelegramBot] Admin ${userId} (${username ?? 'unknown'}) → ${command}`)
}

const COMMAND_MAP: Record<string, () => Promise<string>> = {
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

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message
  if (!msg?.text) return

  const chatId = msg.chat.id
  const userId = msg.from?.id
  const username = msg.from?.username

  // ── Security: admin-only ──────────────────────────────────────────────────
  if (!userId || !ADMIN_IDS.has(userId)) {
    await sendMessage(chatId, '⛔ Access denied. This bot is restricted to admins only.')
    console.warn(`[TelegramBot] Rejected non-admin userId=${userId} chatId=${chatId}`)
    return
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (isRateLimited(userId)) {
    await sendMessage(chatId, '⏳ Slow down — one command at a time please.')
    return
  }

  // ── Command dispatch ──────────────────────────────────────────────────────
  // Strip @BotName suffix if present (e.g. /stats@MyBot)
  const rawText = msg.text.trim()
  const command = rawText.split('@')[0].split(' ')[0].toLowerCase()

  auditLog(userId, username, command)

  const handler = COMMAND_MAP[command]
  if (!handler) {
    await sendMessage(chatId, `❓ Unknown command: \`${command}\`\n\nType /help to see all commands.`)
    return
  }

  try {
    const response = await handler()
    await sendMessage(chatId, response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[TelegramBot] Command ${command} error:`, msg)
    await sendMessage(chatId, `⚠️ Command failed: ${msg.slice(0, 200)}`)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Always return 200 immediately — Telegram will retry on non-200
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

  // Fire-and-forget — do not await so Telegram gets 200 instantly
  void handleUpdate(update).catch((err) => {
    console.error('[TelegramBot] Unhandled error in handleUpdate:', err)
  })

  return NextResponse.json({ ok: true })
}

// GET for webhook verification / health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    bot:    'Toolify Admin Bot',
    admins: ADMIN_IDS.size,
  })
}
