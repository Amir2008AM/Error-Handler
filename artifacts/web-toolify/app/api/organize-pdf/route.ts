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

    const operations = JSON.parse(operationsJson)
    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdfProcessor.organize({
      file: buffer,
      operations,
    })

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="organized.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Organize PDF error:', error)
    return NextResponse.json({ error: 'Failed to organize PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
