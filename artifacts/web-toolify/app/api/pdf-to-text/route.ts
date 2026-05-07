import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { trackRouteRequest } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const buffer = await readFileAsArrayBuffer(file.path)
    const result = await pdfProcessor.toText(buffer)

    if (!result.success || !result.data) {
      trackRouteRequest(request, { tool: 'pdf-to-text', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'pdf-to-text failed' })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    trackRouteRequest(request, { tool: 'pdf-to-text', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="extracted.txt"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF to text error:', error)
    trackRouteRequest(request, { tool: 'pdf-to-text', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
