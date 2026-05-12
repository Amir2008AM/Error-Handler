/**
 * Error Resolver — Item #6
 *
 * Tracks the timestamp of the last successful job per tool.
 * The ops stream uses this to auto-filter errors that occurred BEFORE
 * the tool last ran successfully (i.e., the error is no longer active).
 *
 * No existing code is modified — this store is populated by
 * /api/ops/stream's payload builder reading from getLiveEvents().
 * No writes needed from outside this module.
 */

const KEY = Symbol.for('toolify.error-resolver.v1')
type G = Record<symbol, Map<string, number>>

function getMap(): Map<string, number> {
  const g = globalThis as G
  if (!g[KEY]) g[KEY] = new Map()
  return g[KEY]
}

/**
 * Record that a tool had a successful job at the given timestamp.
 * Called by the ops stream payload builder based on getLiveEvents().
 */
export function recordToolSuccess(tool: string, ts: number): void {
  const map = getMap()
  const prev = map.get(tool)
  if (!prev || ts > prev) map.set(tool, ts)
}

/**
 * Return the timestamp of the last successful run for a tool,
 * or 0 if no success has been recorded.
 */
export function getLastSuccess(tool: string): number {
  return getMap().get(tool) ?? 0
}

/**
 * Returns true if an error with the given tool and createdAt timestamp
 * is still "active" (i.e., the tool has NOT succeeded since it was logged).
 */
export function isErrorActive(tool: string, errorCreatedAt: number): boolean {
  const lastSuccess = getLastSuccess(tool)
  return lastSuccess === 0 || lastSuccess < errorCreatedAt
}

/**
 * Sync the success map from a batch of live events.
 * Call this once per ops stream tick with the latest getLiveEvents() output.
 */
export function syncFromLiveEvents(
  events: Array<{ type: string; success: boolean; ts: number }>,
): void {
  for (const e of events) {
    if (e.success) recordToolSuccess(e.type, e.ts)
  }
}
