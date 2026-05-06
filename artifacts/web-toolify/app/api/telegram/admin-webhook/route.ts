/**
 * POST /api/telegram/admin-webhook
 *
 * Webhook receiver — kept as a fallback for deployed environments
 * where the public URL is stable and reachable by Telegram.
 *
 * In development (Replit), long polling is used instead via
 * lib/telegram/poller.ts (started in instrumentation.ts).
 *
 * Safe Bot-Sync Rule compliance:
 * - Returns 200 immediately; update processing is fire-and-forget
 * - Missing bot token returns 503 (graceful degradation) — never crashes
 * - Parse errors return 200 to prevent Telegram from retrying indefinitely
 * - handleUpdate errors are caught and logged, never leaked to the response
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseUpdate, handleUpdate } from '@/lib/telegram/handler'
import { getAdminIds } from '@/lib/telegram/config'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: if bot token is missing, acknowledge silently without processing
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, reason: 'Bot not configured' },
      { status: 503 }
    )
  }

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
    console.error('[TelegramBot] Unhandled error in handleUpdate:', (err as Error).message)
  })

  return NextResponse.json({ ok: true })
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status:    process.env.TELEGRAM_BOT_TOKEN ? 'ok' : 'disabled',
    bot:       'Toolify Admin Bot',
    admins:    getAdminIds().size,
    configured: !!process.env.TELEGRAM_BOT_TOKEN,
  })
}
