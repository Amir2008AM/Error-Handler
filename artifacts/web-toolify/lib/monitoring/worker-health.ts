/**
 * Worker Health Store — Item #11
 *
 * Maintains an in-memory map of BullMQ worker health status.
 * The ops stream publisher queries BullMQ Queue.getWorkers() every 30 s
 * via Redis and updates this store — no existing code is modified.
 *
 * Workers not seen for > STALE_MS are marked 'stale'.
 */

export interface WorkerHealthEntry {
  workerId:   string
  queueName:  string
  status:     'online' | 'busy' | 'stale' | 'unknown'
  addr:       string
  lastSeen:   number
}

const KEY       = Symbol.for('toolify.worker-health.v1')
const STALE_MS  = 90_000    // 90 s — two missed 30s check cycles = stale
type G = Record<symbol, Map<string, WorkerHealthEntry>>

function getMap(): Map<string, WorkerHealthEntry> {
  const g = globalThis as G
  if (!g[KEY]) g[KEY] = new Map()
  return g[KEY]
}

/** Upsert a worker entry from a BullMQ Queue.getWorkers() result. */
export function recordWorker(
  queueName: string,
  addr:      string,
  isBusy:    boolean,
): void {
  const key = `${queueName}::${addr}`
  getMap().set(key, {
    workerId:  key,
    queueName,
    status:    isBusy ? 'busy' : 'online',
    addr,
    lastSeen:  Date.now(),
  })
}

/** Mark all workers for a queue as stale (no workers found in Redis). */
export function markQueueStale(queueName: string): void {
  const map = getMap()
  for (const [k, w] of map) {
    if (w.queueName === queueName) {
      map.set(k, { ...w, status: 'stale', lastSeen: w.lastSeen })
    }
  }
}

/** Seed known queue names so they appear even before the first check. */
export function seedQueues(names: string[]): void {
  const map = getMap()
  for (const name of names) {
    const key = `${name}::pending`
    if (!map.has(key)) {
      map.set(key, { workerId: key, queueName: name, status: 'unknown', addr: '', lastSeen: 0 })
    }
  }
}

/** Return all worker health entries, applying staleness logic. */
export function getWorkerHealth(): WorkerHealthEntry[] {
  const now = Date.now()
  return [...getMap().values()].map(w => ({
    ...w,
    status: w.lastSeen > 0 && now - w.lastSeen > STALE_MS ? 'stale' : w.status,
  })).sort((a, b) => a.queueName.localeCompare(b.queueName))
}
