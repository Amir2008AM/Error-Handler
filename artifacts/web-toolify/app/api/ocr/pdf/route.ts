import { NextRequest, NextResponse } from 'next/server'
import { OCRProcessor } from '@/lib/processing/ocr-processor'
import { streamUpload, validateStreamedFile, readFile } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const language = fields['language'] ?? 'eng'
    const outputType = (fields['outputType'] as 'text' | 'searchable-pdf' | 'both') ?? 'text'

    const buffer = await readFile(file.path)

    const ocrProcessor = new OCRProcessor()

    const result = await ocrProcessor.recognizePdf(buffer, { language, outputType })

    await ocrProcessor.terminate()

    if (outputType === 'searchable-pdf' && result.searchablePdf) {
      const baseName = file.filename.replace(/\.pdf$/i, '')

      return new NextResponse(result.searchablePdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${baseName}-searchable.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    if (outputType === 'both') {
      return NextResponse.json({
        text: result.text,
        confidence: result.confidence,
        pages: result.pages,
        hasPdf: !!result.searchablePdf,
      })
    }

    const textBuffer = Buffer.from(result.text, 'utf-8')
    const baseName = file.filename.replace(/\.pdf$/i, '')

    return new NextResponse(textBuffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-ocr.txt"`,
        'X-OCR-Confidence': result.confidence.toFixed(2),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('OCR PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform OCR on PDF'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
