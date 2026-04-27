/**
 * Timeout utilities for processing operations
 *
 * `withTimeout` races a promise against a timer so a single misbehaving
 * file (corrupt PDF, infinite-loop encoder, etc.) cannot pin the worker
 * thread or starve the request queue.
 */

export class TimeoutError extends Error {
  constructor(operation: string, ms: number) {
    super(`${operation} timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  operation: string = 'operation'
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return promise
  }

  let timer: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(operation, ms)), ms)
    if (timer.unref) timer.unref()
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Default timeout budget per operation class.
 * Overridable per-call.
 */
export const TIMEOUTS = {
  imageOp: 60_000,        // single image op
  pdfOp: 90_000,          // single PDF op
  pdfHeavy: 180_000,      // compress / pdf->word / image rerender
  ocrOp: 240_000,         // tesseract is slow on big pages
  jobOverall: 300_000,    // safety net for entire job
} as const
