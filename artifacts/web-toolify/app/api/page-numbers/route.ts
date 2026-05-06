import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { trackRoute } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const position = fields['position'] ?? 'bottom-center'
    const format = fields['format'] ?? 'numeric'
    const startFrom = parseInt(fields['startFrom'] ?? '1', 10) || 1
    const fontSize = parseInt(fields['fontSize'] ?? '12', 10) || 12
    const margin = parseInt(fields['margin'] ?? '30', 10) || 30

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdfProcessor.addPageNumbers({
      file: buffer,
      position: position as 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
      format: format as 'numeric' | 'roman' | 'page-of-total',
      startFrom,
      fontSize,
      margin,
    })

    if (!result.success || !result.data) {
      trackRoute({ tool: 'page-numbers', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'page numbers failed' })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    trackRoute({ tool: 'page-numbers', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="numbered.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Page numbers error:', error)
    trackRoute({ tool: 'page-numbers', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to add page numbers' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
