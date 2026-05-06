import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRoute } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const text     = fields['text'] ?? ''
    const position = fields['position'] ?? 'diagonal'

    const rawOpacity  = parseFloat(fields['opacity']  ?? '0.3')
    const rawFontSize = parseInt(fields['fontSize']    ?? '50', 10)

    const opacity  = Math.min(1, Math.max(0.01, isNaN(rawOpacity)  ? 0.3  : rawOpacity))
    const fontSize = Math.min(200, Math.max(8,  isNaN(rawFontSize) ? 50   : rawFontSize))

    if (!text.trim()) {
      return NextResponse.json({ error: 'Watermark text is required' }, { status: 400 })
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdf.watermark({
      file: buffer,
      text: text.trim(),
      opacity,
      position: position as 'center' | 'diagonal' | 'top' | 'bottom',
      fontSize,
    })

    if (!result.success || !result.data) {
      trackRoute({ tool: 'watermark-pdf', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'watermark failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to add watermark' },
        { status: 500 }
      )
    }

    const originalName = safeFilename(file.filename.replace(/\.pdf$/i, ''))
    trackRoute({ tool: 'watermark-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}-watermarked.pdf"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[watermark-pdf]', err)
    trackRoute({ tool: 'watermark-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to add watermark' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
