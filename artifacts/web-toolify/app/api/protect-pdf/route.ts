import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor } from '@/lib/processing/pdf-security'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const password = formData.get('password') as string | null
    const ownerPassword = formData.get('ownerPassword') as string | null
    
    // Permission flags
    const allowPrinting = formData.get('allowPrinting') !== 'false'
    const allowCopying = formData.get('allowCopying') !== 'false'
    const allowModifying = formData.get('allowModifying') !== 'false'
    const allowAnnotating = formData.get('allowAnnotating') !== 'false'

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const securityProcessor = new PDFSecurityProcessor()
    
    const protectedPdf = await securityProcessor.protect(buffer, {
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

    return new NextResponse(protectedPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="protected-${file.name}"`,
        'X-Password-Protected': 'true',
      },
    })
  } catch (error) {
    console.error('Protect PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to protect PDF'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
