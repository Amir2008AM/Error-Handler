/**
 * POST /api/ops/tool/:toolName/toggle
 *
 * Toggles a tool enabled/disabled state.
 * Immediately affects user-facing behavior via getToolGuardResponse().
 * Protected by the main ops session (same cookie as /api/ops/stream).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '@/app/api/ops/auth/route'
import { isToolEnabled, setToolEnabled } from '@/lib/tool-guard'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> },
) {
  if (!verifyOpsSession(request)) return new NextResponse(null, { status: 404 })

  const { toolName } = await params
  if (!toolName) return NextResponse.json({ ok: false, error: 'Missing toolName' }, { status: 400 })

  const wasEnabled = isToolEnabled(toolName)
  setToolEnabled(toolName, !wasEnabled)

  return NextResponse.json({ ok: true, tool: toolName, enabled: !wasEnabled })
}
