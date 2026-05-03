/**
 * OCR Processor — Native Tesseract 5 (LSTM neural-network engine)
 *
 * Uses the system-installed Tesseract 5 binary via child_process.
 * Replaces the tesseract.js JS port for significantly better accuracy:
 *  - No CDN downloads: traineddata bundled with the nix package (129 languages)
 *  - LSTM engine (--oem 1) gives neural-network quality for every script
 *  - Full per-word confidence via TSV output
 *  - Zero persistent state — no cross-request leakage
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { cleanOcrText } from './text-cleaner'
import { OCR_LANGUAGES, type OcrLanguage } from '../i18n/ocr-languages'

const execFileAsync = promisify(execFile)
const OCR_TIMEOUT_MS = 90_000

export interface OCROptions {
  language?: string
  languages?: string[]
  outputType?: 'text' | 'searchable-pdf' | 'both'
  onProgress?: (page: number, total: number) => void
}

export interface OCRResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
  pages?: Array<{ pageNumber: number; text: string; confidence: number }>
}

// ---------------------------------------------------------------------------
// Language-family helpers
// ---------------------------------------------------------------------------

function getLangFamily(lang: string): 'rtl' | 'cjk' | 'indic' | 'latin' {
  const rtl    = ['ara', 'heb', 'fas', 'urd', 'pus', 'snd', 'syr', 'uig', 'div', 'yid']
  const cjk    = ['chi_sim', 'chi_tra', 'jpn', 'kor']
  const indic  = ['hin', 'ben', 'tam', 'tel', 'kan', 'mal', 'guj', 'pan', 'ori', 'sin', 'nep', 'mar', 'san', 'asm']
  if (rtl.some((l) => lang.includes(l)))   return 'rtl'
  if (cjk.some((l) => lang.includes(l)))   return 'cjk'
  if (indic.some((l) => lang.includes(l))) return 'indic'
  return 'latin'
}

/**
 * PSM 3 = Fully automatic (best for Latin / mixed layouts)
 * PSM 6 = Single uniform text block (best for RTL, CJK, Indic scripts)
 */
function getPsm(lang: string): number {
  return getLangFamily(lang) === 'latin' ? 3 : 6
}

// ---------------------------------------------------------------------------
// Image pre-processing (sharp)
// ---------------------------------------------------------------------------

async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buffer).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0

    let pipeline = sharp(buffer, { failOn: 'error', limitInputPixels: 24_000 * 24_000 })

    const MIN_WIDTH = 1800
    if (w > 0 && w < MIN_WIDTH) {
      const scale = MIN_WIDTH / w
      pipeline = pipeline.resize(Math.round(w * scale), Math.round(h * scale), {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
    }

    return await pipeline
      .grayscale()
      .normalize()
      .linear(1.3, -(0.3 * 128))
      .sharpen({ sigma: 1.5, m1: 2.5, m2: 0.5 })
      .png({ compressionLevel: 1 })
      .toBuffer()
  } catch {
    return buffer
  }
}

async function preprocessImageAlt(buffer: Buffer): Promise<Buffer> {
  try {
    const stats = await sharp(buffer).grayscale().stats()
    const avgBrightness = stats.channels[0].mean ?? 128

    let pipeline = sharp(buffer, { failOn: 'error', limitInputPixels: 24_000 * 24_000 })
      .grayscale()
      .normalize()

    if (avgBrightness < 100) pipeline = pipeline.negate()

    return await pipeline
      .linear(1.6, -(0.6 * 128))
      .threshold(128)
      .sharpen({ sigma: 2.0, m1: 3.0, m2: 0.5 })
      .png({ compressionLevel: 1 })
      .toBuffer()
  } catch {
    return buffer
  }
}

// ---------------------------------------------------------------------------
// Native Tesseract runner
// ---------------------------------------------------------------------------

interface TesseractResult {
  text: string
  confidence: number
  words: OCRResult['words']
}

async function runNativeTesseract(imagePath: string, lang: string): Promise<TesseractResult> {
  const psm = getPsm(lang)
  const baseArgs = [imagePath, 'stdout', '-l', lang, '--oem', '1', '--psm', String(psm)]

  // Run text + TSV in parallel for clean text and per-word confidence
  const [txtOut, tsvOut] = await Promise.all([
    execFileAsync('tesseract', [...baseArgs], {
      timeout: OCR_TIMEOUT_MS,
      maxBuffer: 20 * 1024 * 1024,
    }).then((r) => r.stdout).catch(() => ''),
    execFileAsync('tesseract', [...baseArgs, 'tsv'], {
      timeout: OCR_TIMEOUT_MS,
      maxBuffer: 20 * 1024 * 1024,
    }).then((r) => r.stdout).catch(() => ''),
  ])

  // Parse TSV for word-level confidence
  const words: OCRResult['words'] = []
  let totalConf = 0
  let wordCount = 0

  if (tsvOut) {
    for (const line of tsvOut.split('\n').slice(1)) {
      const cols = line.split('\t')
      if (cols.length < 12) continue
      if (parseInt(cols[0], 10) !== 5) continue  // level 5 = word
      const conf = parseFloat(cols[10])
      const text = cols[11]?.trim() ?? ''
      if (!text || conf < 0) continue
      words.push({
        text,
        confidence: conf,
        bbox: {
          x0: parseInt(cols[6], 10),
          y0: parseInt(cols[7], 10),
          x1: parseInt(cols[6], 10) + parseInt(cols[8], 10),
          y1: parseInt(cols[7], 10) + parseInt(cols[9], 10),
        },
      })
      totalConf += conf
      wordCount++
    }
  }

  return {
    text: txtOut,
    confidence: wordCount > 0 ? totalConf / wordCount : 0,
    words,
  }
}

// ---------------------------------------------------------------------------
// Exported OCR Processor
// ---------------------------------------------------------------------------

export class OCRProcessor {
  async recognizeImage(imageBuffer: Buffer, options: OCROptions = {}): Promise<OCRResult> {
    const language = options.language ?? options.languages?.join('+') ?? 'eng'
    const processed = await preprocessImage(imageBuffer)
    const tmpFile = join(tmpdir(), `ocr-${nanoid(8)}.png`)

    try {
      await writeFile(tmpFile, processed)
      const result = await runNativeTesseract(tmpFile, language)
      result.text = cleanOcrText(result.text, language)

      // Retry with aggressive preprocessing if the first pass is poor
      if (result.confidence < 35 || result.text.trim().length < 5) {
        const altBuffer = await preprocessImageAlt(imageBuffer)
        await writeFile(tmpFile, altBuffer)
        const altResult = await runNativeTesseract(tmpFile, language)
        altResult.text = cleanOcrText(altResult.text, language)

        const altIsBetter =
          altResult.confidence > result.confidence + 5 ||
          (altResult.text.trim().length > result.text.trim().length * 1.3 && altResult.confidence > 15)

        if (altIsBetter) {
          return { text: altResult.text, confidence: altResult.confidence, words: altResult.words }
        }
      }

      return { text: result.text, confidence: result.confidence, words: result.words }
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }

  async recognizeImages(imageBuffers: Buffer[], options: OCROptions = {}): Promise<OCRResult> {
    const total = imageBuffers.length
    const pageResults: Array<OCRResult & { pageNumber: number }> = []

    const BATCH_SIZE = 3
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = imageBuffers.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map((buf, j) =>
          this.recognizeImage(buf, options).then((r) => ({ ...r, pageNumber: i + j + 1 }))
        )
      )
      pageResults.push(...batchResults)
      if (options.onProgress) options.onProgress(Math.min(i + BATCH_SIZE, total), total)
    }

    const combinedText = pageResults.map((r) => r.text).join('\n\n--- Page Break ---\n\n')
    const avgConfidence = pageResults.reduce((s, r) => s + r.confidence, 0) / pageResults.length

    return {
      text: combinedText,
      confidence: avgConfidence,
      words: pageResults.flatMap((r) => r.words),
      pages: pageResults.map((r) => ({ pageNumber: r.pageNumber, text: r.text, confidence: r.confidence })),
    }
  }

  async recognizePdf(pdfBuffer: Buffer, options: OCROptions = {}): Promise<OCRResult & { searchablePdf?: Buffer }> {
    const language = options.language ?? options.languages?.join('+') ?? 'eng'
    const extractedText = await this.extractNativeText(pdfBuffer)
    if (extractedText && extractedText.length > 50) {
      return { text: cleanOcrText(extractedText, language), confidence: 100, words: [], pages: [] }
    }
    return {
      text: 'This PDF appears to be scanned. Use the PDF→JPG tool first to convert pages to images, then run OCR on those images for best results.',
      confidence: 0,
      words: [],
      pages: [],
    }
  }

  private async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(pdfBuffer)
      return data.text ?? ''
    } catch {
      return ''
    }
  }

  async terminate(): Promise<void> {}

  getAvailableLanguages(): OcrLanguage[] {
    return OCR_LANGUAGES
  }
}

export const ocrProcessor = new OCRProcessor()
