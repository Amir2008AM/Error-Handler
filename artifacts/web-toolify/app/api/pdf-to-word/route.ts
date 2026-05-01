import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const title = file.filename.replace(/\.pdf$/i, '')
    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdf.toWord({ file: buffer })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to convert PDF to Word' },
        { status: 500 }
      )
    }

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title}.docx"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[pdf-to-word]', err)
    return NextResponse.json({ error: 'Failed to convert PDF to Word' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
