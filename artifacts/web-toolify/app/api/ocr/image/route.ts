import { NextRequest, NextResponse } from 'next/server'
import { OCRProcessor } from '@/lib/processing/ocr-processor'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const language = (formData.get('language') as string) || 'eng+ara'
    const outputType = (formData.get('outputType') as 'text' | 'json') || 'text'

    const validationError = await validateFile(file, 'image')
    if (validationError) return validationError

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const ocrProcessor = new OCRProcessor()
    
    const result = await ocrProcessor.recognizeImage(buffer, {
      language,
    })

    // Clean up worker
    await ocrProcessor.terminate()

    if (outputType === 'json') {
      return NextResponse.json({
        text: result.text,
        confidence: result.confidence,
        words: result.words,
      })
    }

    // Return as plain text file
    const textBuffer = Buffer.from(result.text, 'utf-8')
    const baseName = file.name.replace(/\.[^.]+$/, '')

    return new NextResponse(textBuffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-ocr.txt"`,
        'X-OCR-Confidence': result.confidence.toFixed(2),
      },
    })
  } catch (error) {
    console.error('OCR image error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform OCR'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// Get available languages
export async function GET() {
  const ocrProcessor = new OCRProcessor()
  const languages = ocrProcessor.getAvailableLanguages()
  
  return NextResponse.json({ languages })
}
