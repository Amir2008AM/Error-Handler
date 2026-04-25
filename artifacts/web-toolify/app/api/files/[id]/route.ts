/**
 * File Download API Route
 * Download processed files from temporary storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTempStorage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const storage = getTempStorage()
    const file = storage.get(id)

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or expired' },
        { status: 404 }
      )
    }

    // Return file with proper headers
    const response = new NextResponse(file.buffer)
    
    response.headers.set('Content-Type', file.mimeType)
    response.headers.set('Content-Length', file.size.toString())
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`
    )
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const storage = getTempStorage()
    const deleted = storage.delete(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'File not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted',
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
