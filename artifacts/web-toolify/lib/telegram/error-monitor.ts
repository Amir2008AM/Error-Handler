/**
 * Real-time Error Monitoring & Diagnostics
 *
 * Captures errors from workers, queues, and the Node.js process,
 * diagnoses them with a rule-based engine, and sends a structured
 * Telegram alert to all admins.
 *
 * Design principles:
 *  - Non-blocking: every Telegram send is fire-and-forget
 *  - Deduplication: identical errors are throttled per 5-minute window
 *  - Sanitisation: tokens, passwords, and file paths are scrubbed before sending
 *  - No external AI: diagnosis is pure rule-based pattern matching (zero latency)
 */

import { ADMIN_IDS, ALERT_COOLDOWN_MS } from './config'
import { sendAlert } from './api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ErrorContext {
  /** Human-readable service name, e.g. "PDF Worker", "Next.js Server" */
  service: string
  /** File or function where the error occurred (optional) */
  location?: string
  /** The raw error (Error object or string message) */
  error: Error | string
  /** Job type for worker errors, e.g. "compress-pdf" */
  jobType?: string
}

interface Diagnosis {
  errorType:  string
  diagnosis:  string
  rootCause:  string
  fix:        string
}

// ── Deduplication ────────────────────────────────────────────────────────────

const _lastSent   = new Map<string, number>()
const _occurrences = new Map<string, number>()

function _fingerprint(service: string, message: string): string {
  const norm = message.toLowerCase().replace(/\s+/g, ' ').slice(0, 100)
  return `${service}::${norm}`
}

function _shouldSend(fp: string): boolean {
  const last = _lastSent.get(fp) ?? 0
  const now  = Date.now()
  if (now - last < ALERT_COOLDOWN_MS) {
    _occurrences.set(fp, (_occurrences.get(fp) ?? 1) + 1)
    return false
  }
  _lastSent.set(fp, now)
  _occurrences.set(fp, 1)
  return true
}

// ── Sanitisation ─────────────────────────────────────────────────────────────

const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  // Bot tokens (digits:alphanum 35+)
  [/\d{8,12}:[A-Za-z0-9_-]{30,}/g,          '[TOKEN]'],
  // Passwords in connection strings
  [/(password|pwd|pass)=\S+/gi,              '$1=[REDACTED]'],
  // Bearer / Basic tokens in headers
  [/Bearer\s+[A-Za-z0-9._-]{20,}/g,         'Bearer [TOKEN]'],
  // DATABASE_URL with embedded credentials
  [/postgresql?:\/\/[^:]+:[^@]+@/gi,        'postgresql://[USER]:[PASS]@'],
  // Redis URL with auth
  [/redis:\/\/:[^@]*@/gi,                   'redis://:***@'],
  // Absolute file paths (expose no server structure)
  [/\/home\/[^\s/]+/g,                      '/home/[USER]'],
  [/\/tmp\/job-[a-z0-9]+\./gi,              '/tmp/job-[id].'],
]

function sanitise(text: string): string {
  let s = text
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    s = s.replace(pattern, replacement)
  }
  return s.slice(0, 600)
}

function sanitiseStack(stack: string | undefined): string | null {
  if (!stack) return null
  // Keep only the first 3 frames, strip internal node internals
  const frames = stack
    .split('\n')
    .filter((l) => !l.includes('node:internal') && !l.includes('node_modules/next'))
    .slice(0, 4)
    .map((l) => sanitise(l.trim()))
    .join('\n')
  return frames || null
}

// ── Rule-based Diagnosis Engine ──────────────────────────────────────────────

const RULES: Array<{
  match:     (msg: string, service: string) => boolean
  diagnose:  (msg: string, service: string) => Diagnosis
}> = [
  // ── Redis ──────────────────────────────────────────────────────────────────
  {
    match: (msg) => /ECONNREFUSED.*6379|redis.*connection refused|connect ECONNREFUSED/i.test(msg),
    diagnose: () => ({
      errorType: 'Redis Connection Error',
      diagnosis: 'The worker or service could not reach Redis. It refused the TCP connection on port 6379.',
      rootCause: 'Redis server is not running, or REDIS_URL points to the wrong host/port.',
      fix:       'Run `redis-server` and confirm REDIS_URL=redis://localhost:6379 is correctly set.',
    }),
  },
  {
    match: (msg) => /ENOTFOUND.*redis|redis.*ENOTFOUND/i.test(msg),
    diagnose: () => ({
      errorType: 'Redis DNS Resolution Error',
      diagnosis: 'The Redis hostname could not be resolved — DNS lookup failed.',
      rootCause: 'REDIS_URL contains a hostname that does not exist or is not reachable in this network.',
      fix:       'Check REDIS_URL is using a valid hostname (or use an IP address instead).',
    }),
  },
  {
    match: (msg) => /WRONGPASS|ERR NOAUTH|invalid password/i.test(msg),
    diagnose: () => ({
      errorType: 'Redis Authentication Error',
      diagnosis: 'Redis rejected the connection because the password is incorrect or missing.',
      rootCause: 'REDIS_URL includes a wrong password, or Redis requires authentication but none was provided.',
      fix:       'Update REDIS_URL to include the correct password: redis://:password@host:6379.',
    }),
  },
  {
    match: (msg) => /redis.*timeout|ETIMEDOUT.*6379/i.test(msg),
    diagnose: () => ({
      errorType: 'Redis Timeout',
      diagnosis: 'A Redis operation timed out — the server is reachable but unresponsive.',
      rootCause: 'Redis may be overloaded, or a slow network is causing the connection to stall.',
      fix:       'Check Redis memory usage and CPU. Consider increasing connectTimeout in the Redis client config.',
    }),
  },

  // ── Database ───────────────────────────────────────────────────────────────
  {
    match: (msg) => /password authentication failed for user/i.test(msg),
    diagnose: () => ({
      errorType: 'Database Authentication Error',
      diagnosis: 'PostgreSQL rejected the login — the credentials in DATABASE_URL are wrong.',
      rootCause: 'PGPASSWORD or the password embedded in DATABASE_URL does not match the database user password.',
      fix:       'Verify DATABASE_URL credentials match the actual PostgreSQL user password.',
    }),
  },
  {
    match: (msg) => /too many connections|connection pool/i.test(msg),
    diagnose: () => ({
      errorType: 'Database Pool Exhaustion',
      diagnosis: 'All PostgreSQL connections in the pool are in use — new queries cannot connect.',
      rootCause: 'The app is opening connections faster than closing them, or pool size is too small for the load.',
      fix:       'Reduce pg Pool max connections, add idle timeouts, or scale the database connection limit.',
    }),
  },
  {
    match: (msg) => /relation ".*" does not exist|column ".*" does not exist/i.test(msg),
    diagnose: () => ({
      errorType: 'Database Schema Mismatch',
      diagnosis: 'A query references a table or column that does not exist in the current schema.',
      rootCause: 'A database migration was not applied, or the schema was changed without running `drizzle-kit push`.',
      fix:       'Run `pnpm --filter @workspace/db push` to apply the latest schema to the database.',
    }),
  },
  {
    match: (msg) => /ECONNREFUSED.*5432|database.*connection refused|pg.*connect ECONNREFUSED/i.test(msg),
    diagnose: () => ({
      errorType: 'Database Connection Error',
      diagnosis: 'The server could not connect to PostgreSQL — connection was refused on port 5432.',
      rootCause: 'The PostgreSQL server is not running, or DATABASE_URL points to an incorrect host/port.',
      fix:       'Check PostgreSQL is running and DATABASE_URL is correctly configured.',
    }),
  },

  // ── TempStorage / File lifecycle ───────────────────────────────────────────
  {
    match: (msg) => /no longer available|expired|ttl|file.*not found in storage/i.test(msg),
    diagnose: () => ({
      errorType: 'File Expired (TempStorage TTL)',
      diagnosis: 'The uploaded file was deleted from temporary storage before the job could process it.',
      rootCause: 'Job waited too long in the queue. TempStorage TTL is 20 minutes by default.',
      fix:       'Reduce queue wait time by increasing worker concurrency, or raise TempStorage TTL.',
    }),
  },

  // ── Timeouts ───────────────────────────────────────────────────────────────
  {
    match: (msg) => /timed out|timeout after|operation timeout|job:.*timeout/i.test(msg),
    diagnose: (msg) => {
      const op = msg.match(/job:(\S+)/)?.[1] ?? msg.match(/(\w+)\s+timed? out/i)?.[1] ?? 'unknown'
      return {
        errorType: 'Job Timeout',
        diagnosis: `The processing operation "${op}" exceeded its time limit and was aborted.`,
        rootCause: 'The file may be too large or complex for the current timeout setting, or the system is under high load.',
        fix:       'Check TIMEOUTS config in lib/processing/timeout.ts. Consider raising limits or reducing file size limits.',
      }
    },
  },

  // ── System binaries ────────────────────────────────────────────────────────
  {
    match: (msg) => /spawn.*ENOENT|ghostscript.*not found|gs.*command not found/i.test(msg),
    diagnose: () => ({
      errorType: 'Missing System Binary: Ghostscript',
      diagnosis: 'The PDF processor tried to run Ghostscript (`gs`) but it was not found in PATH.',
      rootCause: 'Ghostscript is not installed or not in the system PATH.',
      fix:       'Add `pkgs.ghostscript` to replit.nix deps and restart the environment.',
    }),
  },
  {
    match: (msg) => /libreoffice|soffice.*not found|spawn soffice/i.test(msg),
    diagnose: () => ({
      errorType: 'Missing System Binary: LibreOffice',
      diagnosis: 'The document converter tried to launch LibreOffice (`soffice`) but it was not found.',
      rootCause: 'LibreOffice is not installed, or `soffice` is not in PATH.',
      fix:       'Add `pkgs.libreoffice-fresh` to replit.nix deps and restart the environment.',
    }),
  },
  {
    match: (msg) => /tesseract.*not found|spawn tesseract|tesseract.*ENOENT/i.test(msg),
    diagnose: () => ({
      errorType: 'Missing System Binary: Tesseract OCR',
      diagnosis: 'The OCR processor tried to run Tesseract but it was not found in PATH.',
      rootCause: 'Tesseract is not installed or not in PATH.',
      fix:       'Add `pkgs.tesseract5` to replit.nix deps and restart the environment.',
    }),
  },
  {
    match: (msg) => /qpdf.*error|spawn qpdf|qpdf.*ENOENT/i.test(msg),
    diagnose: () => ({
      errorType: 'Missing System Binary: qpdf',
      diagnosis: 'PDF security operations require qpdf but it could not be found or failed.',
      rootCause: 'qpdf is not installed, or a corrupt PDF was passed.',
      fix:       'Add `pkgs.qpdf` to replit.nix. If installed, check the input PDF is not corrupt.',
    }),
  },

  // ── PDF content errors ─────────────────────────────────────────────────────
  {
    match: (msg) => /pdf is encrypted|password required|encrypted pdf/i.test(msg),
    diagnose: () => ({
      errorType: 'Encrypted PDF Error',
      diagnosis: 'The PDF file is password-protected. Processing requires an unlocked PDF.',
      rootCause: 'User submitted an encrypted PDF to a tool that does not support it.',
      fix:       'Use the Unlock PDF tool first, or validate and reject encrypted files at the upload step.',
    }),
  },
  {
    match: (msg) => /invalid pdf|corrupt|pdf parse error|not a pdf/i.test(msg),
    diagnose: () => ({
      errorType: 'Corrupt / Invalid PDF',
      diagnosis: 'The PDF file could not be parsed — it may be malformed or not a valid PDF.',
      rootCause: 'The uploaded file is corrupt, truncated, or not actually a PDF despite the extension.',
      fix:       'Add stricter file validation at upload. Use the Repair PDF tool as a fallback.',
    }),
  },

  // ── Image / Canvas errors ──────────────────────────────────────────────────
  {
    match: (msg) => /sharp.*failed|unsupported image format|vips.*error/i.test(msg),
    diagnose: () => ({
      errorType: 'Image Processing Error',
      diagnosis: 'The Sharp/libvips image processor failed — the image may be unsupported or corrupt.',
      rootCause: 'The uploaded file is in an unsupported format, or Sharp\'s native bindings have an issue.',
      fix:       'Verify the image format is supported (JPEG, PNG, WebP, AVIF, TIFF). Check Sharp installation.',
    }),
  },

  // ── Memory ────────────────────────────────────────────────────────────────
  {
    match: (msg) => /out of memory|heap out of memory|oom|javascript heap/i.test(msg),
    diagnose: () => ({
      errorType: 'Out of Memory (OOM)',
      diagnosis: 'The Node.js process ran out of heap memory while processing a job.',
      rootCause: 'A very large file or many concurrent jobs exhausted available RAM.',
      fix:       'Reduce worker concurrency in bullmq-backend.ts, add file size limits, or increase container memory.',
    }),
  },

  // ── Permissions ───────────────────────────────────────────────────────────
  {
    match: (msg) => /EPERM|EACCES|permission denied/i.test(msg),
    diagnose: () => ({
      errorType: 'File Permission Error',
      diagnosis: 'The process could not read or write a file due to insufficient permissions.',
      rootCause: 'A temp file in /tmp was created by a different process/user, or the filesystem is read-only.',
      fix:       'Ensure /tmp is writable. Check that the process has r/w access to UPLOAD_DIR.',
    }),
  },

  // ── Unhandled rejection ────────────────────────────────────────────────────
  {
    match: (msg, svc) => svc.toLowerCase().includes('process') && /unhandled/i.test(msg),
    diagnose: () => ({
      errorType: 'Unhandled Promise Rejection',
      diagnosis: 'An async operation threw an error that was never caught by a try/catch or .catch() handler.',
      rootCause: 'A code path is missing error handling — the promise rejected silently until Node.js escalated it.',
      fix:       'Find the originating async call in the stack trace and add proper error handling.',
    }),
  },

  // ── Catch-all ─────────────────────────────────────────────────────────────
  {
    match: () => true,
    diagnose: (msg, service) => ({
      errorType: 'Runtime Error',
      diagnosis: `An unexpected error occurred in ${service}. The error did not match any known pattern.`,
      rootCause: 'Unknown — inspect the raw error message and stack trace for context.',
      fix:       'Review the stack trace, add error handling around the failing code path, and check recent deployments.',
    }),
  },
]

function diagnose(service: string, message: string): Diagnosis {
  for (const rule of RULES) {
    if (rule.match(message, service)) {
      return rule.diagnose(message, service)
    }
  }
  return RULES[RULES.length - 1].diagnose(message, service)
}

// ── Message Formatter ─────────────────────────────────────────────────────────

function buildMessage(ctx: ErrorContext, diag: Diagnosis, occurrences: number): string {
  const err    = ctx.error instanceof Error ? ctx.error : new Error(String(ctx.error))
  const rawMsg = sanitise(err.message || String(ctx.error))
  const stack  = sanitiseStack(err.stack)
  const ts     = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

  const location = ctx.location
    ? sanitise(ctx.location)
    : ctx.jobType
    ? `job-processor.ts (${ctx.jobType})`
    : ctx.service

  const repeatNote = occurrences > 1 ? `\n⚠️ _Repeated ${occurrences}× — throttled, showing once per 5 min_` : ''

  const lines: string[] = [
    `🚨 *Error Detected*${repeatNote}`,
    '',
    `🔴 *Type:*     ${diag.errorType}`,
    `📍 *Service:*  ${ctx.service}`,
    `📁 *Location:* \`${location}\``,
    '',
    `🧾 *Error:*`,
    `\`\`\``,
    rawMsg,
    `\`\`\``,
  ]

  if (stack) {
    lines.push('', `📋 *Stack:*`, `\`\`\``, stack, `\`\`\``)
  }

  lines.push(
    '',
    `🧠 *Diagnosis:*  ${diag.diagnosis}`,
    `🔍 *Root Cause:* ${diag.rootCause}`,
    `💡 *Fix:*        ${diag.fix}`,
    '',
    `⏱ _${ts}_`,
  )

  return lines.join('\n')
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Capture, diagnose, and send a Telegram alert for an error.
 * Always non-blocking — safe to call from worker event handlers.
 */
export function reportError(ctx: ErrorContext): void {
  // Guard: no admins configured → skip entirely
  if (ADMIN_IDS.size === 0) return

  setImmediate(() => {
    void _sendAsync(ctx)
  })
}

async function _sendAsync(ctx: ErrorContext): Promise<void> {
  try {
    const err     = ctx.error instanceof Error ? ctx.error : new Error(String(ctx.error))
    const message = err.message || String(ctx.error)

    const fp = _fingerprint(ctx.service, message)
    const occurrences = (_occurrences.get(fp) ?? 0) + 1

    if (!_shouldSend(fp)) return

    const diag = diagnose(ctx.service, message)
    const text = buildMessage(ctx, diag, occurrences)

    await sendAlert(ADMIN_IDS, text)
  } catch {
    // Never let the monitoring system crash the server
  }
}

// ── Global Process Hooks ──────────────────────────────────────────────────────

let _hooksInstalled = false

/**
 * Register process-level error hooks.
 * Call once from instrumentation.ts at server startup.
 * Only runs in the Node.js runtime (not Edge).
 */
export function installGlobalHooks(): void {
  if (_hooksInstalled) return
  _hooksInstalled = true

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason))
    // Filter out noisy non-actionable errors
    if (_isNoise(err.message)) return
    reportError({
      service:  'Next.js Server (Process)',
      location: 'unhandledRejection hook',
      error:    err,
    })
  })

  process.on('uncaughtException', (err: Error) => {
    if (_isNoise(err.message)) return
    reportError({
      service:  'Next.js Server (Process)',
      location: 'uncaughtException hook',
      error:    err,
    })
    // Do NOT call process.exit() — let Next.js handle it
  })

  console.log('[ErrorMonitor] Global process hooks installed')
}

/**
 * Filter out known-noisy / non-actionable errors that would cause alert spam.
 * Examples: Redis reconnect attempts (emitted every few seconds), routine
 * ECONNRESET on keep-alive sockets, etc.
 */
function _isNoise(message: string): boolean {
  const noisePatterns = [
    /enabledreadycheck/i,
    /socket closed/i,
    /econnreset/i,
    /connection is closed/i,
    /the client is closed/i,
    /read ECONNRESET/i,
  ]
  return noisePatterns.some((p) => p.test(message))
}
