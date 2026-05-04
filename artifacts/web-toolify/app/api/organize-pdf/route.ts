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

    const operationsJson = fields['operations'] ?? ''
    if (!operationsJson) {
      return NextResponse.json({ error: 'No operations provided' }, { status: 400 })
    }

    let operations: unknown
    try {
      operations = JSON.parse(operationsJson)
      if (!Array.isArray(operations)) {
        return NextResponse.json({ error: 'Operations must be a JSON array' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid operations format — expected a JSON array' }, { status: 400 })
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdfProcessor.organize({
      file: buffer,
      operations,
    })

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'Failed to organize PDF' }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="organized.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[organize-pdf]', error)
    return NextResponse.json({ error: 'Failed to organize PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
