import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_LEVELS = ['low', 'medium', 'high'] as const
type CompressionLevel = (typeof VALID_LEVELS)[number]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    const rawLevel = (formData.get('level') as string) || 'medium'
    if (!VALID_LEVELS.includes(rawLevel as CompressionLevel)) {
      return NextResponse.json(
        { error: `Invalid level "${rawLevel}". Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }
    const level = rawLevel as CompressionLevel

    const buffer = await file.arrayBuffer()
    const result = await pdfProcessor.compress(buffer, level)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const compressionRatio = (result.metadata?.compressionRatio as number) || 0

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compressed.pdf"`,
        'X-Original-Size': String(buffer.byteLength),
        'X-Compressed-Size': String(result.data.length),
        'X-Compression-Ratio': compressionRatio.toFixed(2),
        'X-Compression-Level': level,
      },
    })
  } catch (error) {
    console.error('Compress PDF error:', error)
    return NextResponse.json(
      { error: 'Failed to compress PDF' },
      { status: 500 }
    )
  }
}
