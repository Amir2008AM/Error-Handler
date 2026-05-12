/**
 * Active User Session Store
 *
 * Tracks users currently active on the site in a globalThis-safe in-memory map.
 *
 * Populated by:
 *  - trackRouteRequest() in lib/route-analytics.ts (on every conversion call)
 *
 * Eviction:
 *  - Explicit: removeActiveUser(sessionId)
 *  - Automatic: pruneStaleUsers() removes anyone last seen > 5 minutes ago
 *               (called on every getActiveUsers() and on snapshot builds)
 *
 * HMR-safe: all state lives on globalThis with a Symbol key.
 */

export interface ActiveUserEntry {
  id:       string
  ip:       string
  tool:     string
  status:   'active' | 'idle' | 'processing'
  since:    number
  lastSeen: number
}

const KEY = Symbol.for('toolify.active-users.v2')
type G = Record<symbol, Map<string, ActiveUserEntry>>

function getMap(): Map<string, ActiveUserEntry> {
  const g = globalThis as G
  if (!g[KEY]) g[KEY] = new Map()
  return g[KEY]
}

const STALE_AFTER_MS = 2 * 60_000

/**
 * Add or update a user record. Called before and after each tool invocation.
 */
export function upsertActiveUser(
  sessionId: string,
  ip: string,
  tool: string,
  status: ActiveUserEntry['status'] = 'active',
): void {
  if (!sessionId) return
  const map = getMap()
  const existing = map.get(sessionId)
  map.set(sessionId, {
    id:       sessionId,
    ip:       maskIp(ip),
    tool,
    status,
    since:    existing?.since ?? Date.now(),
    lastSeen: Date.now(),
  })
}

/**
 * Mark a user as idle (after their job completes).
 */
export function setUserIdle(sessionId: string): void {
  const u = getMap().get(sessionId)
  if (u) { u.status = 'idle'; u.lastSeen = Date.now() }
}

/**
 * Explicitly remove a user (e.g. on disconnect).
 */
export function removeActiveUser(sessionId: string): void {
  getMap().delete(sessionId)
}

/**
 * Evict users not seen in the last 5 minutes.
 */
export function pruneStaleUsers(): void {
  const cutoff = Date.now() - STALE_AFTER_MS
  const map = getMap()
  for (const [id, user] of map) {
    if (user.lastSeen < cutoff) map.delete(id)
  }
}

/**
 * Get all active users, pruning stale ones first.
 */
export function getActiveUsers(): ActiveUserEntry[] {
  pruneStaleUsers()
  return [...getMap().values()].sort((a, b) => b.lastSeen - a.lastSeen)
}

/**
 * Get count of active users (after stale prune).
 */
export function getActiveUserCount(): number {
  pruneStaleUsers()
  return getMap().size
}

/**
 * Get unique active users deduplicated by masked IP.
 * When the same IP has multiple sessions open (multiple browser tabs),
 * only the most-recently-seen entry is returned.
 */
export function getUniqueActiveUsersByIp(): ActiveUserEntry[] {
  pruneStaleUsers()
  const byIp = new Map<string, ActiveUserEntry>()
  for (const u of getMap().values()) {
    const existing = byIp.get(u.ip)
    if (!existing || u.lastSeen > existing.lastSeen) {
      byIp.set(u.ip, u)
    }
  }
  return [...byIp.values()].sort((a, b) => b.lastSeen - a.lastSeen)
}

/** Mask IP for privacy — shows first 3 octets only */
function maskIp(ip: string): string {
  if (!ip) return 'unknown'
  if (ip === '::1' || ip === '127.0.0.1' || ip.toLowerCase() === 'localhost') return 'local'
  const v4 = ip.split('.')
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.${v4[2]}.x`
  const v6 = ip.split(':')
  if (v6.length > 3) return `${v6.slice(0, 3).join(':')}:…`
  return ip
}
