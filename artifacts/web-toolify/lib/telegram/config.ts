/**
 * Telegram Admin Bot — Configuration & Constants
 *
 * All sensitive values come from Replit Secrets (environment variables).
 * None are hardcoded. To update admin access:
 *
 *   1. Go to Replit Secrets
 *   2. Update TELEGRAM_ADMIN_IDS (comma-separated Telegram user IDs)
 *   3. Restart the workflow — the new list is picked up immediately
 *
 * Secret independence:
 *   • TELEGRAM_BOT_TOKEN  — belongs to the BOT, not any personal account.
 *     Deleting an admin's Telegram account does NOT affect this token.
 *   • TELEGRAM_ADMIN_IDS  — list of user IDs that receive alerts. Safe to
 *     update at any time via Replit Secrets + workflow restart.
 *   • ADMIN_OWNER_NAME    — custom login credential, not tied to any account.
 *   • ADMIN_PASSWORD      — custom login credential, not tied to any account.
 */

export const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

/**
 * Returns the current admin user ID set, read fresh from the environment.
 * Update TELEGRAM_ADMIN_IDS in Replit Secrets and restart to change the list.
 * Multiple admins: comma-separated, e.g. "123456789,987654321"
 */
export function getAdminIds(): Set<number> {
  return new Set(
    (process.env.TELEGRAM_ADMIN_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0)
  )
}

export const RATE_LIMIT_WINDOW_MS = 5_000      // 5 s per user between commands
export const ALERT_COOLDOWN_MS    = 5 * 60_000 // 5 min between same alert type
