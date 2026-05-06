/**
 * POST /api/telegram/admin-webhook
 *
 * Webhook receiver — kept as a fallback for deployed environments
 * where the public URL is stable and reachable by Telegram.
 *
 * In development (Replit), long polling is used instead via
 * lib/telegram/poller.ts (started in instrumentation.ts).
 *
 * Non-blocking: always returns 200 immediately; processing is async.
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseUpdate, handleUpdate } from '@/lib/telegram/handler'
import { ADMIN_IDS } from '@/lib/telegram/config'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  console.log('TELEGRAM HIT:', JSON.stringify(body))

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
