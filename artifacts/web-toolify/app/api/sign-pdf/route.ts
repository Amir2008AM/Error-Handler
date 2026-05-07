import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor } from '@/lib/processing/pdf-security'
import { streamUpload, validateStreamedFile, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'

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
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 })
    }

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const signerName    = fields['signerName']    ?? null
    const signatureText = fields['signatureText'] ?? null
    const reason        = fields['reason']        ?? null
    const location      = fields['location']      ?? null
    const position      = fields['position']      ?? 'bottom-right'
    const pageNumber    = parseInt(fields['page'] ?? '0', 10) || 0

    const name = signerName || signatureText
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Signer name or signature text is required' },
        { status: 400 }
      )
    }

    const buffer = await readFile(file.path)

    let signatureImageBuffer: Buffer | undefined
    const signatureImageFile = files.find((f) => f.fieldname === 'signatureImage')
    if (signatureImageFile && signatureImageFile.size > 0) {
      const imgErr = await validateStreamedFile(signatureImageFile, 'image')
      if (!imgErr) {
        signatureImageBuffer = await readFile(signatureImageFile.path)
      }
    }

    const signatureBoxWidth  = 200
    const signatureBoxHeight = 80
    const padding            = 30

    let x: number
    let y: number

    switch (position) {
      case 'top-left':
        x = padding
        y = 700
        break
      case 'top-right':
        x = 595 - padding - signatureBoxWidth
        y = 700
        break
      case 'bottom-left':
        x = padding
        y = padding
        break
      case 'center':
        x = (595 - signatureBoxWidth) / 2
        y = (842 - signatureBoxHeight) / 2
        break
      case 'bottom-right':
      default:
        x = 595 - padding - signatureBoxWidth
        y = padding
        break
    }

    const securityProcessor = new PDFSecurityProcessor()

    const signedPdf = await securityProcessor.addSignature(buffer, {
      signerName: name.trim(),
      reason:   reason   || undefined,
      location: location || undefined,
      signatureImage: signatureImageBuffer,
      position: {
        page:   pageNumber,
        x,
        y,
        width:  signatureBoxWidth,
        height: signatureBoxHeight,
      },
    })

    const outputName = safeFilename(`signed-${file.filename}`)
    trackRouteRequest(request, { tool: 'sign-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(signedPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[sign-pdf]', error)
    trackRouteRequest(request, { tool: 'sign-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign PDF'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
