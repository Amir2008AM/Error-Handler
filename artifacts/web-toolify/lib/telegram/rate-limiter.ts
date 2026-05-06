/**
 * Per-user rate limiter for bot commands.
 * Simple token bucket: one request per RATE_LIMIT_WINDOW_MS.
 */

import { RATE_LIMIT_WINDOW_MS } from './config'

const lastCommand = new Map<number, number>()

export function isRateLimited(userId: number): boolean {
  const last = lastCommand.get(userId) ?? 0
  if (Date.now() - last < RATE_LIMIT_WINDOW_MS) return true
  lastCommand.set(userId, Date.now())
  return false
}
