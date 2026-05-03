/**
 * POST /api/ocr/detect
 * Lightweight script/language detection using Tesseract OSD mode.
 * Returns detected script and a best-guess language — for UI display only.
 * The user MUST confirm or override the language before OCR runs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'
import { streamUpload, validateStreamedFile, readFile } from '@/lib/stream-upload'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

const SCRIPT_TO_LANG: Record<string, { code: string; name: string }> = {
  Latin:      { code: 'eng', name: 'English' },
  Arabic:     { code: 'ara', name: 'Arabic' },
  Cyrillic:   { code: 'rus', name: 'Russian' },
  Han:        { code: 'chi_sim', name: 'Chinese (Simplified)' },
  Hiragana:   { code: 'jpn', name: 'Japanese' },
  Katakana:   { code: 'jpn', name: 'Japanese' },
  Hangul:     { code: 'kor', name: 'Korean' },
  Devanagari: { code: 'hin', name: 'Hindi' },
  Bengali:    { code: 'ben', name: 'Bengali' },
  Tamil:      { code: 'tam', name: 'Tamil' },
  Telugu:     { code: 'tel', name: 'Telugu' },
  Kannada:    { code: 'kan', name: 'Kannada' },
  Malayalam:  { code: 'mal', name: 'Malayalam' },
  Gujarati:   { code: 'guj', name: 'Gujarati' },
  Gurmukhi:   { code: 'pan', name: 'Punjabi' },
  Thai:       { code: 'tha', name: 'Thai' },
  Greek:      { code: 'ell', name: 'Greek' },
  Hebrew:     { code: 'heb', name: 'Hebrew' },
  Armenian:   { code: 'hye', name: 'Armenian' },
  Georgian:   { code: 'kat', name: 'Georgian' },
  Myanmar:    { code: 'mya', name: 'Burmese' },
  Khmer:      { code: 'khm', name: 'Khmer' },
  Ethiopic:   { code: 'amh', name: 'Amharic' },
}

export async function POST(request: NextRequest) {
  const { files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'image')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const imageBuffer = await readFile(file.path)

    const processed = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .resize(800, undefined, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 1 })
      .toBuffer()

    const worker = await createWorker('osd', 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      cacheMethod: 'none',
    })

    try {
      const result = await Promise.race([
        worker.detect(processed),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Detection timed out')), 20_000)
        ),
      ])

      await worker.terminate()

      const data = result.data as { script?: string; script_confidence?: number; orientation_confidence?: number }
      const script = data.script ?? 'Latin'
      const scriptConf = Math.round((data.script_confidence ?? 0) * 100) / 100
      const lang = SCRIPT_TO_LANG[script] ?? SCRIPT_TO_LANG['Latin']

      return NextResponse.json({
        script,
        scriptConfidence: Math.min(Math.round(scriptConf), 99),
        detectedLang: lang.code,
        detectedLangName: lang.name,
      })
    } catch {
      await worker.terminate()
      return NextResponse.json({
        script: 'Unknown',
        scriptConfidence: 0,
        detectedLang: 'eng',
        detectedLangName: 'English',
      })
    }
  } finally {
    await cleanup()
  }
}
