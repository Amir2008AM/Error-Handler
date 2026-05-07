/**
 * Internationalisation — English & Arabic
 *
 * Usage:
 *   import { t, fmt, type Lang } from './i18n'
 *   t(lang, 'stats_title')                    // simple string
 *   fmt(t(lang, 'clear_queue_msg'), { count }) // interpolated
 *
 * Arabic follows standard RTL conventions; technical terms (CPU, Redis, etc.)
 * stay in English as is normal in Arabic tech writing.
 */

export type Lang = 'en' | 'ar'

const STRINGS = {
  en: {
    // ── Access control ────────────────────────────────────────────────────
    access_denied:   '⛔ Access denied. This bot is restricted to admins only.',
    slow_down:       '⏳ Slow down — one command at a time please.',
    unknown_command: '❓ Unknown command: `{cmd}`\n\nType /help to see all commands.',
    command_failed:  '⚠️ Command failed: {err}',

    // ── /stats ────────────────────────────────────────────────────────────
    stats_title:           '📈 *Global Statistics*',
    stats_no_data:         '📈 *Global Statistics*\n\nNo data yet — process some files first.',
    stats_online_now:      '🟢 Online now (10s):',
    stats_total_users:     '👥 Unique users (all time):',
    stats_files_processed: '📁 Files processed:',
    stats_jobs_today:      '📦 Jobs today:',
    stats_success_rate:    '✅ Success rate:',
    stats_failed_jobs:     '❌ Failed jobs:',
    stats_avg_processing:  '⏱ Avg processing:',
    stats_generated_at:    '🕐 Updated at:',

    // ── /health ───────────────────────────────────────────────────────────
    health_title:       '⚙️ *System Health*',
    health_cpu:         '🖥 CPU:',
    health_memory:      '🧠 Memory:',
    health_disk:        '💾 Disk:',
    health_uptime:      '⏰ Uptime:',
    health_active_jobs: '⚡ Active jobs:',
    health_waiting:     '🕐 Waiting jobs:',
    health_completed:   '✅ Completed:',
    health_failed:      '❌ Failed:',

    // ── /tools ────────────────────────────────────────────────────────────
    tools_title:   '🧰 *Tool Analytics*',
    tools_no_data: '🧰 *Tool Analytics*\n\nNo data yet — process some files first.',
    tools_row:     '• `{name}` → {count} uses | {rate}% success | {avg} avg',

    // ── /queue ────────────────────────────────────────────────────────────
    queue_title:        '📦 *Activity & Queue Status*',
    queue_live_jobs:    '⚡ Jobs processed (10s):',
    queue_live_users:   '👥 Active users (10s):',
    queue_async_header: '*Async queue (Redis):*',
    queue_waiting:      '⏳ Waiting:',
    queue_active:       '⚡ Active:',
    queue_completed:    '✅ Completed:',
    queue_failed:       '❌ Failed:',
    queue_delayed:      '🔄 Delayed:',
    queue_by_worker:    '*By worker group:*',

    // ── /users ────────────────────────────────────────────────────────────
    users_title:    '👤 *User Analytics*',
    users_no_data:  '👤 *User Analytics*\n\nNo data yet.',
    users_total:    '📊 Unique users (all time):',
    users_new:      '🟢 Active (last 24h):',
    users_top:      '*Top users (by requests):*',
    users_no_top:   'No data yet.',

    // ── /errors ───────────────────────────────────────────────────────────
    errors_title:    '❌ *Last 10 Errors* _(persistent across restarts)_',
    errors_no_data:  '❌ *Error Tracking*\n\nNo errors recorded — great sign! ✅',

    // ── /live ─────────────────────────────────────────────────────────────
    live_title:          '🚀 *Live Activity (last 10s)*',
    live_jobs:           '📦 Jobs processed:',
    live_sessions:       '👥 Active sessions:',
    live_queue:          '⚡ Currently active in queue:',
    live_tools_header:   '*Tools in use:*',
    live_none:           'None right now.',

    // ── /files ────────────────────────────────────────────────────────────
    files_title:     '📁 *File Statistics* _(persistent)_',
    files_no_data:   '📁 *File Statistics*\n\nNo files processed yet.',
    files_total:     '📊 Total uploaded:',
    files_avg:       '📏 Avg file size:',
    files_largest:   '🏋️ Largest file:',
    files_top_fmt:   '🏆 Most used format:',

    // ── /insights ─────────────────────────────────────────────────────────
    insights_title:         '🧠 *Performance Insights* _(from full history)_',
    insights_slowest:       '🐢 Slowest tool:',
    insights_most_failing:  '💥 Most failing:',
    insights_heap:          '🧠 Heap usage:',
    insights_suggestions:   '*Suggestions:*',
    insights_slow_worker:   '• `{tool}` is slow — consider increasing worker concurrency',
    insights_high_failure:  '• `{tool}` has high failure rate — check server logs',
    insights_ok:            '• No critical bottlenecks detected ✅',

    // ── /status ───────────────────────────────────────────────────────────
    status_title:         '🖥 *System Status*',
    status_redis_ok:      '🟢 Redis:     `connected`',
    status_redis_fail:    '🔴 Redis:     `unreachable`',
    status_db_ok:         '🟢 Database:  `connected`',
    status_db_fail:       '🔴 Database:  `unreachable`',
    status_supabase_ok:   '🟢 Supabase:  `connected`',
    status_supabase_fail: '🔴 Supabase:  `unreachable`',
    status_supabase_off:  '⚫ Supabase:  `disabled`',
    status_workers:       '⚙️ Workers:   `{count}` active',
    status_uptime:        '⏰ Uptime:    `{uptime}`',
    status_memory:        '🧠 Memory:    `{pct}%` ({used} / {total})',

    // ── /pause-workers ────────────────────────────────────────────────────
    pause_workers: '🛑 *All queues paused.*\nNew jobs will wait. Use /resume-workers to continue.',

    // ── /resume-workers ───────────────────────────────────────────────────
    resume_workers: '▶️ *All queues resumed.*\nWorkers are processing jobs again.',

    // ── /clear-queue ──────────────────────────────────────────────────────
    clear_queue: '🧹 *Queue cleared.*\nRemoved `{count}` waiting jobs.',

    // ── /language ─────────────────────────────────────────────────────────
    language_prompt:  '🌐 *Language / اللغة*\n\nChoose your preferred language:',
    language_changed_en: '✅ Language changed to *English*.',
    language_changed_ar: '✅ تم تغيير اللغة إلى *العربية*.',
    lang_btn_en: '🇬🇧 English',
    lang_btn_ar: '🇸🇦 العربية',

    // ── /help ─────────────────────────────────────────────────────────────
    help_header:    '🤖 *Toolify Admin Bot*',
    help_subtitle:  '_(All stats persist across server restarts via SQLite)_',
    help_analytics: '*Analytics:*',
    help_control:   '*Control:*',
    help_stats_cmd:    '`/stats` — Global platform statistics',
    help_health_cmd:   '`/health` — CPU, memory, disk, uptime',
    help_tools_cmd:    '`/tools` — Per-tool usage & success rates',
    help_queue_cmd:    '`/queue` — Queue depths per worker group',
    help_users_cmd:    '`/users` — User counts & top sessions',
    help_errors_cmd:   '`/errors` — Last 10 errors',
    help_live_cmd:     '`/live` — Real-time activity (last 60s)',
    help_files_cmd:    '`/files` — File upload statistics',
    help_insights_cmd: '`/insights` — Bottleneck detection',
    help_language_cmd: '`/language` — Switch language / تغيير اللغة',
    help_status_cmd:   '`/status` — Live system snapshot (Redis, DB, workers)',
    help_pause_cmd:    '`/pause-workers` — Pause all queues',
    help_resume_cmd:   '`/resume-workers` — Resume all queues',
    help_clear_cmd:    '`/clear-queue` — Remove all waiting jobs',
  },

  ar: {
    // ── Access control ────────────────────────────────────────────────────
    access_denied:   '⛔ وصول مرفوض. هذا البوت مخصص للمسؤولين فقط.',
    slow_down:       '⏳ تمهّل — أمر واحد في كل مرة من فضلك.',
    unknown_command: '❓ أمر غير معروف: `{cmd}`\n\nاكتب /help لعرض جميع الأوامر.',
    command_failed:  '⚠️ فشل الأمر: {err}',

    // ── /stats ────────────────────────────────────────────────────────────
    stats_title:           '📈 *إحصائيات المنصة*',
    stats_no_data:         '📈 *إحصائيات المنصة*\n\nلا توجد بيانات بعد — قم بمعالجة بعض الملفات أولاً.',
    stats_online_now:      '🟢 متصل الآن (10 ث):',
    stats_total_users:     '👥 مستخدمون فريدون (الكل):',
    stats_files_processed: '📁 الملفات المعالجة:',
    stats_jobs_today:      '📦 مهام اليوم:',
    stats_success_rate:    '✅ معدل النجاح:',
    stats_failed_jobs:     '❌ المهام الفاشلة:',
    stats_avg_processing:  '⏱ متوسط المعالجة:',
    stats_generated_at:    '🕐 تم التحديث:',

    // ── /health ───────────────────────────────────────────────────────────
    health_title:       '⚙️ *صحة النظام*',
    health_cpu:         '🖥 المعالج (CPU):',
    health_memory:      '🧠 الذاكرة:',
    health_disk:        '💾 القرص:',
    health_uptime:      '⏰ وقت التشغيل:',
    health_active_jobs: '⚡ المهام النشطة:',
    health_waiting:     '🕐 المهام المنتظرة:',
    health_completed:   '✅ مكتملة:',
    health_failed:      '❌ فاشلة:',

    // ── /tools ────────────────────────────────────────────────────────────
    tools_title:   '🧰 *تحليلات الأدوات*',
    tools_no_data: '🧰 *تحليلات الأدوات*\n\nلا توجد بيانات بعد — قم بمعالجة بعض الملفات أولاً.',
    tools_row:     '• `{name}` — {count} استخدام | {rate}% نجاح | متوسط {avg}',

    // ── /queue ────────────────────────────────────────────────────────────
    queue_title:        '📦 *النشاط وحالة قائمة الانتظار*',
    queue_live_jobs:    '⚡ مهام منجزة (10 ث):',
    queue_live_users:   '👥 مستخدمون نشطون (10 ث):',
    queue_async_header: '*قائمة الانتظار (Redis):*',
    queue_waiting:      '⏳ منتظرة:',
    queue_active:       '⚡ نشطة:',
    queue_completed:    '✅ مكتملة:',
    queue_failed:       '❌ فاشلة:',
    queue_delayed:      '🔄 مؤجلة:',
    queue_by_worker:    '*حسب مجموعة العمال:*',

    // ── /users ────────────────────────────────────────────────────────────
    users_title:    '👤 *تحليلات المستخدمين*',
    users_no_data:  '👤 *تحليلات المستخدمين*\n\nلا توجد بيانات بعد.',
    users_total:    '📊 مستخدمون فريدون (الكل):',
    users_new:      '🟢 نشط (آخر 24 ساعة):',
    users_top:      '*أكثر المستخدمين نشاطاً:*',
    users_no_top:   'لا توجد بيانات بعد.',

    // ── /errors ───────────────────────────────────────────────────────────
    errors_title:    '❌ *آخر 10 أخطاء* _(محفوظة عبر إعادة التشغيل)_',
    errors_no_data:  '❌ *تتبع الأخطاء*\n\nلم يتم تسجيل أي أخطاء — علامة جيدة! ✅',

    // ── /live ─────────────────────────────────────────────────────────────
    live_title:         '🚀 *النشاط المباشر (آخر 10 ثواني)*',
    live_jobs:          '📦 المهام المعالجة:',
    live_sessions:      '👥 الجلسات النشطة:',
    live_queue:         '⚡ نشط حالياً في قائمة الانتظار:',
    live_tools_header:  '*الأدوات قيد الاستخدام:*',
    live_none:          'لا يوجد نشاط حالياً.',

    // ── /files ────────────────────────────────────────────────────────────
    files_title:     '📁 *إحصائيات الملفات* _(محفوظة)_',
    files_no_data:   '📁 *إحصائيات الملفات*\n\nلم تتم معالجة أي ملفات بعد.',
    files_total:     '📊 إجمالي الرفع:',
    files_avg:       '📏 متوسط حجم الملف:',
    files_largest:   '🏋️ أكبر ملف:',
    files_top_fmt:   '🏆 الصيغة الأكثر استخداماً:',

    // ── /insights ─────────────────────────────────────────────────────────
    insights_title:         '🧠 *رؤى الأداء* _(من السجل الكامل)_',
    insights_slowest:       '🐢 الأداة الأبطأ:',
    insights_most_failing:  '💥 الأكثر فشلاً:',
    insights_heap:          '🧠 استخدام الذاكرة:',
    insights_suggestions:   '*اقتراحات:*',
    insights_slow_worker:   '• `{tool}` بطيئة — فكّر في زيادة تزامن العمال',
    insights_high_failure:  '• `{tool}` معدل فشل مرتفع — راجع سجلات الخادم',
    insights_ok:            '• لا توجد اختناقات حرجة ✅',

    // ── /status ───────────────────────────────────────────────────────────
    status_title:         '🖥 *حالة النظام*',
    status_redis_ok:      '🟢 Redis:          `متصل`',
    status_redis_fail:    '🔴 Redis:          `غير متاح`',
    status_db_ok:         '🟢 قاعدة البيانات: `متصلة`',
    status_db_fail:       '🔴 قاعدة البيانات: `غير متاحة`',
    status_supabase_ok:   '🟢 Supabase:       `متصل`',
    status_supabase_fail: '🔴 Supabase:       `غير متاح`',
    status_supabase_off:  '⚫ Supabase:       `معطّل`',
    status_workers:       '⚙️ العمال:         `{count}` نشط',
    status_uptime:        '⏰ وقت التشغيل:    `{uptime}`',
    status_memory:        '🧠 الذاكرة:        `{pct}%` ({used} / {total})',

    // ── /pause-workers ────────────────────────────────────────────────────
    pause_workers: '🛑 *تم إيقاف جميع قوائم الانتظار.*\nستنتظر المهام الجديدة. استخدم /resume-workers للمتابعة.',

    // ── /resume-workers ───────────────────────────────────────────────────
    resume_workers: '▶️ *تم استئناف جميع قوائم الانتظار.*\nالعمال يعالجون المهام مجدداً.',

    // ── /clear-queue ──────────────────────────────────────────────────────
    clear_queue: '🧹 *تم مسح قائمة الانتظار.*\nتمت إزالة `{count}` مهمة منتظرة.',

    // ── /language ─────────────────────────────────────────────────────────
    language_prompt:     '🌐 *Language / اللغة*\n\nاختر لغتك المفضلة:',
    language_changed_en: '✅ Language changed to *English*.',
    language_changed_ar: '✅ تم تغيير اللغة إلى *العربية*.',
    lang_btn_en: '🇬🇧 English',
    lang_btn_ar: '🇸🇦 العربية',

    // ── /help ─────────────────────────────────────────────────────────────
    help_header:    '🤖 *Toolify — بوت المسؤول*',
    help_subtitle:  '_(جميع الإحصائيات محفوظة عبر إعادة التشغيل)_',
    help_analytics: '*التحليلات:*',
    help_control:   '*التحكم:*',
    help_stats_cmd:    '`/stats` — إحصائيات المنصة الكاملة',
    help_health_cmd:   '`/health` — المعالج، الذاكرة، القرص، وقت التشغيل',
    help_tools_cmd:    '`/tools` — استخدام الأدوات ومعدلات النجاح',
    help_queue_cmd:    '`/queue` — أعماق قوائم الانتظار لكل مجموعة',
    help_users_cmd:    '`/users` — عدد المستخدمين وأكثرهم نشاطاً',
    help_errors_cmd:   '`/errors` — آخر 10 أخطاء',
    help_live_cmd:     '`/live` — النشاط الآني (آخر 60 ثانية)',
    help_files_cmd:    '`/files` — إحصائيات رفع الملفات',
    help_insights_cmd: '`/insights` — كشف الاختناقات',
    help_language_cmd: '`/language` — Switch language / تغيير اللغة',
    help_status_cmd:   '`/status` — لقطة فورية للنظام (Redis، DB، العمال)',
    help_pause_cmd:    '`/pause-workers` — إيقاف جميع قوائم الانتظار',
    help_resume_cmd:   '`/resume-workers` — استئناف جميع قوائم الانتظار',
    help_clear_cmd:    '`/clear-queue` — حذف جميع المهام المنتظرة',
  },
} as const

export type StringKey = keyof typeof STRINGS.en

/** Retrieve a translated string. Falls back to English if key missing. */
export function t(lang: Lang, key: StringKey): string {
  const map = STRINGS[lang] as Record<string, string>
  return map[key] ?? (STRINGS.en as Record<string, string>)[key] ?? key
}

/**
 * Interpolate `{placeholder}` tokens in a translated string.
 * e.g. fmt(t(lang, 'clear_queue'), { count: 5 }) → "…Removed `5` waiting jobs."
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}
