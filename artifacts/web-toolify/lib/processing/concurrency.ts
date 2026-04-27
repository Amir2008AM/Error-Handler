/**
 * Bounded concurrency utilities.
 *
 * Replaces naive `Promise.all(items.map(...))` in batch processors with
 * a hard cap on in-flight work. This prevents memory blowups (e.g. 50
 * 20MB images decoded at once = 1GB+ peak heap) and keeps sharp/pdf-lib
 * within the libuv thread pool's effective concurrency.
 */

/**
 * Run `items` through `worker` with at most `limit` in flight at once.
 * Results preserve input order. The first error rejects the whole run
 * and remaining work is allowed to settle (no leak).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const safeLimit = Math.max(1, Math.min(limit, items.length || 1))
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  let firstError: unknown

  async function runner(): Promise<void> {
    while (true) {
      const i = nextIndex++
      if (i >= items.length) return
      if (firstError !== undefined) return
      try {
        results[i] = await worker(items[i], i)
      } catch (err) {
        if (firstError === undefined) firstError = err
        return
      }
    }
  }

  const workers = Array.from({ length: safeLimit }, () => runner())
  await Promise.all(workers)

  if (firstError !== undefined) throw firstError
  return results
}

/**
 * Pick a sensible default concurrency for CPU-bound work
 * (image encode/decode). Caps at 4 to avoid thrashing the libuv thread
 * pool (default 4) which sharp shares with fs.
 */
export function defaultCpuConcurrency(): number {
  const env = parseInt(process.env.UV_THREADPOOL_SIZE ?? '', 10)
  const pool = Number.isFinite(env) && env > 0 ? env : 4
  return Math.max(1, Math.min(pool, 4))
}
