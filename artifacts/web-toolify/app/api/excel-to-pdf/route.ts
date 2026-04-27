import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const pageSize = (formData.get('pageSize') as 'a4' | 'letter' | 'legal') || 'a4'
    const orientation = (formData.get('orientation') as 'portrait' | 'landscape') || 'landscape'
    const fontSize = parseInt(formData.get('fontSize') as string) || 10

    const sizeError = await validateFile(file, 'any')
    if (sizeError) return sizeError

    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileName = (file as File).name.toLowerCase()
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      return NextResponse.json({ error: 'File must be an Excel file (.xlsx, .xls, or .csv)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const converter = new DocumentConverter()
    
    const result = await converter.excelToPdf(buffer, {
      pageSize,
      orientation,
      fontSize,
    })

    const baseName = file.name.replace(/\.(xlsx?|xls|csv)$/i, '')

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
      },
    })
  } catch (error) {
    console.error('Excel to PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert Excel to PDF'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
