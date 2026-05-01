import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

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
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="numbered.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Page numbers error:', error)
    return NextResponse.json({ error: 'Failed to add page numbers' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
