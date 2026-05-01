import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const text = fields['text'] ?? ''
    const opacity = parseFloat(fields['opacity'] ?? '0.3')
    const position = fields['position'] ?? 'diagonal'
    const fontSize = parseInt(fields['fontSize'] ?? '50', 10)

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
      return NextResponse.json(
        { error: result.error || 'Failed to add watermark' },
        { status: 500 }
      )
    }

    const originalName = file.filename.replace(/\.pdf$/i, '')

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
    return NextResponse.json({ error: 'Failed to add watermark' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
