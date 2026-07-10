/**
 * Telegram Bot — Authentication & Session Manager
 *
 * Single-step login using DEV_ADMIN_KEY as the master password.
 * If DEV_AUTH_NAME + DEV_AUTH_PASSWORD are also set, uses 2-step flow.
 *
 * - 1-hour session after success (persisted to Redis — survives server restarts)
 * - 5 wrong attempts → 10-minute lockout
 * - Comparison is whitespace-normalized and Unicode-normalized (NFKC)
 * - Name check is case-insensitive; password check is case-sensitive
 */

import Redis from 'ioredis'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoginState = 'idle' | 'awaiting_name' | 'awaiting_password'

interface SessionEntry  { expiresAt: number }
interface LockEntry     { count: number; lockedUntil: number | null }
interface PendingEntry  { state: LoginState; name?: string }

// ── Constants ─────────────────────────────────────────────────────────────────

export const SESSION_DURATION_MS = 60 * 60 * 1000   // 1 hour
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000   // 10 minutes
export const MAX_ATTEMPTS        = 5

// ── Global state (survives HMR via globalThis) ────────────────────────────────

declare global {
  var __botSessions: Map<number, SessionEntry>  | undefined
  var __botLocks:    Map<number, LockEntry>     | undefined
  var __botPending:  Map<number, PendingEntry>  | undefined
  var __botRedis:    Redis                      | undefined
}

const sessions = (globalThis.__botSessions ??= new Map<number, SessionEntry>())
const locks    = (globalThis.__botLocks    ??= new Map<number, LockEntry>())
const pending  = (globalThis.__botPending  ??= new Map<number, PendingEntry>())

// ── Redis — persistent session store ──────────────────────────────────────────
// Sessions are written to Redis so they survive server restarts.
// Falls back gracefully if Redis is unavailable.

function getRedis(): Redis | null {
  if (globalThis.__botRedis) return globalThis.__botRedis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    const client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 2000 })
    client.on('error', (err: Error) => console.warn('[BotAuth] Redis:', err.message))
    globalThis.__botRedis = client
    return client
  } catch { return null }
}

const R_KEY = (chatId: number) => `tgbot:session:${chatId}`

function _rSaveSession(chatId: number, expiresAt: number): void {
  const r = getRedis(); if (!r) return
  const ttlSec = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))
  r.set(R_KEY(chatId), String(expiresAt), 'EX', ttlSec).catch(() => {})
}

function _rDeleteSession(chatId: number): void {
  getRedis()?.del(R_KEY(chatId)).catch(() => {})
}

/**
 * Call this before isAuthenticated() in async contexts (e.g. handleUpdate).
 * Restores a Redis-persisted session into the in-memory map when the process
 * restarted and lost its globalThis state.
 */
export async function tryRestoreSession(chatId: number): Promise<void> {
  if (sessions.has(chatId)) return   // already warm
  const r = getRedis(); if (!r) return
  try {
    const raw = await r.get(R_KEY(chatId))
    if (!raw) return
    const expiresAt = parseInt(raw, 10)
    if (expiresAt > Date.now()) {
      sessions.set(chatId, { expiresAt })
      console.log(`[BotAuth] Session restored from Redis for ${chatId}`)
    } else {
      r.del(R_KEY(chatId)).catch(() => {})
    }
  } catch (err) {
    console.warn('[BotAuth] tryRestoreSession:', (err as Error).message)
  }
}

// ── Text normalization ────────────────────────────────────────────────────────
// Handles: leading/trailing spaces, multiple spaces, non-breaking spaces,
// zero-width chars, Arabic Unicode variants (NFKC composition)

function norm(s: string): string {
  return s
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060]/g, ' ')  // invisible/special spaces → space
    .replace(/\s+/g, ' ')                                             // collapse whitespace
    .trim()
    .normalize('NFKC')                                                // Unicode canonical form
}

/** Case-insensitive, whitespace-normalized equality */
function matchCI(input: string, stored: string): boolean {
  if (!stored) return false
  return norm(input).toLowerCase() === norm(stored).toLowerCase()
}

/** Case-sensitive, whitespace-normalized equality */
function matchCS(input: string, stored: string): boolean {
  if (!stored) return false
  return norm(input) === norm(stored)
}

// ── Credential modes ──────────────────────────────────────────────────────────
// Mode A (2-step): DEV_AUTH_NAME + DEV_AUTH_PASSWORD both set
// Mode B (1-step): only DEV_ADMIN_KEY — any name is accepted, key is password

interface Creds {
  mode:     'two_step' | 'key_only'
  name?:    string   // required in two_step
  password: string   // DEV_AUTH_PASSWORD or DEV_ADMIN_KEY
}

function getCredentials(): Creds {
  const authName = (process.env.DEV_AUTH_NAME     ?? '').trim()
  const authPass = (process.env.DEV_AUTH_PASSWORD  ?? '').trim()
  const adminKey = (process.env.DEV_ADMIN_KEY      ?? '').trim()

  if (authName && authPass) {
    return { mode: 'two_step', name: authName, password: authPass }
  }
  // Fall back to key-only mode using DEV_ADMIN_KEY
  return { mode: 'key_only', password: adminKey }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ts() { return Date.now() }

function lockRemainingMs(chatId: number): number {
  const lock = locks.get(chatId)
  if (!lock?.lockedUntil) return 0
  const remaining = lock.lockedUntil - ts()
  if (remaining <= 0) {
    locks.set(chatId, { count: 0, lockedUntil: null })
    return 0
  }
  return remaining
}

function recordFailure(chatId: number): AuthResult {
  const lock = locks.get(chatId) ?? { count: 0, lockedUntil: null }
  lock.count += 1

  if (lock.count >= MAX_ATTEMPTS) {
    lock.lockedUntil = ts() + LOCKOUT_DURATION_MS
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

// ── Public API ────────────────────────────────────────────────────────────────

export function isAuthenticated(chatId: number): boolean {
  const session = sessions.get(chatId)
  if (!session) return false
  if (session.expiresAt < ts()) {
    sessions.delete(chatId)
    _rDeleteSession(chatId)
    return false
  }
  return true
}

export function sessionRemainingMs(chatId: number): number {
  const session = sessions.get(chatId)
  if (!session) return 0
  const remaining = session.expiresAt - ts()
  return remaining > 0 ? remaining : 0
}

export function getLoginState(chatId: number): LoginState {
  return pending.get(chatId)?.state ?? 'idle'
}

export function startLogin(chatId: number): void {
  const creds = getCredentials()
  // key_only mode → skip to password directly, no name step
  if (creds.mode === 'key_only') {
    pending.set(chatId, { state: 'awaiting_password' })
  } else {
    pending.set(chatId, { state: 'awaiting_name' })
  }
}

export type AuthResult =
  | { action: 'locked';         remainingMs: number }
  | { action: 'need_name' }
  | { action: 'name_ok' }
  | { action: 'wrong_name';     attemptsLeft: number }
  | { action: 'need_password' }
  | { action: 'success' }
  | { action: 'wrong_password'; attemptsLeft: number }
  | { action: 'locked_now' }

export function processAuthInput(chatId: number, text: string): AuthResult {
  const lockedMs = lockRemainingMs(chatId)
  if (lockedMs > 0) return { action: 'locked', remainingMs: lockedMs }

  const state = getLoginState(chatId)
  const creds = getCredentials()

  if (!creds.password) {
    // No credentials configured at all — log and reject
    console.warn('[BotAuth] No credentials configured (DEV_AUTH_NAME/DEV_AUTH_PASSWORD or DEV_ADMIN_KEY missing)')
    return { action: 'wrong_password', attemptsLeft: MAX_ATTEMPTS }
  }

  // ── key_only mode: single password step ───────────────────────────────────
  if (creds.mode === 'key_only') {
    if (state !== 'awaiting_password') {
      pending.set(chatId, { state: 'awaiting_password' })
      return { action: 'need_password' }
    }
    if (matchCS(text, creds.password)) {
      const expiresAt = ts() + SESSION_DURATION_MS
      sessions.set(chatId, { expiresAt })
      _rSaveSession(chatId, expiresAt)
      pending.delete(chatId)
      locks.delete(chatId)
      return { action: 'success' }
    }
    return recordFailure(chatId)
  }

  // ── two_step mode: name → password ────────────────────────────────────────
  if (state === 'awaiting_name') {
    if (matchCI(text, creds.name ?? '')) {
      pending.set(chatId, { state: 'awaiting_password', name: norm(text) })
      return { action: 'name_ok' }
    }
    return recordFailure(chatId)
  }

  if (state === 'awaiting_password') {
    if (matchCS(text, creds.password)) {
      const expiresAt = ts() + SESSION_DURATION_MS
      sessions.set(chatId, { expiresAt })
      _rSaveSession(chatId, expiresAt)
      pending.delete(chatId)
      locks.delete(chatId)
      return { action: 'success' }
    }
    return recordFailure(chatId)
  }

  return { action: 'need_name' }
}

export function logout(chatId: number): void {
  sessions.delete(chatId)
  pending.delete(chatId)
  _rDeleteSession(chatId)
}

/**
 * Renew the session TTL for an authenticated user.
 * Call this on every successful authenticated interaction so active
 * users never get logged out mid-session.
 */
export function renewSession(chatId: number): void {
  const session = sessions.get(chatId)
  if (session) {
    session.expiresAt = ts() + SESSION_DURATION_MS
    _rSaveSession(chatId, session.expiresAt)
  }
}

/** Returns whether this bot uses key-only (single-step) auth */
export function isKeyOnlyMode(): boolean {
  return getCredentials().mode === 'key_only'
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0 && sec > 0) return `${min} دقيقة و${sec} ثانية`
  if (min > 0)             return `${min} دقيقة`
  return `${sec} ثانية`
}

export function formatSession(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const hr  = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (hr > 0 && min > 0) return `${hr} ساعة و${min} دقيقة`
  if (hr > 0)             return `${hr} ساعة`
  return `${min} دقيقة`
}
