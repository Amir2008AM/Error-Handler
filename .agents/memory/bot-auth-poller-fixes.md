---
name: Bot Auth & Poller Fixes
description: Key decisions and bugs fixed in the Telegram admin bot auth flow and long-polling loop.
---

## Credential Mode

The bot uses two auth modes controlled by env vars:
- **two_step** (active): `DEV_AUTH_NAME` + `DEV_AUTH_PASSWORD` both set → name then password
- **key_only** (fallback): only `DEV_ADMIN_KEY` set → single hex-string password step

`DEV_AUTH_NAME` is a shared env var. `DEV_AUTH_PASSWORD` and `DEV_ADMIN_KEY` are secrets.

**Why:** The bot admin uses a human-readable name + password, not the raw hex key.

## Double-Message Bug (Offset Replay)

`bot-poller.ts` previously started with `offset = 0` after every restart/HMR reload.
Telegram queues updates — restarting replayed old messages, causing the same update to be handled twice (two error messages with the same remaining-attempts count).

**Fix:** Save `offset` in `globalThis.__botPollOffset` and restore it on startup. This persists across HMR reloads.

**How to apply:** Whenever touching bot-poller.ts, preserve the `globalThis.__botPollOffset` pattern.

## Allowlist (Brute-Force Prevention)

`TELEGRAM_ADMIN_IDS` (comma-separated chat IDs) is the allowlist.
`handleUpdate` silently drops any update from a chatId not in the list — no response sent to unknown users (don't reveal the bot exists).

**Why:** Per-chatId lockout only protects against single-account brute force. Without allowlist, attacker uses many accounts to bypass lockout.

**How to apply:** The `isAllowed(chatId)` check is at the top of `handleUpdate` for both message and callback_query branches. Keep it there.

## Lockout State Lost on Full Restart

Sessions, pending login state, and lockouts are in `globalThis` Maps — they survive HMR but NOT full server restarts.

**Implication:** Restarting the server clears any active lockout. This is acceptable since only allowlisted users can attempt login.

**Future improvement:** Persist lock state in Redis if stronger guarantees are needed.

## State Loss During Login (Name Entry)

If the server restarts between `/start` and the name/password entry, `globalThis.__botPending` is cleared and the user sees "🔒 هذا البوت مقيّد" instead of the auth prompt. User must send `/start` again.

This is expected behavior — the login session is ephemeral in-memory.
