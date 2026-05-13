/**
 * GET  /api/internal/dashboard   — full tool list with enabled/disabled state + test history
 * POST /api/internal/dashboard   — { action: 'toggle' | 'diagnose' | 'history', ... }
 *
 * Protected: 404 for unauthorized. Auth: ops_session_v2 cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import { execSync }                   from 'node:child_process'
import { verifyOpsV2Session }         from '@/app/api/internal/auth/route'
import {
  isToolEnabled, setToolEnabled, getAllHistorySummary, getToolHistory, getLastFailure,
} from '@/lib/tool-guard'
import { tools as allTools }          from '@/lib/tools'
import { TOOL_CONFIGS }               from '@/app/internal/dev-test/tool-configs'

export const runtime     = 'nodejs'
export const maxDuration = 30

// ── Binary check helpers ──────────────────────────────────────────────────────

function checkBinary(cmd: string): string | null {
  try {
    const out = execSync(`${cmd} --version 2>&1`, { timeout: 3000 }).toString().trim()
    const line = out.split('\n')[0].trim()
    return line.slice(0, 60) || 'available'
  } catch { return null }
}

const TOOL_BINARIES: Record<string, string[]> = {
  'compress-pdf':  ['gs'],
  'protect-pdf':   ['qpdf'],
  'unlock-pdf':    ['qpdf'],
  'word-to-pdf':   ['soffice'],
  'ppt-to-pdf':    ['soffice'],
  'excel-to-pdf':  ['soffice'],
  'html-to-pdf':   ['soffice'],
  'pdf-to-ppt':    ['soffice'],
  'pdf-to-excel':  ['python3'],
  'ocr-image':     ['tesseract'],
  'ocr-pdf':       ['tesseract'],
}

// ── GET — full tool list ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyOpsV2Session(request)) return new NextResponse(null, { status: 404 })

  const historySummary = getAllHistorySummary()

  const toolList = allTools.map((tool) => {
    const slug = tool.slug
    const cfg  = TOOL_CONFIGS[slug]
    const hist = historySummary[slug]

    return {
      id:             tool.id,
      name:           tool.name,
      category:       tool.category,
      slug,
      enabled:        isToolEnabled(slug),
      hasTestConfig:  !!cfg,
      engine:         cfg?.engine ?? null,
      endpoint:       cfg?.endpoint ?? null,
      steps:          cfg?.steps ?? [],
      lastRun:        hist?.lastRun  ? {
        status:    hist.lastRun.status,
        totalMs:   hist.lastRun.totalMs,
        timestamp: hist.lastRun.timestamp,
        error:     hist.lastRun.error,
      } : null,
      lastFailure:    hist?.lastFailure ? {
        timestamp: hist.lastFailure.timestamp,
        error:     hist.lastFailure.error,
        steps:     hist.lastFailure.steps,
        fileInfo:  hist.lastFailure.fileInfo,
      } : null,
      testCount:    hist?.total    ?? 0,
      failureCount: hist?.failures ?? 0,
    }
  })

  return NextResponse.json({ tools: toolList, total: toolList.length })
}

// ── POST — actions ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifyOpsV2Session(request)) return new NextResponse(null, { status: 404 })

  const body = await request.json() as {
    action:   'toggle' | 'diagnose' | 'history'
    toolSlug: string
    enabled?: boolean
  }

  const { action, toolSlug } = body

  // ── Toggle ────────────────────────────────────────────────────────────────
  if (action === 'toggle') {
    const newState = body.enabled ?? !isToolEnabled(toolSlug)
    setToolEnabled(toolSlug, newState)
    return NextResponse.json({
      ok:      true,
      toolSlug,
      enabled: newState,
      message: newState
        ? `✓ Tool "${toolSlug}" is now ENABLED`
        : `✗ Tool "${toolSlug}" is now DISABLED — users will see "temporarily unavailable"`,
    })
  }

  // ── Diagnose ──────────────────────────────────────────────────────────────
  if (action === 'diagnose') {
    const cfg        = TOOL_CONFIGS[toolSlug]
    const toolMeta   = allTools.find(t => t.slug === toolSlug)
    const requiredBins = TOOL_BINARIES[toolSlug] ?? []
    const binResults: Record<string, string | null> = {}

    for (const bin of requiredBins) {
      binResults[bin] = checkBinary(bin)
    }

    const issues: string[] = []
    for (const [bin, ver] of Object.entries(binResults)) {
      if (!ver) issues.push(`Binary "${bin}" not found — this tool requires it`)
    }

    if (!cfg) {
      issues.push('No test configuration found in tool-configs.ts — add one to enable file testing')
    }

    if (!isToolEnabled(toolSlug)) {
      issues.push('Tool is currently DISABLED — users cannot access it')
    }

    const hist       = getAllHistorySummary()[toolSlug]
    const lastRun    = hist?.lastRun
    const lastFail   = hist?.lastFailure

    let health: 'healthy' | 'warning' | 'error' = 'healthy'
    if (issues.some(i => i.includes('not found'))) health = 'error'
    else if (issues.length > 0)                    health = 'warning'
    else if (lastFail && lastFail.timestamp > (lastRun?.timestamp ?? 0)) health = 'warning'

    const recommendation = health === 'healthy'
      ? 'Tool appears healthy. Run a real file test to confirm end-to-end behavior.'
      : issues[0] ?? 'Review issues above.'

    return NextResponse.json({
      toolSlug,
      toolName:       toolMeta?.name ?? toolSlug,
      category:       toolMeta?.category ?? '—',
      enabled:        isToolEnabled(toolSlug),
      hasTestConfig:  !!cfg,
      engine:         cfg?.engine ?? '—',
      health,
      binaries:       Object.keys(binResults).length > 0
        ? binResults
        : { 'Node.js modules': 'always available (no system binaries required)' },
      issues,
      recommendation,
      lastRun:    lastRun  ? { status: lastRun.status,  timestamp: lastRun.timestamp,  totalMs: lastRun.totalMs }  : null,
      lastFailure: lastFail ? { timestamp: lastFail.timestamp, error: lastFail.error, steps: lastFail.steps } : null,
      testCount:   hist?.total    ?? 0,
      failureCount: hist?.failures ?? 0,
    })
  }

  // ── History (per tool) ────────────────────────────────────────────────────
  if (action === 'history') {
    const runs = getToolHistory(toolSlug)
    return NextResponse.json({ toolSlug, runs })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
