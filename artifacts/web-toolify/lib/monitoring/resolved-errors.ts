/**
 * Resolved Error Store
 *
 * Keeps a capped in-memory list of errors that transitioned from active → resolved
 * (i.e., their tool succeeded again after the error was logged).
 *
 * Written to by: /api/ops/stream payload builder
 * Read by:       /api/ops/stream payload builder (resolvedErrors field)
 */

export interface ResolvedError {
  id:         string
  tool:       string
  msg:        string
  severity:   string
  errorType:  string
  createdAt:  number
  resolvedAt: number
}

const MAX_RESOLVED = 50
const KEY = Symbol.for('toolify.resolved-errors.v1')
type G = Record<symbol, ResolvedError[]>

function getList(): ResolvedError[] {
  const g = globalThis as G
  if (!g[KEY]) g[KEY] = []
  return g[KEY]
}

/**
 * Add a resolved error. Deduplicated by id — won't add the same error twice.
 */
export function addResolvedError(err: ResolvedError): void {
  const list = getList()
  if (list.some(e => e.id === err.id)) return
  list.unshift(err)
  if (list.length > MAX_RESOLVED) list.pop()
}

/**
 * Return all resolved errors, newest-first.
 */
export function getResolvedErrors(): ResolvedError[] {
  return [...getList()]
}
