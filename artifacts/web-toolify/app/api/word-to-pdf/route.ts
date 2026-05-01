import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { streamUpload, readFile } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileName = file.filename.toLowerCase()
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
      return NextResponse.json(
        { error: 'File must be a Word document (.docx or .doc)' },
        { status: 400 }
      )
    }

    const pageSize = (fields['pageSize'] as 'a4' | 'letter' | 'legal') ?? 'a4'
    const orientation = (fields['orientation'] as 'portrait' | 'landscape') ?? 'portrait'
    const fontSize = parseInt(fields['fontSize'] ?? '12') || 12

    const buffer = await readFile(file.path)

    const converter = new DocumentConverter()

    const result = await converter.wordToPdf(buffer, { pageSize, orientation, fontSize })

    const baseName = file.filename.replace(/\.(docx?|doc)$/i, '')

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Word to PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert Word to PDF'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
