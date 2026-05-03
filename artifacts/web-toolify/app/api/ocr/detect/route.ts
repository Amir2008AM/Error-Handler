/**
 * POST /api/ocr/detect — Three-stage hybrid language detector
 *
 * Stage 1 — Unicode Script Analysis (PRIMARY)
 *   Run a quick multi-script OCR pass, then count each character's Unicode
 *   block. ALL significant scripts are recorded (threshold ≥ 15 %). When
 *   an image mixes Arabic + Latin, both are returned and the OCR is run
 *   with a merged language string ("ara+eng") for maximum accuracy.
 *
 * Stage 2 — franc (SUPPORT for Latin scripts)
 *   When the image is Latin-script, franc's trigram model narrows it down
 *   to a specific language (French, Spanish, German …).
 *
 * Stage 3 — Fallback
 *   If confidence is too low, return detectedLang = "" so the user selects
 *   manually. No silent default to English.
 */
import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { streamUpload, validateStreamedFile, readFile } from '@/lib/stream-upload'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Unicode block definitions
// ---------------------------------------------------------------------------

interface LangInfo { code: string; name: string }

const UNICODE_BLOCKS: Array<{ name: string; ranges: [number, number][]; lang: LangInfo }> = [
  {
    name: 'Arabic',
    ranges: [[0x0600, 0x06FF], [0x0750, 0x077F], [0x08A0, 0x08FF],
             [0xFB50, 0xFDFF], [0xFE70, 0xFEFF]],
    lang: { code: 'ara', name: 'Arabic' },
  },
  {
    name: 'Hebrew',
    ranges: [[0x0590, 0x05FF], [0xFB1D, 0xFB4F]],
    lang: { code: 'heb', name: 'Hebrew' },
  },
  {
    name: 'Cyrillic',
    ranges: [[0x0400, 0x04FF], [0x0500, 0x052F]],
    lang: { code: 'rus', name: 'Russian' },
  },
  {
    name: 'CJK',
    ranges: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF], [0x20000, 0x2A6DF], [0xF900, 0xFAFF]],
    lang: { code: 'chi_sim', name: 'Chinese (Simplified)' },
  },
  {
    name: 'Hiragana',
    ranges: [[0x3040, 0x309F]],
    lang: { code: 'jpn', name: 'Japanese' },
  },
  {
    name: 'Katakana',
    ranges: [[0x30A0, 0x30FF], [0x31F0, 0x31FF]],
    lang: { code: 'jpn', name: 'Japanese' },
  },
  {
    name: 'Hangul',
    ranges: [[0xAC00, 0xD7AF], [0x1100, 0x11FF], [0xA960, 0xA97F]],
    lang: { code: 'kor', name: 'Korean' },
  },
  {
    name: 'Devanagari',
    ranges: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]],
    lang: { code: 'hin', name: 'Hindi' },
  },
  {
    name: 'Bengali',
    ranges: [[0x0980, 0x09FF]],
    lang: { code: 'ben', name: 'Bengali' },
  },
  {
    name: 'Tamil',
    ranges: [[0x0B80, 0x0BFF]],
    lang: { code: 'tam', name: 'Tamil' },
  },
  {
    name: 'Telugu',
    ranges: [[0x0C00, 0x0C7F]],
    lang: { code: 'tel', name: 'Telugu' },
  },
  {
    name: 'Kannada',
    ranges: [[0x0C80, 0x0CFF]],
    lang: { code: 'kan', name: 'Kannada' },
  },
  {
    name: 'Malayalam',
    ranges: [[0x0D00, 0x0D7F]],
    lang: { code: 'mal', name: 'Malayalam' },
  },
  {
    name: 'Gujarati',
    ranges: [[0x0A80, 0x0AFF]],
    lang: { code: 'guj', name: 'Gujarati' },
  },
  {
    name: 'Gurmukhi',
    ranges: [[0x0A00, 0x0A7F]],
    lang: { code: 'pan', name: 'Punjabi' },
  },
  {
    name: 'Thai',
    ranges: [[0x0E00, 0x0E7F]],
    lang: { code: 'tha', name: 'Thai' },
  },
  {
    name: 'Greek',
    ranges: [[0x0370, 0x03FF], [0x1F00, 0x1FFF]],
    lang: { code: 'ell', name: 'Greek' },
  },
  {
    name: 'Armenian',
    ranges: [[0x0530, 0x058F], [0xFB00, 0xFB1C]],
    lang: { code: 'hye', name: 'Armenian' },
  },
  {
    name: 'Georgian',
    ranges: [[0x10A0, 0x10FF], [0x2D00, 0x2D2F]],
    lang: { code: 'kat', name: 'Georgian' },
  },
  {
    name: 'Myanmar',
    ranges: [[0x1000, 0x109F], [0xA9E0, 0xA9FF]],
    lang: { code: 'mya', name: 'Burmese' },
  },
  {
    name: 'Khmer',
    ranges: [[0x1780, 0x17FF]],
    lang: { code: 'khm', name: 'Khmer' },
  },
  {
    name: 'Ethiopic',
    ranges: [[0x1200, 0x137F], [0x1380, 0x139F]],
    lang: { code: 'amh', name: 'Amharic' },
  },
  {
    name: 'Sinhala',
    ranges: [[0x0D80, 0x0DFF]],
    lang: { code: 'sin', name: 'Sinhala' },
  },
  {
    name: 'Tibetan',
    ranges: [[0x0F00, 0x0FFF]],
    lang: { code: 'bod', name: 'Tibetan' },
  },
  {
    name: 'Lao',
    ranges: [[0x0E80, 0x0EFF]],
    lang: { code: 'lao', name: 'Lao' },
  },
]

const LATIN_RANGES: [number, number][] = [
  [0x0041, 0x005A], [0x0061, 0x007A],
  [0x00C0, 0x00D6], [0x00D8, 0x00F6], [0x00F8, 0x024F],
]

function inRanges(cp: number, ranges: [number, number][]): boolean {
  return ranges.some(([lo, hi]) => cp >= lo && cp <= hi)
}

// ---------------------------------------------------------------------------
// Multi-script Unicode analyser
// ---------------------------------------------------------------------------

interface ScriptResult {
  script: string
  lang: LangInfo
  confidence: number   // 0–100, share of total chars
}

interface UnicodeAnalysis {
  /** All detected scripts above the significance threshold, sorted by dominance */
  scripts: ScriptResult[]
  /** True when Latin characters are a significant share */
  hasLatin: boolean
  latinConfidence: number
}

const NON_LATIN_THRESHOLD = 0.15   // ≥15 % of chars → significant script
const LATIN_THRESHOLD     = 0.30   // ≥30 % of chars → Latin is significant

function analyzeUnicodeScripts(text: string): UnicodeAnalysis {
  const chars = [...text].filter((c) => !/\s/.test(c))

  if (chars.length < 5) {
    return { scripts: [], hasLatin: false, latinConfidence: 0 }
  }

  const blockCounts: Record<string, { count: number; lang: LangInfo }> = {}
  let latinCount = 0
  const total = chars.length

  for (const char of chars) {
    const cp = char.codePointAt(0) ?? 0
    let matched = false
    for (const block of UNICODE_BLOCKS) {
      if (inRanges(cp, block.ranges)) {
        if (!blockCounts[block.name]) {
          blockCounts[block.name] = { count: 0, lang: block.lang }
        }
        blockCounts[block.name].count++
        matched = true
        break
      }
    }
    if (!matched && inRanges(cp, LATIN_RANGES)) latinCount++
  }

  // Deduplicate scripts that share the same Tesseract code (e.g. Hiragana + Katakana → jpn)
  const merged: Record<string, ScriptResult> = {}
  for (const [name, { count, lang }] of Object.entries(blockCounts)) {
    const ratio = count / total
    if (ratio < NON_LATIN_THRESHOLD) continue
    const existing = merged[lang.code]
    if (!existing || existing.confidence < Math.round(ratio * 100)) {
      merged[lang.code] = {
        script: name,
        lang,
        confidence: Math.min(Math.round(ratio * 100), 99),
      }
    }
  }

  const scripts = Object.values(merged).sort((a, b) => b.confidence - a.confidence)
  const latinRatio = latinCount / total
  const hasLatin = latinRatio >= LATIN_THRESHOLD

  return { scripts, hasLatin, latinConfidence: Math.min(Math.round(latinRatio * 100), 99) }
}

// ---------------------------------------------------------------------------
// franc → Tesseract  (Stage 2 — Latin language disambiguation)
// ---------------------------------------------------------------------------

const FRANC_TO_TESSERACT: Record<string, LangInfo> = {
  eng: { code: 'eng', name: 'English' },
  fra: { code: 'fra', name: 'French' },
  deu: { code: 'deu', name: 'German' },
  spa: { code: 'spa', name: 'Spanish' },
  por: { code: 'por', name: 'Portuguese' },
  ita: { code: 'ita', name: 'Italian' },
  nld: { code: 'nld', name: 'Dutch' },
  pol: { code: 'pol', name: 'Polish' },
  tur: { code: 'tur', name: 'Turkish' },
  vie: { code: 'vie', name: 'Vietnamese' },
  ron: { code: 'ron', name: 'Romanian' },
  ces: { code: 'ces', name: 'Czech' },
  hun: { code: 'hun', name: 'Hungarian' },
  swe: { code: 'swe', name: 'Swedish' },
  nor: { code: 'nor', name: 'Norwegian' },
  dan: { code: 'dan', name: 'Danish' },
  fin: { code: 'fin', name: 'Finnish' },
  slk: { code: 'slk', name: 'Slovak' },
  hrv: { code: 'hrv', name: 'Croatian' },
  ind: { code: 'ind', name: 'Indonesian' },
  msa: { code: 'msa', name: 'Malay' },
  lat: { code: 'lat', name: 'Latin' },
  afr: { code: 'afr', name: 'Afrikaans' },
  cat: { code: 'cat', name: 'Catalan' },
  lav: { code: 'lav', name: 'Latvian' },
  lit: { code: 'lit', name: 'Lithuanian' },
  slv: { code: 'slv', name: 'Slovenian' },
  est: { code: 'est', name: 'Estonian' },
  eus: { code: 'eus', name: 'Basque' },
  glg: { code: 'glg', name: 'Galician' },
  isl: { code: 'isl', name: 'Icelandic' },
  swa: { code: 'swa', name: 'Swahili' },
}

// ---------------------------------------------------------------------------
// Quick multi-script OCR pass
// ---------------------------------------------------------------------------

async function quickOcrText(imagePath: string): Promise<string> {
  const DETECT_LANGS = 'eng+ara+rus+chi_sim+jpn+kor+hin+tha+heb'
  try {
    const { stdout } = await execFileAsync(
      'tesseract',
      [imagePath, 'stdout', '-l', DETECT_LANGS, '--oem', '1', '--psm', '3'],
      { timeout: 25_000, maxBuffer: 4 * 1024 * 1024 }
    )
    return stdout.trim()
  } catch {
    try {
      const { stdout } = await execFileAsync(
        'tesseract',
        [imagePath, 'stdout', '-l', 'eng', '--oem', '1', '--psm', '3'],
        { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 }
      )
      return stdout.trim()
    } catch {
      return ''
    }
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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

    const tmpFile = join(tmpdir(), `det-${nanoid(8)}.png`)

    try {
      await writeFile(tmpFile, processed)

      // ── Stage 1: Multi-script OCR → Unicode range analysis ─────────────────
      const rawText = await quickOcrText(tmpFile)
      const analysis = analyzeUnicodeScripts(rawText)

      // Build the detected language list
      const detectedLangs: LangInfo[] = [...analysis.scripts.map((s) => s.lang)]

      // If Latin is also significant alongside a non-Latin script, add English
      // as a secondary language so Tesseract handles mixed content
      if (analysis.hasLatin && analysis.scripts.length > 0) {
        const alreadyHasLatin = detectedLangs.some((l) =>
          ['eng', 'fra', 'deu', 'spa', 'por', 'ita'].includes(l.code)
        )
        if (!alreadyHasLatin) {
          detectedLangs.push({ code: 'eng', name: 'English' })
        }
      }

      // Non-empty non-Latin detection
      if (detectedLangs.length > 0) {
        const primary = detectedLangs[0]
        const combined = detectedLangs.map((l) => l.code).join('+')
        const overallConf = analysis.scripts[0]?.confidence ?? 50

        return NextResponse.json({
          script: analysis.scripts[0]?.script ?? 'Mixed',
          scriptConfidence: overallConf,
          detectedLang: combined,
          detectedLangName: primary.name,
          detectedLangs,                     // full list for multi-language badge
          isMixed: detectedLangs.length > 1,
        })
      }

      // ── Stage 2: franc — Latin language disambiguation ──────────────────────
      if (analysis.hasLatin && rawText.length >= 15) {
        try {
          const { franc } = await import('franc')
          const iso = franc(rawText, { minLength: 10 })

          if (iso && iso !== 'und') {
            const mapped = FRANC_TO_TESSERACT[iso]
            if (mapped) {
              return NextResponse.json({
                script: 'Latin',
                scriptConfidence: 65,
                detectedLang: mapped.code,
                detectedLangName: mapped.name,
                detectedLangs: [mapped],
                isMixed: false,
              })
            }
          }
        } catch {
          // franc unavailable — fall through
        }
      }

      // ── Stage 3: Fallback — user must select ────────────────────────────────
      return NextResponse.json({
        script: 'Unknown',
        scriptConfidence: 0,
        detectedLang: '',
        detectedLangName: '',
        detectedLangs: [],
        isMixed: false,
      })
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  } finally {
    await cleanup()
  }
}
