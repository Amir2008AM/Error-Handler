import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { acquireGuard } from '@/lib/concurrency-guard'
import { recordToolEvent } from '@/lib/tool-registry'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_LEVELS = ['low', 'medium', 'high'] as const
type CompressionLevel = (typeof VALID_LEVELS)[number]

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('compress-pdf')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'compress-pdf')
  if (rateLimited) return rateLimited

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const rawLevel = fields['level'] || 'medium'
    if (!VALID_LEVELS.includes(rawLevel as CompressionLevel)) {
      return NextResponse.json(
        { error: `Invalid level "${rawLevel}". Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }
    const level = rawLevel as CompressionLevel

    const release = await acquireGuard('ghostscript')
    let result: Awaited<ReturnType<typeof pdfProcessor.compress>>
    try {
      result = await pdfProcessor.compress(file.path, level)
    } finally {
      release()
    }

    if (!result.success || !result.data) {
      const durationMs = Date.now() - start
      trackRouteRequest(request, { tool: 'compress-pdf', fileSizeB: file.size, format: 'pdf', success: false, durationMs, errorMsg: result.error ?? 'compress failed' })
      recordToolEvent('compress-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: file.size, engine: 'ghostscript', error: result.error ?? 'compress failed' })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const compressionRatio  = (result.metadata?.compressionRatio  as number) ?? 0
    const compressionStatus = (result.metadata?.compressionStatus as string) || 'compressed'
    const alreadyOptimized  = compressionStatus === 'already_optimized'

    const outputFilename = alreadyOptimized ? file.filename : `compressed-${file.filename}`

    const storage = getTempStorage()
    const fileId  = await storage.store(result.data, outputFilename, 'application/pdf')

    const durationMs = Date.now() - start
    trackRouteRequest(request, { tool: 'compress-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs })
    recordToolEvent('compress-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'ghostscript' })

    return NextResponse.json({
      success: true,
      fileId,
      filename:       outputFilename,
      originalSize:   file.size,
      compressedSize: result.data.length,
      compressionRatio,
      compressionStatus,
      alreadyOptimized,
      level,
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const status = (error as { _status?: number })._status ?? 500
    const msg = error instanceof Error ? error.message : 'Failed to compress PDF'
    console.error('[compress-pdf]', error)
    trackRouteRequest(request, { tool: 'compress-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs, errorMsg: msg })
    recordToolEvent('compress-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'ghostscript', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
