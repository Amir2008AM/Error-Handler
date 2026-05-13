/**
 * POST /api/internal/tools/toggle
 *
 * Toggle tool enabled/disabled state.
 * Immediately affects production behavior.
 *
 * Body: { toolSlug: string, enabled: boolean }
 * Returns: { success, tool, enabled }
 *
 * Protected: returns 404 for unauthorized requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsV2Session } from '@/app/api/internal/auth/route'
import { setToolEnabled, isToolEnabled } from '@/lib/tool-guard'

export async function POST(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const { toolSlug, enabled } = await request.json()

    if (!toolSlug || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid toolSlug/enabled' },
        { status: 400 }
      )
    }

    // Set the tool state (immediately affects production)
    setToolEnabled(toolSlug, enabled)

    // Verify the change took effect
    const newState = isToolEnabled(toolSlug)

    return NextResponse.json({
      success: true,
      tool: toolSlug,
      enabled: newState,
      action: enabled ? 'enabled' : 'disabled',
      message: enabled
        ? 'Tool enabled and now available to users'
        : 'Tool disabled - users will see "Tool temporarily unavailable"',
    })
  } catch (error) {
    console.error('[dashboard] toggle tool error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle tool' },
      { status: 500 }
    )
  }
}
