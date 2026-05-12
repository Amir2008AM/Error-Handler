'use client'

/**
 * DisconnectBeacon — Item #13
 *
 * Sends a fire-and-forget POST to /api/user/disconnect when the user
 * closes the tab or navigates away, so the active-user store is updated
 * in real-time rather than waiting for the 5-minute stale prune.
 *
 * Uses navigator.sendBeacon() which is guaranteed to fire even during
 * page unload, unlike fetch(). Falls back to a keepalive fetch if
 * sendBeacon is unavailable.
 *
 * Place this once in the root layout — it mounts invisibly.
 */

import { useEffect } from 'react'

function sendDisconnect(): void {
  const url = '/api/user/disconnect'
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url)
    } else {
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
    }
  } catch {}
}

export default function DisconnectBeacon() {
  useEffect(() => {
    const onBeforeUnload = () => sendDisconnect()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendDisconnect()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return null
}
