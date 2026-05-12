/**
 * POST /api/user/disconnect — Item #13
 *
 * Called by the client-side DisconnectBeacon component via navigator.sendBeacon()
 * when a user closes/navigates away from the tab.
 *
 * Reads the toolify_sid cookie and immediately marks the session as idle,
 * then schedules removal after a short grace period (in case the user navigates
 * within the site and triggers a new tool call right away).
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const GRACE_MS = 15_000  // 15 s grace — don't remove instantly (SPA navigation)

export async function POST(request: NextRequest) {
  const sid = request.cookies.get('toolify_sid')?.value
  if (!sid) return new NextResponse(null, { status: 204 })

  // Fire-and-forget — never block the beacon response
  setImmediate(async () => {
    try {
      const { setUserIdle } = await import('@/lib/monitoring/active-users')
      setUserIdle(sid)

      // After grace period, remove entirely if still idle
      setTimeout(async () => {
        try {
          const { getActiveUsers, removeActiveUser } = await import('@/lib/monitoring/active-users')
          const users = getActiveUsers()
          const user  = users.find(u => u.id === sid)
          if (user && user.status === 'idle') removeActiveUser(sid)
        } catch {}
      }, GRACE_MS)
    } catch {}
  })

  return new NextResponse(null, { status: 204 })
}
