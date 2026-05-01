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
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'image')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const language = fields['language'] ?? 'eng+ara'
    const outputType = (fields['outputType'] as 'text' | 'json') ?? 'text'

    const buffer = await readFile(file.path)

    const ocrProcessor = new OCRProcessor()

    const result = await ocrProcessor.recognizeImage(buffer, { language })

    await ocrProcessor.terminate()

    if (outputType === 'json') {
      return NextResponse.json({
        text: result.text,
        confidence: result.confidence,
        words: result.words,
      })
    }

    const textBuffer = Buffer.from(result.text, 'utf-8')
    const baseName = file.filename.replace(/\.[^.]+$/, '')

    return new NextResponse(textBuffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-ocr.txt"`,
        'X-OCR-Confidence': result.confidence.toFixed(2),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('OCR image error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform OCR'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}

export async function GET() {
  const ocrProcessor = new OCRProcessor()
  const languages = ocrProcessor.getAvailableLanguages()
  return NextResponse.json({ languages })
}
