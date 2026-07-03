/**
 * Telegram Bot — Message Handler
 *
 * Routes every incoming update through the auth state machine,
 * then dispatches to the appropriate command/reply.
 */

import {
  isAuthenticated,
  sessionRemainingMs,
  getLoginState,
  startLogin,
  processAuthInput,
  logout,
  formatCountdown,
  formatSession,
  LOCKOUT_DURATION_MS,
} from './bot-auth'

// ── Telegram send helper ──────────────────────────────────────────────────────

async function send(chatId: number, text: string, extra: Record<string, unknown> = {}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    signal:  AbortSignal.timeout(8_000),
  }).catch((err) => {
    console.warn('[Bot] send failed:', err.message)
  })
}

// ── Telegram Update type (minimal) ────────────────────────────────────────────

interface TgUser    { id: number; first_name: string; username?: string }
interface TgMessage { message_id: number; from?: TgUser; chat: { id: number }; text?: string }
interface TgUpdate  { update_id: number; message?: TgMessage }

// ── Commands available after authentication ───────────────────────────────────

const HELP_TEXT = `
<b>🤖 الأوامر المتاحة:</b>

/status — حالة الجلسة الحالية
/logout — تسجيل الخروج
/help   — عرض هذه القائمة
`.trim()

async function handleCommand(chatId: number, command: string): Promise<void> {
  if (command === '/start') {
    await send(chatId, [
      `✅ <b>أهلاً! أنت مسجل دخول بالفعل.</b>`,
      ``,
      HELP_TEXT,
    ].join('\n'))
    return
  }

  if (command === '/status') {
    const remaining = sessionRemainingMs(chatId)
    if (remaining <= 0) {
      await send(chatId, `⏰ انتهت جلستك. أرسل /start للدخول مجدداً.`)
      return
    }
    await send(chatId, `🔐 <b>جلستك نشطة</b>\nتنتهي بعد: <b>${formatSession(remaining)}</b>`)
    return
  }

  if (command === '/logout') {
    logout(chatId)
    await send(chatId, `👋 <b>تم تسجيل الخروج بنجاح.</b>\n\nأرسل /start للدخول مجدداً.`)
    return
  }

  if (command === '/help') {
    await send(chatId, HELP_TEXT)
    return
  }

  await send(chatId, `❓ أمر غير معروف. أرسل /help لقائمة الأوامر.`)
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleUpdate(update: TgUpdate): Promise<void> {
  const message = update.message
  if (!message?.text) return

  const chatId = message.chat.id
  const text   = message.text.trim()

  // ── Authenticated ─────────────────────────────────────────────────────────
  if (isAuthenticated(chatId)) {
    await handleCommand(chatId, text.split(' ')[0].toLowerCase())
    return
  }

  // ── /start — begin login flow ─────────────────────────────────────────────
  if (text === '/start' || text.toLowerCase() === '/start') {
    startLogin(chatId)
    await send(chatId, [
      `🔐 <b>مرحباً بك في لوحة تحكم Toolify</b>`,
      ``,
      `للدخول، يرجى إدخال <b>الاسم الثلاثي</b> للمطور:`,
    ].join('\n'))
    return
  }

  // ── In login flow ─────────────────────────────────────────────────────────
  const loginState = getLoginState(chatId)

  if (loginState === 'idle') {
    // Not started yet — prompt
    await send(chatId, `🔒 هذا البوت مقيّد. أرسل /start للبدء.`)
    return
  }

  // Process auth input
  const result = processAuthInput(chatId, text)

  switch (result.action) {
    case 'locked':
      await send(chatId, [
        `🚫 <b>تم تجميد الوصول مؤقتاً</b>`,
        ``,
        `بسبب محاولات خاطئة متعددة، يمكنك المحاولة مجدداً بعد:`,
        `⏳ <b>${formatCountdown(result.remainingMs)}</b>`,
      ].join('\n'))
      break

    case 'locked_now':
      await send(chatId, [
        `🚫 <b>تم قفل الوصول لمدة ${formatCountdown(LOCKOUT_DURATION_MS)}</b>`,
        ``,
        `تجاوزت الحد الأقصى من المحاولات الخاطئة.`,
        `سيتم فتح الوصول تلقائياً بعد انتهاء المدة.`,
      ].join('\n'))
      break

    case 'name_ok':
      await send(chatId, `✏️ الاسم صحيح. الآن أدخل <b>كلمة المرور</b>:`)
      break

    case 'wrong_name':
      await send(chatId, [
        `❌ <b>الاسم غير صحيح.</b>`,
        ``,
        `المحاولات المتبقية: <b>${result.attemptsLeft}</b>`,
        result.attemptsLeft === 1
          ? `⚠️ تحذير: محاولة أخيرة قبل القفل لمدة 10 دقائق!`
          : ``,
      ].filter(Boolean).join('\n'))
      break

    case 'success':
      await send(chatId, [
        `✅ <b>تم تسجيل الدخول بنجاح!</b>`,
        ``,
        `جلستك نشطة لمدة ساعة كاملة.`,
        ``,
        HELP_TEXT,
      ].join('\n'))
      break

    case 'wrong_password':
      await send(chatId, [
        `❌ <b>كلمة المرور غير صحيحة.</b>`,
        ``,
        `المحاولات المتبقية: <b>${result.attemptsLeft}</b>`,
        result.attemptsLeft === 1
          ? `⚠️ تحذير: محاولة أخيرة قبل القفل لمدة 10 دقائق!`
          : ``,
      ].filter(Boolean).join('\n'))
      break

    case 'need_name':
      startLogin(chatId)
      await send(chatId, `🔐 أدخل <b>الاسم الثلاثي</b> للمطور:`)
      break

    case 'need_password':
      await send(chatId, `✏️ أدخل <b>كلمة المرور</b>:`)
      break
  }
}
