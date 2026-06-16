import { NextRequest, NextResponse } from 'next/server'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { enqueueOrFallback } from '@/lib/queue/enqueue-helper'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('split-pdf')
  if (guard) return guard

  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const mode     = (fields['mode'] ?? 'all') as 'all' | 'range' | 'pages'
    const rangeStr = (fields['range'] ?? '').trim()
    const pagesStr = (fields['pages'] ?? '').trim()
    const merge    = fields['merge'] === 'true'

    if (mode === 'range' && !rangeStr) {
      return NextResponse.json(
        { error: 'Please specify at least one page range.' },
        { status: 400 },
      )
    }

    if (mode === 'pages' && !pagesStr) {
      return NextResponse.json(
        { error: 'Please select at least one page.' },
        { status: 400 },
      )
    }

    // Map client mode → job processor splitMode
    let splitMode: 'all' | 'ranges' | 'extract'
    let customPages: number[] | undefined

    if (mode === 'range') {
      splitMode = merge ? 'extract' : 'ranges'
      // For merge mode, convert ranges to flat page list
      if (merge) {
        customPages = undefined  // handled via ranges string parsed on processor
      }
    } else if (mode === 'pages') {
      splitMode  = 'extract'
      customPages = pagesStr.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
    } else {
      splitMode = 'all'
    }

    const result = await enqueueOrFallback('split-pdf', [file], {
      splitMode,
      ranges:      rangeStr || undefined,
      customPages: customPages ?? undefined,
    })

    trackRouteRequest(req, {
      tool: 'split-pdf',
      fileSizeB: file.size,
      format: 'pdf',
      success: true,
      durationMs: Date.now() - start,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[split-pdf]', err)
    trackRouteRequest(req, {
      tool: 'split-pdf',
      fileSizeB: files[0]?.size,
      format: 'pdf',
      success: false,
      durationMs: Date.now() - start,
      errorMsg: err instanceof Error ? err.message : 'unknown',
    })
    const msg = err instanceof Error ? err.message : 'Failed to split PDF'
    return NextResponse.json({ error: msg }, { status: (err as { _status?: number })._status ?? 500 })
  } finally {
    await cleanup()
  }
}
