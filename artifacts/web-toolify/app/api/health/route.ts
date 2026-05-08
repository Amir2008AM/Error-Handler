/**
 * Health & Stats Endpoint
 *
 * GET /api/health
 *
 * Returns system health, engine dependency status, queue statistics,
 * storage usage, and runtime information — all in one JSON response.
 * Useful for monitoring, load balancers, and deployment verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { getJobManager } from '@/lib/queue'
import { getTempStorage } from '@/lib/storage'

const startTime = Date.now()

export const runtime = 'nodejs'

// ── Engine check cache (60 s TTL) ───────────────────────────────────────────
// soffice --version takes ~1 s to cold-start; cache results so repeated
// load-balancer pings don't each spawn four subprocesses.
interface EngineCache {
  at: number
  python: Awaited<ReturnType<typeof checkPythonPackages>>
  libreOffice: Awaited<ReturnType<typeof checkLibreOffice>>
  ghostscript: Awaited<ReturnType<typeof checkGhostscript>>
  qpdf: Awaited<ReturnType<typeof checkQpdf>>
}
let _engineCache: EngineCache | null = null
const ENGINE_CACHE_TTL_MS = 60_000   // 60 seconds

// ── Subprocess helpers ──────────────────────────────────────────────────────

interface CliResult { code: number; stdout: string; stderr: string }

function runCheck(cmd: string, args: string[], timeoutMs = 5_000): Promise<CliResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    proc.stdout.on('data', (c: Buffer) => { stdout += c.toString() })
    proc.stderr.on('data', (c: Buffer) => { stderr += c.toString() })
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      resolve({ code: -1, stdout, stderr: 'timed out' })
    }, timeoutMs)
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr })
    })
    proc.on('error', () => {
      clearTimeout(timer)
      resolve({ code: -1, stdout: '', stderr: 'command not found' })
    })
  })
}

// ── Individual checks ───────────────────────────────────────────────────────

async function checkPythonPackages(): Promise<{
  ok: boolean
  packages: Record<string, { ok: boolean; version: string | null }>
  error: string | null
}> {
  const script = `
import json, importlib.metadata as m
pkgs = ['arabic-reshaper', 'python-bidi', 'reportlab', 'openpyxl', 'Pillow']
result = {}
for p in pkgs:
    try:
        result[p] = {'ok': True, 'version': m.version(p)}
    except Exception as e:
        result[p] = {'ok': False, 'version': None}
print(json.dumps(result))
`.trim()

  const r = await runCheck('python3', ['-c', script])
  if (r.code !== 0) {
    return { ok: false, packages: {}, error: r.stderr.trim() || 'python3 not available' }
  }
  try {
    const parsed: Record<string, { ok: boolean; version: string | null }> = JSON.parse(r.stdout.trim())
    const allOk = Object.values(parsed).every((p) => p.ok)
    return { ok: allOk, packages: parsed, error: allOk ? null : 'One or more packages missing' }
  } catch {
    return { ok: false, packages: {}, error: 'Failed to parse python output' }
  }
}

async function checkLibreOffice(): Promise<{ ok: boolean; version: string | null }> {
  const r = await runCheck('soffice', ['--version'])
  if (r.code !== 0) return { ok: false, version: null }
  const version = r.stdout.trim() || r.stderr.trim() || null
  return { ok: true, version }
}

async function checkGhostscript(): Promise<{ ok: boolean; version: string | null }> {
  const r = await runCheck('gs', ['--version'])
  if (r.code !== 0) return { ok: false, version: null }
  return { ok: true, version: r.stdout.trim() || null }
}

async function checkQpdf(): Promise<{ ok: boolean; version: string | null }> {
  const r = await runCheck('qpdf', ['--version'])
  if (r.code !== 0) return { ok: false, version: null }
  const firstLine = r.stdout.split('\n')[0].trim()
  return { ok: true, version: firstLine || null }
}

// ── Memory helper ───────────────────────────────────────────────────────────

function memoryInfo(): { totalMb: number; freeMb: number; usedMb: number; usedPercent: number } {
  const mem = process.memoryUsage()
  // rss = resident set size (actual RAM used by this process)
  // heapUsed / heapTotal = V8 heap
  // Report process heap as proxy for used memory; total from OS if available
  const heapUsedMb  = Math.round(mem.heapUsed  / 1024 / 1024)
  const heapTotalMb = Math.round(mem.heapTotal  / 1024 / 1024)
  const rssMb       = Math.round(mem.rss        / 1024 / 1024)

  // Node 18.6+ exposes constrainedMemory(); fall back gracefully
  const totalMb = typeof process.constrainedMemory === 'function'
    ? Math.round((process.constrainedMemory() ?? 0) / 1024 / 1024) || heapTotalMb
    : heapTotalMb

  const usedMb = rssMb
  const usedPercent = totalMb > 0 ? parseFloat(((usedMb / totalMb) * 100).toFixed(1)) : 0

  return { totalMb, freeMb: Math.max(0, totalMb - usedMb), usedMb, usedPercent }
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    // Engine checks are cached for 60 s — soffice cold-starts take ~1 s each.
    // Memory / queue / storage are always live (they're instant).
    const now = Date.now()
    if (!_engineCache || now - _engineCache.at > ENGINE_CACHE_TTL_MS) {
      const [python, libreOffice, ghostscript, qpdf] = await Promise.all([
        checkPythonPackages(),
        checkLibreOffice(),
        checkGhostscript(),
        checkQpdf(),
      ])
      _engineCache = { at: now, python, libreOffice, ghostscript, qpdf }
    }

    const [queueStats, storageStats] = await Promise.all([
      Promise.resolve(getJobManager().getStats()),
      getTempStorage().getStats(),
    ])

    const pythonResult      = _engineCache.python
    const libreOfficeResult = _engineCache.libreOffice
    const ghostscriptResult = _engineCache.ghostscript
    const qpdfResult        = _engineCache.qpdf

    const mem = memoryInfo()
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000)

    // Overall status: degraded if Python engine is down (primary Excel converter)
    const engineOk = pythonResult.ok && libreOfficeResult.ok
    const overallStatus = engineOk ? 'ok' : pythonResult.ok ? 'ok' : 'degraded'

    return NextResponse.json(
      {
        status: overallStatus,
        version: process.env.npm_package_version ?? '1.0.0',
        uptime: {
          seconds: uptimeSec,
          human: formatUptime(uptimeSec),
        },

        engines: {
          python: {
            ok: pythonResult.ok,
            error: pythonResult.error,
            packages: pythonResult.packages,
          },
          libreOffice: {
            ok: libreOfficeResult.ok,
            version: libreOfficeResult.version,
          },
          ghostscript: {
            ok: ghostscriptResult.ok,
            version: ghostscriptResult.version,
          },
          qpdf: {
            ok: qpdfResult.ok,
            version: qpdfResult.version,
          },
        },

        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },

        memory: {
          processRssMb: mem.usedMb,
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          usedPercent: mem.usedPercent,
          note: 'processRssMb = resident set size of this Node.js process',
        },

        queue: {
          stats: queueStats,
          redisConnected: !!process.env.REDIS_URL,
        },

        storage: {
          fileCount: storageStats.fileCount,
          usedHuman: formatBytes(storageStats.totalSize),
          usedBytes: storageStats.totalSize,
          maxHuman: formatBytes(storageStats.maxSize),
          maxBytes: storageStats.maxSize,
          usagePercent: parseFloat(storageStats.usagePercent.toFixed(1)),
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
