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

    const pagesJson = fields['pages'] ?? ''
    if (!pagesJson) {
      return NextResponse.json({ error: 'No pages specified' }, { status: 400 })
    }

    const pagesToDelete = JSON.parse(pagesJson) as number[]
    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdfProcessor.deletePages(buffer, pagesToDelete)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="edited.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Delete pages error:', error)
    return NextResponse.json({ error: 'Failed to delete pages' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
