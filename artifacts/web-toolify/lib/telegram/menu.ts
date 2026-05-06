/**
 * Telegram Bot — Inline Keyboard Menu System
 *
 * All bot features are accessible through button menus.
 * No manual command typing required.
 *
 * Sections:
 *   Main → Analytics | System | Control | Settings | Help
 *   Analytics → Stats | Users | Tools | Files | Live | Insights
 *   System    → Health | Queue | Errors | Status
 *   Control   → Pause Workers | Resume Workers | Clear Queue
 *   Settings  → Language
 *
 * Navigation model:
 *   - Section switches edit the message in-place (no chat noise)
 *   - Command results replace the message text + add a Back button
 *   - Destructive actions (Pause, Clear) show a confirm dialog first
 */

import type { Lang } from './i18n'

export type InlineButton   = { text: string; callback_data: string }
export type InlineRow      = InlineButton[]
export type InlineKeyboard = { inline_keyboard: InlineRow[] }

// ── Section titles (shown as the message text when navigating) ────────────────

export function menuTitle(section: string, lang: Lang): string {
  const ar = lang === 'ar'
  switch (section) {
    case 'analytics':
      return ar ? '📊 *التحليلات*\n\nاختر تقريراً:' : '📊 *Analytics*\n\nChoose a report:'
    case 'system':
      return ar ? '🖥 *النظام*\n\nاختر خياراً:' : '🖥 *System*\n\nChoose an option:'
    case 'control':
      return ar
        ? '🎛 *التحكم*\n\n⚠️ تأكد من الإجراء قبل تنفيذه:'
        : '🎛 *Control*\n\n⚠️ Review before executing any action:'
    case 'settings':
      return ar ? '⚙️ *الإعدادات*\n\nاختر خياراً:' : '⚙️ *Settings*\n\nChoose an option:'
    default:
      return ar
        ? '🤖 *Toolify — لوحة الإدارة*\n\nاختر قسماً:'
        : '🤖 *Toolify Admin Panel*\n\nChoose a section:'
  }
}

export function confirmTitle(action: string, lang: Lang): string {
  const ar = lang === 'ar'
  switch (action) {
    case 'pause':
      return ar
        ? '⚠️ *تأكيد الإيقاف*\n\nهل أنت متأكد من إيقاف جميع العمال؟'
        : '⚠️ *Confirm Pause*\n\nAre you sure you want to pause all workers?\nNew jobs will queue up until you resume.'
    case 'clear':
      return ar
        ? '⚠️ *تأكيد المسح*\n\nهل أنت متأكد من حذف جميع المهام المنتظرة؟ لا يمكن التراجع عن هذا.'
        : '⚠️ *Confirm Clear Queue*\n\nAre you sure you want to remove all waiting jobs?\n*This cannot be undone.*'
    default:
      return ar ? '⚠️ تأكيد الإجراء؟' : '⚠️ Confirm this action?'
  }
}

// ── Keyboard layouts ──────────────────────────────────────────────────────────

export function mainMenu(lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '📊 التحليلات' : '📊 Analytics', callback_data: 'menu:analytics' },
        { text: ar ? '🖥 النظام'    : '🖥 System',    callback_data: 'menu:system'    },
      ],
      [
        { text: ar ? '🎛 التحكم'    : '🎛 Control',   callback_data: 'menu:control'   },
        { text: ar ? '⚙️ الإعدادات' : '⚙️ Settings',  callback_data: 'menu:settings'  },
      ],
      [
        { text: ar ? '❓ المساعدة'  : '❓ Help',       callback_data: 'cmd:help'       },
      ],
    ],
  }
}

export function analyticsMenu(lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '📈 الإحصائيات' : '📈 Stats',    callback_data: 'cmd:stats'    },
        { text: ar ? '👤 المستخدمون' : '👤 Users',    callback_data: 'cmd:users'    },
      ],
      [
        { text: ar ? '🧰 الأدوات'   : '🧰 Tools',    callback_data: 'cmd:tools'    },
        { text: ar ? '📁 الملفات'   : '📁 Files',    callback_data: 'cmd:files'    },
      ],
      [
        { text: ar ? '🚀 مباشر'     : '🚀 Live',     callback_data: 'cmd:live'     },
        { text: ar ? '🧠 رؤى'       : '🧠 Insights', callback_data: 'cmd:insights' },
      ],
      [
        { text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:main' },
      ],
    ],
  }
}

export function systemMenu(lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '❤️ الصحة'           : '❤️ Health', callback_data: 'cmd:health' },
        { text: ar ? '📦 قائمة الانتظار'  : '📦 Queue',  callback_data: 'cmd:queue'  },
      ],
      [
        { text: ar ? '❌ الأخطاء'          : '❌ Errors', callback_data: 'cmd:errors' },
        { text: ar ? '🖥 الحالة'           : '🖥 Status', callback_data: 'cmd:status' },
      ],
      [
        { text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:main' },
      ],
    ],
  }
}

export function controlMenu(lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '⏸ إيقاف العمال'        : '⏸ Pause Workers',   callback_data: 'confirm:pause' },
        { text: ar ? '▶️ استئناف العمال'      : '▶️ Resume Workers',  callback_data: 'cmd:resume'   },
      ],
      [
        { text: ar ? '🧹 مسح قائمة الانتظار' : '🧹 Clear Queue',     callback_data: 'confirm:clear' },
      ],
      [
        { text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:main' },
      ],
    ],
  }
}

export function settingsMenu(lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '🌐 اللغة' : '🌐 Language', callback_data: 'cmd:language' },
      ],
      [
        { text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:main' },
      ],
    ],
  }
}

/** Shown after clicking a destructive action — asks for confirmation. */
export function confirmMenu(action: string, lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '✅ تأكيد' : '✅ Confirm', callback_data: `do:${action}` },
        { text: ar ? '❌ إلغاء' : '❌ Cancel',  callback_data: 'menu:control' },
      ],
    ],
  }
}

/** Language picker with a back button to Settings. */
export function languageMenu(lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: '🇬🇧 English',   callback_data: 'set_lang:en' },
        { text: '🇸🇦 العربية',  callback_data: 'set_lang:ar' },
      ],
      [
        { text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:settings' },
      ],
    ],
  }
}

/** Single back-button row appended beneath command results. */
export function backButton(toSection: string, lang: Lang): InlineKeyboard {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [{ text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: `menu:${toSection}` }],
    ],
  }
}

/** Returns the right keyboard for a given section name. */
export function sectionKeyboard(section: string, lang: Lang): InlineKeyboard {
  switch (section) {
    case 'analytics': return analyticsMenu(lang)
    case 'system':    return systemMenu(lang)
    case 'control':   return controlMenu(lang)
    case 'settings':  return settingsMenu(lang)
    default:          return mainMenu(lang)
  }
}

/** Maps a command name to the section it lives in (for the Back button). */
export function cmdSection(cmd: string): string {
  if (['stats', 'users', 'tools', 'files', 'live', 'insights'].includes(cmd)) return 'analytics'
  if (['health', 'queue', 'errors', 'status'].includes(cmd))                   return 'system'
  if (['pause', 'resume', 'clear'].includes(cmd))                               return 'control'
  if (['language'].includes(cmd))                                               return 'settings'
  return 'main'
}
