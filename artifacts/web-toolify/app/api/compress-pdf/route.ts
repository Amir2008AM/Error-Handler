import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_LEVELS = ['low', 'medium', 'high'] as const
type CompressionLevel = (typeof VALID_LEVELS)[number]

export async function POST(request: NextRequest) {
  // Stream the multipart body directly to disk — no RAM buffering during upload.
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    // Magic-byte validation — reads only 12 bytes from disk.
    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const rawLevel = fields['level'] || 'medium'
    if (!VALID_LEVELS.includes(rawLevel as CompressionLevel)) {
      return NextResponse.json(
        { error: `Invalid level "${rawLevel}". Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }
    const level = rawLevel as CompressionLevel

    // Pass the on-disk path directly — Ghostscript reads it without a memory copy.
    const result = await pdfProcessor.compress(file.path, level)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const compressionRatio = (result.metadata?.compressionRatio as number) || 0
    const outputFilename = `compressed-${file.filename}`

    // Persist so the client can download (and re-download) without reprocessing.
    const storage = getTempStorage()
    const fileId = await storage.store(result.data, outputFilename, 'application/pdf')

    return NextResponse.json({
      success: true,
      fileId,
      filename: outputFilename,
      originalSize: file.size,
      compressedSize: result.data.length,
      compressionRatio,
      level,
    })
  } catch (error) {
    console.error('Compress PDF error:', error)
    return NextResponse.json({ error: 'Failed to compress PDF' }, { status: 500 })
  } finally {
    // Always remove the temp upload directory — even on errors.
    await cleanup()
  }
}
