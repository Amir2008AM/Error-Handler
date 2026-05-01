import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const buffer = await readFileAsArrayBuffer(file.path)
    const result = await pdfProcessor.toText(buffer)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="extracted.txt"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF to text error:', error)
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
