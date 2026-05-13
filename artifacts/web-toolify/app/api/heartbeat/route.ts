/**
 * POST /api/heartbeat
 *
 * Called every 5 seconds by the client-side HeartbeatBeacon component via
 * navigator.sendBeacon(). Registers (or refreshes) the visitor as an active
 * user so they appear in the Active Users panel even if they never use a tool.
 *
 * Uses the toolify_sid session cookie as the stable session ID, falling back
 * to a hash of the IP address for cookieless clients.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  setImmediate(async () => {
    try {
      const { upsertActiveUser } = await import('@/lib/monitoring/active-users')
      const { getClientId }      = await import('@/lib/route-analytics')

      const sid = getClientId(request)
      const ip  = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
               ?? request.headers.get('x-real-ip')
               ?? 'unknown'

      upsertActiveUser(sid, ip, '—', 'active')
    } catch {}
  })

  return new NextResponse(null, { status: 200 })
}
