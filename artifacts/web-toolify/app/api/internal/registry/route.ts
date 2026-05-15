/**
 * GET  /api/internal/registry
 *   Returns every tool in the registry with its metadata, live guard state,
 *   enabled/disabled status from tool-guard, and health summary.
 *
 * All reads are synchronous / in-memory — no I/O, no auth required on dev.
 * Add auth middleware in production if this endpoint must be private.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllToolMeta, getAllToolHealthSummaries } from '@/lib/tool-registry'
import { getAllGuardStates } from '@/lib/concurrency-guard'
import { isToolEnabled } from '@/lib/tool-guard'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  const allMeta    = getAllToolMeta()
  const guardMap   = new Map(getAllGuardStates().map((g) => [g.name, g]))
  const healthMap  = new Map(getAllToolHealthSummaries().map((h) => [h.slug, h]))

  const tools = allMeta.map((meta) => {
    const enabled = isToolEnabled(meta.slug)
    const guard   = meta.guard !== 'none' ? (guardMap.get(meta.guard) ?? null) : null
    const health  = healthMap.get(meta.slug) ?? null

    return {
      slug:            meta.slug,
      name:            meta.name,
      engine:          meta.engine,
      guard:           meta.guard,
      rateTier:        meta.rateTier,
      workerGroup:     meta.workerGroup,
      maxDurationSec:  meta.maxDurationSec,
      p95Sec:          meta.p95Sec,
      spawnsProcess:   meta.spawnsProcess,
      enabled,
      concurrencyGuard: guard
        ? {
            current:      guard.current,
            max:          guard.max,
            waiting:      guard.waiting,
            totalAcquired: guard.totalAcquired,
            totalRejected: guard.totalRejected,
          }
        : null,
      health: health
        ? {
            totalCalls:    health.totalCalls,
            successRate:   health.successRate,
            avgDurationMs: health.avgDurationMs,
            p95DurationMs: health.p95DurationMs,
            lastSuccess:   health.lastSuccess,
            lastFailure:   health.lastFailure,
            lastError:     health.lastError,
          }
        : null,
    }
  })

  const guardStates = getAllGuardStates()

  return NextResponse.json(
    {
      toolCount: tools.length,
      enabledCount: tools.filter((t) => t.enabled).length,
      disabledCount: tools.filter((t) => !t.enabled).length,
      guardStates,
      tools,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
