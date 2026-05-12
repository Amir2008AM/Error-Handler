/**
 * Security Monitor
 *
 * Tracks failed auth attempts, rate-limit hits, and suspicious requests
 * in a globalThis-safe ring buffer.
 *
 * Written to by:
 *  - /api/ops/auth  (POST failures)
 *
 * Read by:
 *  - /api/ops/stream payload builder (securityStats field)
 */

export type SecurityEventType = 'failed_auth' | 'rate_limit' | 'suspicious'

export interface SecurityEvent {
  type:    SecurityEventType
  ip:      string
  ts:      number
  detail?: string
}

export interface SecurityStats {
  failedAuthLast24h:  number
  rateLimitHitsLast1h: number
  topOffendingIps:    Array<{ ip: string; count: number }>
  threatLevel:        'none' | 'low' | 'medium' | 'high'
  recentEvents:       SecurityEvent[]
}

const MAX_EVENTS = 1_000
const KEY = Symbol.for('toolify.security-monitor.v1')

interface SecurityStore {
  events: SecurityEvent[]
}

type G = Record<symbol, SecurityStore>

function getStore(): SecurityStore {
  const g = globalThis as G
  if (!g[KEY]) g[KEY] = { events: [] }
  return g[KEY]
}

function maskIp(ip: string): string {
  if (!ip) return 'unknown'
  if (ip === '::1' || ip === '127.0.0.1' || ip.toLowerCase() === 'localhost') return 'local'
  const v4 = ip.split('.')
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.${v4[2]}.x`
  const v6 = ip.split(':')
  if (v6.length > 3) return `${v6.slice(0, 3).join(':')}:…`
  return ip
}

function push(event: SecurityEvent): void {
  const store = getStore()
  store.events.push(event)
  if (store.events.length > MAX_EVENTS) store.events.shift()
}

export function recordFailedAuth(ip: string): void {
  push({ type: 'failed_auth', ip: maskIp(ip), ts: Date.now() })
}

export function recordRateLimitHit(ip: string): void {
  push({ type: 'rate_limit', ip: maskIp(ip), ts: Date.now() })
}

export function recordSuspiciousRequest(ip: string, detail: string): void {
  push({ type: 'suspicious', ip: maskIp(ip), ts: Date.now(), detail })
}

export function getSecurityStats(): SecurityStats {
  const store   = getStore()
  const now     = Date.now()
  const day     = now - 24 * 60 * 60_000
  const hour    = now - 60 * 60_000

  const failedLast24h  = store.events.filter(e => e.type === 'failed_auth'  && e.ts >= day).length
  const rateLimitLast1h = store.events.filter(e => e.type === 'rate_limit' && e.ts >= hour).length

  // Top offending IPs (by total events, all types, last 24 h)
  const ipCounts = new Map<string, number>()
  for (const ev of store.events) {
    if (ev.ts >= day) ipCounts.set(ev.ip, (ipCounts.get(ev.ip) ?? 0) + 1)
  }
  const topOffendingIps = [...ipCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ip, count]) => ({ ip, count }))

  const threatLevel: SecurityStats['threatLevel'] =
    failedLast24h >= 20 || rateLimitLast1h >= 10 ? 'high'
    : failedLast24h >= 5  || rateLimitLast1h >= 3  ? 'medium'
    : failedLast24h >= 1  || rateLimitLast1h >= 1  ? 'low'
    : 'none'

  const recentEvents = store.events.slice(-20).reverse()

  return { failedAuthLast24h: failedLast24h, rateLimitHitsLast1h: rateLimitLast1h, topOffendingIps, threatLevel, recentEvents }
}
