/**
 * Telegram Bot — 2-Step Admin Authentication
 *
 * State machine per user:
 *   IDLE → AWAITING_NAME → AWAITING_PASSWORD → AUTHENTICATED
 *
 * Security guarantees:
 *   - Exact full-name match required (3 parts, case-insensitive, whitespace-normalised)
 *   - Exact password match (case-sensitive)
 *   - Generic "Access Denied" on failure — never reveals which step failed
 *   - 3 failed attempts trigger a 10-minute lockout
 *   - Authenticated sessions expire after 1 hour
 *   - No sensitive values ever written to logs
 */

export type AuthStep = 'IDLE' | 'AWAITING_NAME' | 'AWAITING_PASSWORD' | 'AUTHENTICATED'

interface AuthEntry {
  step:             AuthStep
  authenticatedAt?: number   // ms timestamp — set when step = AUTHENTICATED
  lockedUntil?:     number   // ms timestamp — set after MAX_ATTEMPTS failures
  failedAttempts:   number
}

const SESSION_TTL_MS = 60 * 60 * 1000   // 1 hour
const LOCKOUT_TTL_MS = 10 * 60 * 1000   // 10 minutes
const MAX_ATTEMPTS   = 3

/** In-memory session store — never persisted or logged */
const _sessions = new Map<number, AuthEntry>()

function _get(userId: number): AuthEntry {
  return _sessions.get(userId) ?? { step: 'IDLE', failedAttempts: 0 }
}

function _set(userId: number, entry: AuthEntry): void {
  _sessions.set(userId, entry)
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true only if the user has a valid, unexpired authenticated session. */
export function isAuthenticated(userId: number): boolean {
  const e = _get(userId)
  if (e.step !== 'AUTHENTICATED' || !e.authenticatedAt) return false
  if (Date.now() - e.authenticatedAt > SESSION_TTL_MS) {
    // Session expired — wipe silently
    _sessions.delete(userId)
    return false
  }
  return true
}

/** Returns true if this user is currently in a brute-force lockout window. */
export function isLockedOut(userId: number): boolean {
  const e = _get(userId)
  if (!e.lockedUntil) return false
  if (Date.now() < e.lockedUntil) return true
  // Lockout window has passed — reset failure counter
  _set(userId, { step: 'IDLE', failedAttempts: 0 })
  return false
}

/** Returns minutes remaining until lockout lifts (0 if not locked). */
export function lockoutMinutesLeft(userId: number): number {
  const e = _get(userId)
  if (!e.lockedUntil || Date.now() >= e.lockedUntil) return 0
  return Math.ceil((e.lockedUntil - Date.now()) / 60_000)
}

/** Returns minutes remaining on the active session (0 if not authenticated). */
export function sessionMinutesLeft(userId: number): number {
  const e = _get(userId)
  if (e.step !== 'AUTHENTICATED' || !e.authenticatedAt) return 0
  const remaining = SESSION_TTL_MS - (Date.now() - e.authenticatedAt)
  return Math.max(0, Math.ceil(remaining / 60_000))
}

/** Returns the current auth step (respects session expiry). */
export function getStep(userId: number): AuthStep {
  if (_get(userId).step === 'AUTHENTICATED' && !isAuthenticated(userId)) return 'IDLE'
  return _get(userId).step
}

/** Advance the user to the given step. */
export function setStep(userId: number, step: AuthStep): void {
  const e = _get(userId)
  if (step === 'AUTHENTICATED') {
    _set(userId, { step, authenticatedAt: Date.now(), failedAttempts: 0 })
  } else {
    _set(userId, { ...e, step })
  }
}

/**
 * Record a failed auth attempt.
 * Resets state to IDLE.
 * Returns whether the user is now locked out.
 */
export function recordFailure(userId: number): boolean {
  const e  = _get(userId)
  const n  = e.failedAttempts + 1
  if (n >= MAX_ATTEMPTS) {
    _set(userId, { step: 'IDLE', failedAttempts: 0, lockedUntil: Date.now() + LOCKOUT_TTL_MS })
    console.warn(`[Auth] userId=${userId} locked out after ${MAX_ATTEMPTS} failed attempts`)
    return true  // now locked
  }
  _set(userId, { ...e, step: 'IDLE', failedAttempts: n })
  return false   // not yet locked
}

/** Fully wipe a user's session (logout / admin reset). */
export function resetAuth(userId: number): void {
  _sessions.delete(userId)
}

// ── Validators — compare against env vars only, never log values ──────────────

/**
 * Validates the full name input.
 * Requires exactly 3+ space-separated parts.
 * Case-insensitive, whitespace-normalised.
 */
export function validateName(input: string): boolean {
  const expected = (process.env.ADMIN_OWNER_NAME ?? '').trim()
  if (!expected) return false  // env not set — fail closed
  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const given = normalise(input)
  if (given.split(' ').length < 3) return false
  return given === normalise(expected)
}

/**
 * Validates the password input.
 * Strict exact match (case-sensitive).
 */
export function validatePassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? ''
  if (!expected) return false  // env not set — fail closed
  return input === expected
}
