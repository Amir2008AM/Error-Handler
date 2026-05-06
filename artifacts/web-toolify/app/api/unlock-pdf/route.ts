import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor, WrongPasswordError } from '@/lib/processing/pdf-security'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'
import { trackRoute } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 })
    }

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    const password = fields['password'] ?? null

    const securityProcessor = new PDFSecurityProcessor()

    const securityInfo = await securityProcessor.getSecurityInfo(file.path)

    const unlockedPdf = await securityProcessor.unlock(file.path, {
      password: password || '',
    })

    const outputFilename = `unlocked-${file.filename}`
    const storage = getTempStorage()
    const fileId = await storage.store(unlockedPdf, outputFilename, 'application/pdf')

    trackRoute({ tool: 'unlock-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return NextResponse.json({
      success: true,
      fileId,
      filename: outputFilename,
      wasEncrypted: securityInfo.isEncrypted,
    })
  } catch (error) {
    console.error('Unlock PDF error:', error)
    trackRoute({ tool: 'unlock-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })

    if (error instanceof WrongPasswordError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to unlock PDF'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
