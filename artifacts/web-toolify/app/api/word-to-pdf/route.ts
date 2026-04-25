import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const pageSize = (formData.get('pageSize') as 'a4' | 'letter' | 'legal') || 'a4'
    const orientation = (formData.get('orientation') as 'portrait' | 'landscape') || 'portrait'
    const fontSize = parseInt(formData.get('fontSize') as string) || 12

    const sizeError = validateFile(file, 'any')
    if (sizeError) return sizeError

    // Validate Word file extension
    const validExtensions = ['.docx', '.doc']
    const fileName = (file as File).name.toLowerCase()
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      return NextResponse.json({ error: 'File must be a Word document (.docx or .doc)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const converter = new DocumentConverter()
    
    const result = await converter.wordToPdf(buffer, {
      pageSize,
      orientation,
      fontSize,
    })

    const baseName = file.name.replace(/\.(docx?|doc)$/i, '')

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
      },
    })
  } catch (error) {
    console.error('Word to PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert Word to PDF'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
