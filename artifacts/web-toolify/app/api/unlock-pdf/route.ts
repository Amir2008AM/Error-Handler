import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor, WrongPasswordError } from '@/lib/processing/pdf-security'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const password = formData.get('password') as string | null

    const validationError = await validateFile(file, 'pdf')
    if (validationError) return validationError

    const buffer = Buffer.from(await file.arrayBuffer())

    const securityProcessor = new PDFSecurityProcessor()

    // Check encryption status authoritatively (qpdf), so the X-Was-Encrypted
    // header is meaningful and the user can be told the PDF wasn't encrypted
    // to begin with.
    const securityInfo = await securityProcessor.getSecurityInfo(buffer)

    const unlockedPdf = await securityProcessor.unlock(buffer, {
      password: password || '',
    })

    return new NextResponse(unlockedPdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="unlocked-${file.name}"`,
        'X-Was-Encrypted': securityInfo.isEncrypted.toString(),
      },
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
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
