import { NextRequest, NextResponse } from 'next/server'
import { PDFSecurityProcessor } from '@/lib/processing/pdf-security'
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
    
    // First check if the PDF is actually encrypted
    const securityInfo = await securityProcessor.getSecurityInfo(buffer)
    
    // Try to unlock with or without password
    const unlockedPdf = await securityProcessor.unlock(buffer, {
      password: password || '',
    })

    return new NextResponse(unlockedPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="unlocked-${file.name}"`,
        'X-Was-Encrypted': securityInfo.isEncrypted.toString(),
      },
    })
  } catch (error) {
    console.error('Unlock PDF error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to unlock PDF'
    
    // Provide helpful error message for password issues
    if (errorMessage.toLowerCase().includes('password')) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again with the correct password.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
