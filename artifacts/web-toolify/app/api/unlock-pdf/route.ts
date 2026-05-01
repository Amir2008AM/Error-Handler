import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor, WrongPasswordError } from '@/lib/processing/pdf-security'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

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

    // Check encryption status using the on-disk path — no memory copy needed.
    const securityInfo = await securityProcessor.getSecurityInfo(file.path)

    // Pass the path directly to qpdf — no Buffer allocation for the upload.
    const unlockedPdf = await securityProcessor.unlock(file.path, {
      password: password || '',
    })

    const outputFilename = `unlocked-${file.filename}`
    const storage = getTempStorage()
    const fileId = await storage.store(unlockedPdf, outputFilename, 'application/pdf')

    return NextResponse.json({
      success: true,
      fileId,
      filename: outputFilename,
      wasEncrypted: securityInfo.isEncrypted,
    })
  } catch (error) {
    console.error('Unlock PDF error:', error)

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
