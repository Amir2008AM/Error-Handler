import { NextResponse } from 'next/server'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

/**
 * Validate a single file for size and MIME type.
 * Returns a NextResponse error if invalid, or null if OK.
 */
export function validateFile(
  file: File | null | undefined,
  type: 'pdf' | 'image' | 'any'
): NextResponse | null {
  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: 'The uploaded file is empty.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 50MB.' },
      { status: 413 }
    )
  }

  if (type === 'pdf') {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are accepted.' },
        { status: 400 }
      )
    }
  }

  if (type === 'image') {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only image files are accepted.' },
        { status: 400 }
      )
    }
  }

  return null
}

/**
 * Validate multiple PDF files for size and MIME type.
 * Returns a NextResponse error if any file is invalid, or null if all OK.
 */
export function validateFiles(
  files: (File | null | undefined)[],
  type: 'pdf' | 'image' | 'any'
): NextResponse | null {
  for (const file of files) {
    const error = validateFile(file, type)
    if (error) return error
  }
  return null
}
