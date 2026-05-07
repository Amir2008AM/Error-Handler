/**
 * In-memory TTL cache for bot metrics.
 *
 * Prevents hammering the database on every button press.
 * Cache misses are transparent — the fetcher runs and populates the cache.
 * Cache is intentionally never persisted — it resets on restart.
 *
 * Safe: all operations are synchronous O(1). No I/O. Zero impact on website.
 */

interface Entry<T> {
  value:     T
  expiresAt: number
  setAt:     number
}

const store = new Map<string, Entry<unknown>>()

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) { store.delete(key); return undefined }
  return e.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs, setAt: Date.now() })
}

/**
 * Get from cache, or run fetcher and cache the result.
 * This is the primary API — use it to wrap any slow data fetch.
 */
export async function cachedFetch<T>(
  key:     string,
  ttlMs:   number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key)
  if (hit !== undefined) return hit
  const value = await fetcher()
  cacheSet(key, value, ttlMs)
  return value
}

export function cacheInvalidate(...keys: string[]): void {
  for (const k of keys) store.delete(k)
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
}

/** Seconds until cache entry expires, or -1 if not cached / already expired. */
export function cacheTtlRemaining(key: string): number {
  const e = store.get(key)
  if (!e) return -1
  const rem = Math.round((e.expiresAt - Date.now()) / 1000)
  return rem > 0 ? rem : -1
}

/** Human-readable cache freshness stamp, e.g. "cached 3s ago" */
export function cacheAgeLabel(key: string): string {
  const e = store.get(key)
  if (!e || Date.now() > e.expiresAt) return 'live'
  const ageS = Math.round((Date.now() - e.setAt) / 1000)
  return ageS === 0 ? 'live' : `cached ${ageS}s ago`
}
