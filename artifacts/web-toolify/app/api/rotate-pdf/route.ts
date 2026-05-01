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

    const rotation = parseInt(fields['rotation'] ?? '90', 10)
    const pagesStr = fields['pages'] ?? ''

    if (![90, 180, 270].includes(rotation)) {
      return NextResponse.json({ error: 'Invalid rotation angle. Must be 90, 180, or 270' }, { status: 400 })
    }

    let pages: number[] | undefined
    if (pagesStr.trim()) {
      pages = pagesStr
        .split(',')
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p) && p > 0)
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdf.rotate({
      file: buffer,
      rotation: rotation as 90 | 180 | 270,
      pages,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to rotate PDF' },
        { status: 500 }
      )
    }

    const originalName = file.filename.replace(/\.pdf$/i, '')

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}-rotated.pdf"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[rotate-pdf]', err)
    return NextResponse.json({ error: 'Failed to rotate PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
