import { NextRequest, NextResponse } from 'next/server'
import { OCRProcessor } from '@/lib/processing/ocr-processor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const language = (formData.get('language') as string) || 'eng'
    const outputType = (formData.get('outputType') as 'text' | 'searchable-pdf' | 'both') || 'text'

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const ocrProcessor = new OCRProcessor()
    
    const result = await ocrProcessor.recognizePdf(buffer, {
      language,
      outputType,
    })

    // Clean up worker
    await ocrProcessor.terminate()

    if (outputType === 'searchable-pdf' && result.searchablePdf) {
      const baseName = file.name.replace(/\.pdf$/i, '')
      
      return new NextResponse(result.searchablePdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${baseName}-searchable.pdf"`,
        },
      })
    }

    if (outputType === 'both') {
      // Return JSON with text and PDF download URL
      return NextResponse.json({
        text: result.text,
        confidence: result.confidence,
        pages: result.pages,
        hasPdf: !!result.searchablePdf,
      })
    }

    // Return as plain text file
    const textBuffer = Buffer.from(result.text, 'utf-8')
    const baseName = file.name.replace(/\.pdf$/i, '')

    return new NextResponse(textBuffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-ocr.txt"`,
        'X-OCR-Confidence': result.confidence.toFixed(2),
      },
    })
  } catch (error) {
    console.error('OCR PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform OCR on PDF'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
