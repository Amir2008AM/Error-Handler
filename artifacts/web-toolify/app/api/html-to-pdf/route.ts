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
    const pageSize = (fields['pageSize'] as 'a4' | 'letter' | 'legal') ?? 'a4'
    const orientation = (fields['orientation'] as 'portrait' | 'landscape') ?? 'portrait'
    const fontSize = parseInt(fields['fontSize'] ?? '12') || 12
    const htmlContent = fields['html'] ?? null

    let html: string
    let baseName = 'document'

    const file = files.find((f) => f.fieldname === 'file')

    if (file) {
      const fileName = file.filename.toLowerCase()
      if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
        return NextResponse.json(
          { error: 'File must be an HTML file (.html or .htm)' },
          { status: 400 }
        )
      }

      const buffer = await readFile(file.path)
      html = new TextDecoder('utf-8').decode(buffer)
      baseName = file.filename.replace(/\.(html?|htm)$/i, '')
    } else if (htmlContent) {
      html = htmlContent
    } else {
      return NextResponse.json({ error: 'No HTML file or content provided' }, { status: 400 })
    }

    const converter = new DocumentConverter()

    const result = await converter.htmlToPdf(html, { pageSize, orientation, fontSize })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('HTML to PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert HTML to PDF'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
