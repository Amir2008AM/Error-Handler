import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { validateFile, MAX_FILE_SIZE } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const htmlContent = formData.get('html') as string | null
    const pageSize = (formData.get('pageSize') as 'a4' | 'letter' | 'legal') || 'a4'
    const orientation = (formData.get('orientation') as 'portrait' | 'landscape') || 'portrait'
    const fontSize = parseInt(formData.get('fontSize') as string) || 12

    let html: string

    if (file) {
      // Validate file size
      const sizeError = validateFile(file, 'any')
      if (sizeError) return sizeError

      const fileName = file.name.toLowerCase()
      if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
        return NextResponse.json({ error: 'File must be an HTML file (.html or .htm)' }, { status: 400 })
      }
      
      const buffer = await file.arrayBuffer()
      html = new TextDecoder('utf-8').decode(buffer)
    } else if (htmlContent) {
      // Use provided HTML content
      html = htmlContent
    } else {
      return NextResponse.json({ error: 'No HTML file or content provided' }, { status: 400 })
    }

    const converter = new DocumentConverter()
    
    const result = await converter.htmlToPdf(html, {
      pageSize,
      orientation,
      fontSize,
    })

    const baseName = file ? file.name.replace(/\.(html?|htm)$/i, '') : 'document'

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
      },
    })
  } catch (error) {
    console.error('HTML to PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert HTML to PDF'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
