import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor } from '@/lib/processing/pdf-security'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('protect-pdf')
  if (guard) return guard

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
    const ownerPassword = fields['ownerPassword'] ?? null
    const allowPrinting = fields['allowPrinting'] !== 'false'
    const allowCopying = fields['allowCopying'] !== 'false'
    const allowModifying = fields['allowModifying'] !== 'false'
    const allowAnnotating = fields['allowAnnotating'] !== 'false'

    if (!password || password.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 4 characters' },
        { status: 400 }
      )
    }

    const securityProcessor = new PDFSecurityProcessor()

    // Pass the on-disk path directly — qpdf reads without an extra memory copy.
    const protectedPdf = await securityProcessor.protect(file.path, {
      userPassword: password,
      ownerPassword: ownerPassword || password + '_owner',
      permissions: {
        printing: allowPrinting ? 'highResolution' : 'none',
        copying: allowCopying,
        modifying: allowModifying,
        annotating: allowAnnotating,
        fillingForms: true,
        contentAccessibility: true,
        documentAssembly: allowModifying,
      },
    })

    const outputFilename = `protected-${file.filename}`
    const storage = getTempStorage()
    const fileId = await storage.store(protectedPdf, outputFilename, 'application/pdf')

    trackRouteRequest(request, { tool: 'protect-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return NextResponse.json({
      success: true,
      fileId,
      filename: outputFilename,
    })
  } catch (error) {
    console.error('Protect PDF error:', error)
    trackRouteRequest(request, { tool: 'protect-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    const errorMessage = error instanceof Error ? error.message : 'Failed to protect PDF'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
