import { NextRequest, NextResponse } from 'next/server'
import { dbGetContacts } from '@/lib/telegram/db'
import { verifyOpsSession } from '@/app/api/ops/auth/route'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!verifyOpsSession(req)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url   = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200)
  const rows  = dbGetContacts(limit)

  return NextResponse.json({
    total: rows.length,
    messages: rows.map((r) => ({
      id:        r.id,
      email:     r.email,
      message:   r.message,
      ip:        r.ip,
      delivered: r.delivered === 1,
      channel:   r.channel,
      date:      new Date(r.created_at).toISOString(),
    })),
  })
}
