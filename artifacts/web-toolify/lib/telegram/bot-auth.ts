/**
 * Telegram Bot — Authentication & Session Manager
 *
 * - 2-step login: name → password
 * - 1-hour session after success
 * - 5 wrong attempts → 10-minute lockout with countdown
 * - All state lives in-memory (persists across HMR via globalThis)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoginState = 'idle' | 'awaiting_name' | 'awaiting_password'

interface SessionEntry {
  expiresAt: number // unix ms
}

interface LockEntry {
  count:       number
  lockedUntil: number | null // unix ms, null = not locked
}

interface PendingEntry {
  state: LoginState
  name?: string   // stored after first step
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const SESSION_DURATION_MS  = 60 * 60 * 1000        // 1 hour
export const LOCKOUT_DURATION_MS  = 10 * 60 * 1000        // 10 minutes
export const MAX_ATTEMPTS         = 5

// ── Global state (survives Next.js HMR) ──────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __botSessions: Map<number, SessionEntry>  | undefined
  var __botLocks:    Map<number, LockEntry>     | undefined
  var __botPending:  Map<number, PendingEntry>  | undefined
}

const sessions = (globalThis.__botSessions ??= new Map<number, SessionEntry>())
const locks    = (globalThis.__botLocks    ??= new Map<number, LockEntry>())
const pending  = (globalThis.__botPending  ??= new Map<number, PendingEntry>())

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() { return Date.now() }

function credentials() {
  return {
    name:     (process.env.DEV_AUTH_NAME     ?? '').trim(),
    password: (process.env.DEV_AUTH_PASSWORD ?? '').trim(),
  }
}

/** Remaining lockout in ms (0 = not locked) */
function lockRemainingMs(chatId: number): number {
  const lock = locks.get(chatId)
  if (!lock?.lockedUntil) return 0
  const remaining = lock.lockedUntil - now()
  if (remaining <= 0) {
    // Expired — reset lock
    locks.set(chatId, { count: 0, lockedUntil: null })
    return 0
  }
  return remaining
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Is this chat currently authenticated with a valid session? */
export function isAuthenticated(chatId: number): boolean {
  const session = sessions.get(chatId)
  if (!session) return false
  if (session.expiresAt < now()) {
    sessions.delete(chatId)
    return false
  }
  return true
}

/** How many ms until the current session expires (0 if not authenticated) */
export function sessionRemainingMs(chatId: number): number {
  const session = sessions.get(chatId)
  if (!session) return 0
  const remaining = session.expiresAt - now()
  return remaining > 0 ? remaining : 0
}

/** Current login-flow state for this chat */
export function getLoginState(chatId: number): LoginState {
  return pending.get(chatId)?.state ?? 'idle'
}

/** Start the login flow — bot has just asked for the name */
export function startLogin(chatId: number): void {
  pending.set(chatId, { state: 'awaiting_name' })
}

/**
 * Process a message in the login flow.
 * Returns an action object telling the caller what to do next.
 */
export type AuthResult =
  | { action: 'locked';           remainingMs: number }
  | { action: 'need_name' }
  | { action: 'name_ok' }
  | { action: 'wrong_name';       attemptsLeft: number }
  | { action: 'need_password' }
  | { action: 'success' }
  | { action: 'wrong_password';   attemptsLeft: number }
  | { action: 'locked_now' }        // just got locked after this attempt

export function processAuthInput(chatId: number, text: string): AuthResult {
  // Check lockout first
  const lockedMs = lockRemainingMs(chatId)
  if (lockedMs > 0) return { action: 'locked', remainingMs: lockedMs }

  const state = getLoginState(chatId)
  const creds = credentials()

  // ── Step 1: name ──────────────────────────────────────────────────────────
  if (state === 'awaiting_name') {
    if (text.trim() === creds.name) {
      pending.set(chatId, { state: 'awaiting_password', name: text.trim() })
      return { action: 'name_ok' }
    }
    return recordFailure(chatId)
  }

  // ── Step 2: password ──────────────────────────────────────────────────────
  if (state === 'awaiting_password') {
    if (text.trim() === creds.password) {
      // Success — open session
      sessions.set(chatId, { expiresAt: now() + SESSION_DURATION_MS })
      pending.delete(chatId)
      locks.delete(chatId)   // reset failed attempts on success
      return { action: 'success' }
    }
    return recordFailure(chatId)
  }

  // Not in login flow
  return { action: 'need_name' }
}

function recordFailure(chatId: number): AuthResult {
  const lock = locks.get(chatId) ?? { count: 0, lockedUntil: null }
  lock.count += 1

  if (lock.count >= MAX_ATTEMPTS) {
    lock.lockedUntil = now() + LOCKOUT_DURATION_MS
    locks.set(chatId, lock)
    pending.delete(chatId)
    return { action: 'locked_now' }
  }

  locks.set(chatId, lock)
  const attemptsLeft = MAX_ATTEMPTS - lock.count
  const state = getLoginState(chatId)
  return state === 'awaiting_password'
    ? { action: 'wrong_password', attemptsLeft }
    : { action: 'wrong_name',     attemptsLeft }
}

/** Destroy the session for this chat */
export function logout(chatId: number): void {
  sessions.delete(chatId)
  pending.delete(chatId)
}

/** Format ms duration as "X دقيقة Y ثانية" */
export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min      = Math.floor(totalSec / 60)
  const sec      = totalSec % 60
  if (min > 0 && sec > 0) return `${min} دقيقة و${sec} ثانية`
  if (min > 0)             return `${min} دقيقة`
  return `${sec} ثانية`
}

/** Format ms as "X ساعة Y دقيقة" */
export function formatSession(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const hr       = Math.floor(totalMin / 60)
  const min      = totalMin % 60
  if (hr > 0 && min > 0) return `${hr} ساعة و${min} دقيقة`
  if (hr > 0)             return `${hr} ساعة`
  return `${min} دقيقة`
}
