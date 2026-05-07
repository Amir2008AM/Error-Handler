import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'
import { trackRoute } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_LEVELS = ['low', 'medium', 'high'] as const
type CompressionLevel = (typeof VALID_LEVELS)[number]

export async function POST(request: NextRequest) {
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

    const result = await pdfProcessor.compress(file.path, level)

    if (!result.success || !result.data) {
      trackRoute({ tool: 'compress-pdf', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'compress failed' })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const compressionRatio  = (result.metadata?.compressionRatio  as number) ?? 0
    const compressionStatus = (result.metadata?.compressionStatus as string) || 'compressed'
    const alreadyOptimized  = compressionStatus === 'already_optimized'

    // When already optimised we return the original — keep the original filename
    // so the download is clearly labelled and not confusingly prefixed "compressed-".
    const outputFilename = alreadyOptimized ? file.filename : `compressed-${file.filename}`

    const storage = getTempStorage()
    const fileId  = await storage.store(result.data, outputFilename, 'application/pdf')

    trackRoute({ tool: 'compress-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

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
    console.error('[compress-pdf]', error)
    trackRoute({ tool: 'compress-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to compress PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
