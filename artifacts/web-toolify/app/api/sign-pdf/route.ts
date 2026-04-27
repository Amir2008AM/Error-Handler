import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor } from '@/lib/processing/pdf-security'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const signerName = formData.get('signerName') as string | null
    const signatureText = formData.get('signatureText') as string | null
    const reason = formData.get('reason') as string | null
    const location = formData.get('location') as string | null
    const signatureImage = formData.get('signatureImage') as File
    const position = formData.get('position') as string || 'bottom-right'
    const pageNumber = parseInt(formData.get('page') as string) || 0

    const validationError = await validateFile(file, 'pdf')
    if (validationError) return validationError

    const name = signerName || signatureText
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Signer name or signature text is required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    let signatureImageBuffer: Buffer | undefined
    if (signatureImage) {
      signatureImageBuffer = Buffer.from(await signatureImage.arrayBuffer())
    }

    // Calculate position based on preset
    const signatureBoxWidth = 200
    const signatureBoxHeight = 80
    const padding = 30
    
    // Default page dimensions (will be overridden by actual page size)
    let x: number
    let y: number
    
    switch (position) {
      case 'top-left':
        x = padding
        y = 700 // Approximate for A4
        break
      case 'top-right':
        x = 595 - padding - signatureBoxWidth // A4 width
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
      reason: reason || undefined,
      location: location || undefined,
      signatureImage: signatureImageBuffer,
      position: {
        page: pageNumber,
        x,
        y,
        width: signatureBoxWidth,
        height: signatureBoxHeight,
      },
    })

    return new NextResponse(signedPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="signed-${file.name}"`,
      },
    })
  } catch (error) {
    console.error('Sign PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign PDF'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
