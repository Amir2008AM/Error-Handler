'use client'

/**
 * HeartbeatBeacon — sends a POST to /api/heartbeat every 5 seconds via
 * navigator.sendBeacon() so every visitor appears in Active Users the moment
 * they open any page, even if they never use a tool.
 *
 * Placed once in the root layout — mounts invisibly.
 */

import { useEffect } from 'react'

function sendHeartbeat(): void {
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/heartbeat')
    } else {
      fetch('/api/heartbeat', { method: 'POST', keepalive: true }).catch(() => {})
    }
  } catch {}
}

export default function HeartbeatBeacon() {
  useEffect(() => {
    sendHeartbeat()

    const id = setInterval(sendHeartbeat, 30_000)

    return () => clearInterval(id)
  }, [])

  return null
}
