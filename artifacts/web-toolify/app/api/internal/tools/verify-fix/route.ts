/**
 * POST /api/internal/tools/verify-fix
 *
 * Re-runs the SAME failing file after a fix has been applied.
 * Compares before/after to determine if issue is resolved.
 *
 * Body: FormData with:
 *   - tool: string (tool slug)
 *   - file: Blob (the test file)
 *
 * Returns: { success, isFixed, beforeFailure, afterTest, comparisonDetail }
 *
 * Protected: returns 404 for unauthorized requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsV2Session } from '@/app/api/internal/auth/route'
import { getLastFailure } from '@/lib/tool-guard'

export async function POST(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const toolSlug = formData.get('tool') as string
    const file = formData.get('file') as File

    if (!toolSlug || !file) {
      return NextResponse.json(
        { success: false, error: 'Missing tool or file' },
        { status: 400 }
      )
    }

    // Get the last failure for this tool
    const beforeFailure = getLastFailure(toolSlug)

    if (!beforeFailure) {
      return NextResponse.json(
        {
          success: false,
          error: 'No previous failure found for this tool. Run Test first.',
        },
        { status: 400 }
      )
    }

    // Forward the file to the real dev-test endpoint to re-run
    const devTestForm = new FormData()
    devTestForm.append('tool', toolSlug)
    devTestForm.append('file', file)

    const devTestResponse = await fetch(
      new URL('/api/internal/dev-test', request.url),
      {
        method: 'POST',
        headers: {
          // Pass through the auth (dev-test will verify independently)
          Cookie: request.headers.get('cookie') || '',
        },
        body: devTestForm,
      }
    )

    if (!devTestResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Re-test failed with status ${devTestResponse.status}`,
        },
        { status: devTestResponse.status }
      )
    }

    const afterTest = await devTestResponse.json()

    // Compare: is the issue fixed?
    const isFixed = beforeFailure.status === 'failed' && afterTest.status === 'success'

    const comparisonDetail = isFixed
      ? `✓ Issue resolved. Previously failed with: "${beforeFailure.error}", now succeeds.`
      : `✗ Still failing. Before: "${beforeFailure.error}", After: "${afterTest.error || 'unknown error'}"`

    return NextResponse.json({
      success: true,
      isFixed,
      beforeFailure,
      afterTest,
      comparisonDetail,
      recommendation: isFixed
        ? 'Deploy the fix with confidence.'
        : 'The issue persists. Review diagnostics and continue debugging.',
    })
  } catch (error) {
    console.error('[dashboard] verify-fix error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
