/**
 * POST /api/internal/tools/status
 *
 * Get all available tools and their current status (enabled/disabled).
 * Auto-discovers tools from lib/tools.ts — returns real tool list.
 *
 * Protected: returns 404 for unauthorized requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsV2Session } from '@/app/api/internal/auth/route'
import { tools } from '@/lib/tools'
import { getDisabledTools } from '@/lib/tool-guard'

export async function POST(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const disabledTools = getDisabledTools()

    const toolsStatus = tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      category: tool.category,
      icon: tool.icon,
      color: tool.color,
      bgColor: tool.bgColor,
      enabled: !disabledTools.includes(tool.slug),
      isDisabled: disabledTools.includes(tool.slug),
    }))

    return NextResponse.json({
      success: true,
      tools: toolsStatus,
      totalTools: toolsStatus.length,
      enabledCount: toolsStatus.filter((t) => t.enabled).length,
      disabledCount: toolsStatus.filter((t) => !t.enabled).length,
    })
  } catch (error) {
    console.error('[dashboard] tools status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tools status' },
      { status: 500 }
    )
  }
}
