/**
 * Telegram Admin Bot — Configuration & Constants
 */

export const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

/** Comma-separated admin Telegram user IDs, e.g. "123456789,987654321" */
export const ADMIN_IDS: Set<number> = new Set(
  (process.env.TELEGRAM_ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)
)

export const RATE_LIMIT_WINDOW_MS = 5_000   // 5 s per user between commands
export const ALERT_COOLDOWN_MS   = 5 * 60_000  // 5 min between same alert type
