/**
 * Document Converter
 *
 * Converts Word, Excel, and HTML to PDF using the best available engine.
 *
 * ENGINE PRIORITY
 * ───────────────
 * Word (.docx/.doc)  → LibreOffice headless → fallback: mammoth + pdf-lib
 * Excel (.xlsx/.xls) → Python enterprise pipeline (Arabic RTL) → LibreOffice → xlsx + pdf-lib
 * HTML               → wkhtmltopdf          → fallback: HTML-strip + pdf-lib
 *
 * Every new engine wraps its call in a try/catch and falls back to the
 * existing pdf-lib renderer so existing functionality is never broken.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile as fsReadFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { runPdf2Docx } from '../lo-server'

// ── CLI helpers ────────────────────────────────────────────────────────────

interface CliResult { code: number; stdout: string; stderr: string }

function runCli(
  cmd: string,
  args: string[],
  opts: { timeoutMs?: number; env?: Record<string, string> } = {}
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...opts.env },
    })
    let stdout = '', stderr = ''
    proc.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8') })
    proc.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8') })
    proc.on('error', (err) => { if (timer) clearTimeout(timer); reject(err) })
    const timer = opts.timeoutMs
      ? setTimeout(() => { proc.kill('SIGKILL'); reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`)) }, opts.timeoutMs)
      : null
    proc.on('close', (code) => {
      if (timer) clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr })
    })
  })
}

async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  try { return await fn(dir) } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

/** Returns true if `cmd` resolves to an executable on PATH */
async function binaryExists(cmd: string): Promise<boolean> {
  try {
    const r = await runCli('which', [cmd], { timeoutMs: 3_000 })
    return r.code === 0
  } catch { return false }
}

/** Validate the buffer looks like a real PDF (magic bytes) */
function isPdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-'
}

// ── Public interfaces ──────────────────────────────────────────────────────

export interface ConversionOptions {
  pageSize?:   'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
  margins?: { top?: number; bottom?: number; left?: number; right?: number }
  fontSize?:   number
  fontFamily?: 'helvetica' | 'times' | 'courier'
}

export interface ConversionResult {
  buffer:         Buffer
  pageCount:      number
  originalFormat: string
  engine?:        string
}

// Page dimensions in points (72 pt = 1 inch)
const PAGE_SIZES = {
  a4:     { width: 595,  height: 842  },
  letter: { width: 612,  height: 792  },
  legal:  { width: 612,  height: 1008 },
}

// ── DocumentConverter ──────────────────────────────────────────────────────

export class DocumentConverter {

  // ── Word → PDF ────────────────────────────────────────────────────────

  /**
   * Convert a Word document (.docx / .doc) to PDF.
   * Fast path:   mammoth (DOCX→HTML) + wkhtmltopdf (HTML→PDF)  ~1–2 s
   * Slow path:   LibreOffice headless                           ~4–6 s
   * Fallback:    mammoth raw text + pdf-lib                     (basic quality)
   */
  async wordToPdf(
    docxBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const isDocx = docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b // PK magic
    const inputExt = isDocx ? '.docx' : '.doc'

    // ── Fast path: mammoth HTML + wkhtmltopdf ───────────────────────────────
    if (isDocx) {
      try {
        const result = await this.mammothWkHtmlToPdf(docxBuffer, options)
        if (result) return result
      } catch (err) {
        console.warn('[DocumentConverter] mammoth+wkhtmltopdf failed, trying LibreOffice:',
          err instanceof Error ? err.message : String(err))
      }
    }

    // ── Slow path: LibreOffice ──────────────────────────────────────────────
    if (await binaryExists('soffice')) {
      try {
        return await this.libreOfficeConvert(docxBuffer, inputExt, 'docx')
      } catch (err) {
        console.warn('[DocumentConverter] LibreOffice Word→PDF failed, using fallback:',
          err instanceof Error ? err.message : String(err))
      }
    }

    return this.wordToPdfFallback(docxBuffer, options)
  }

  /** Fast Word→PDF via mammoth (HTML) + wkhtmltopdf */
  private async mammothWkHtmlToPdf(
    docxBuffer: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult | null> {
    const wkPath = await runCli('which', ['wkhtmltopdf'], { timeoutMs: 3_000 })
    if (wkPath.code !== 0) return null

    return withTempDir('wk-word-pdf-', async (dir) => {
      // 1. mammoth: DOCX → HTML (keeps headings, bold, tables, lists)
      const html = await mammoth.convertToHtml({ buffer: docxBuffer })

      const pageSize    = options.pageSize    ?? 'a4'
      const isLandscape = options.orientation === 'landscape'
      const pageSizeMap = { a4: 'A4', letter: 'Letter', legal: 'Legal' }
      const wkPageSize  = pageSizeMap[pageSize] ?? 'A4'

      const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; margin: 2cm; line-height: 1.4; }
  h1,h2,h3,h4 { margin-top: 1em; }
  table { border-collapse: collapse; width: 100%; }
  td,th { border: 1px solid #ccc; padding: 4px 8px; }
  img { max-width: 100%; }
</style>
</head><body>${html.value}</body></html>`

      const htmlFile = join(dir, 'input.html')
      const outFile  = join(dir, 'output.pdf')
      await writeFile(htmlFile, fullHtml, 'utf8')

      // 2. wkhtmltopdf: HTML → PDF
      const args = [
        '--quiet',
        '--encoding', 'utf-8',
        '--page-size', wkPageSize,
        ...(isLandscape ? ['--orientation', 'Landscape'] : []),
        '--margin-top', '20mm',
        '--margin-bottom', '20mm',
        '--margin-left', '20mm',
        '--margin-right', '20mm',
        htmlFile,
        outFile,
      ]

      const result = await runCli('wkhtmltopdf', args, { timeoutMs: 90_000 })
      if (result.code !== 0 && !existsSync(outFile)) {
        throw new Error(`wkhtmltopdf exited ${result.code}: ${result.stderr.trim().slice(0, 300)}`)
      }

      const pdfBuffer = await fsReadFile(outFile)
      if (!isPdf(pdfBuffer)) throw new Error('wkhtmltopdf produced invalid PDF')

      let pageCount = 1
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
        pageCount = pdfDoc.getPageCount()
      } catch { /* best-effort */ }

      return { buffer: pdfBuffer, pageCount, originalFormat: 'docx', engine: 'mammoth+wkhtmltopdf' }
    })
  }

  /** LibreOffice headless conversion (Word / Excel → PDF) */
  private async libreOfficeConvert(
    inputBuffer: Buffer,
    inputExt: string,
    originalFormat: string
  ): Promise<ConversionResult> {
    return withTempDir('lo-conv-', async (dir) => {
      const inFile  = join(dir, `input${inputExt}`)
      const outFile = join(dir, 'input.pdf')
      await writeFile(inFile, inputBuffer)

      // ── soffice spawn ────────────────────────────────────────────────────
      const result = await runCli(
        'soffice',
        [
          '--headless',
          '--norestore',
          '--nofirststartwizard',
          '--convert-to', 'pdf',
          '--outdir', dir,
          inFile,
        ],
        {
          timeoutMs: 120_000,
          env: { HOME: dir, TMPDIR: dir, SAL_USE_VCLPLUGIN: 'svp' },
        }
      )

      if (result.code !== 0) {
        throw new Error(
          `LibreOffice exited ${result.code}: ${(result.stderr || result.stdout).trim().slice(0, 400)}`
        )
      }

      const pdfBuffer = await fsReadFile(outFile)

      if (!isPdf(pdfBuffer)) {
        throw new Error('LibreOffice produced an invalid or empty PDF')
      }

      let pageCount = 1
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
        pageCount = pdfDoc.getPageCount()
      } catch { /* best-effort */ }

      return { buffer: pdfBuffer, pageCount, originalFormat, engine: 'libreoffice' }
    })
  }

  /** Fallback: mammoth (text extraction) + pdf-lib */
  private async wordToPdfFallback(
    docxBuffer: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const result = await mammoth.extractRawText({ buffer: docxBuffer })
    const text = result.value

    const pdfDoc = await PDFDocument.create()
    const font   = await this.getFont(pdfDoc, options.fontFamily || 'helvetica')

    const pageSize   = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width  = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width  : pageSize.height

    const margins = {
      top:    options.margins?.top    ?? 72,
      bottom: options.margins?.bottom ?? 72,
      left:   options.margins?.left   ?? 72,
      right:  options.margins?.right  ?? 72,
    }
    const fontSize   = options.fontSize ?? 12
    const lineHeight = fontSize * 1.5
    const contentW   = width  - margins.left - margins.right
    const contentH   = height - margins.top  - margins.bottom
    const lines      = this.wrapText(text, font, fontSize, contentW)
    const linesPerPg = Math.floor(contentH / lineHeight)

    let lineIdx = 0
    while (lineIdx < lines.length) {
      const page = pdfDoc.addPage([width, height])
      let y = height - margins.top - fontSize
      for (let i = 0; i < linesPerPg && lineIdx < lines.length; i++) {
        page.drawText(lines[lineIdx], { x: margins.left, y, size: fontSize, font, color: rgb(0, 0, 0) })
        y -= lineHeight
        lineIdx++
      }
    }
    if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([width, height])

    return {
      buffer:         Buffer.from(await pdfDoc.save()),
      pageCount:      pdfDoc.getPageCount(),
      originalFormat: 'docx',
      engine:         'pdf-lib',
    }
  }

  // ── PowerPoint → PDF ──────────────────────────────────────────────────

  /**
   * Convert a PowerPoint presentation (.pptx / .ppt) to PDF.
   * Primary: LibreOffice headless  →  Fallback: stub PDF with error message
   */
  async pptToPdf(
    buffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // Detect format from magic bytes:
    // .pptx → ZIP (PK: 50 4B)
    // .ppt  → OLE2 compound doc (D0 CF 11 E0)
    const isPptx = buffer[0] === 0x50 && buffer[1] === 0x4b
    const inputExt = isPptx ? '.pptx' : '.ppt'

    if (await binaryExists('soffice')) {
      try {
        return await this.libreOfficeConvert(buffer, inputExt, inputExt.slice(1))
      } catch (err) {
        console.warn(
          '[DocumentConverter] LibreOffice PPT→PDF failed:',
          err instanceof Error ? err.message : String(err)
        )
        throw new Error(
          `Failed to convert presentation to PDF: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    // No LibreOffice available — produce an informative error rather than
    // a blank PDF, because there is no viable text-extraction fallback for PPTX.
    throw new Error(
      'LibreOffice (soffice) is required to convert PowerPoint files. ' +
      'Please ensure it is installed on the server.'
    )
  }

  // ── Excel → PDF ───────────────────────────────────────────────────────

  /**
   * Convert an Excel spreadsheet (.xlsx / .xls / .csv) to PDF.
   *
   * ENGINE PRIORITY (9-stage pipeline):
   *   1–7. LibreOffice primary pipeline (excel_to_pdf_lo.py)
   *        ├ Stage 1: Light validation (magic bytes, openpyxl load)
   *        ├ Stage 2: Preflight stabilisation (row heights, col widths,
   *        │           merged cells, wrap text, print settings)
   *        ├ Stage 3: Font normalisation (map Excel fonts → Liberation/DejaVu)
   *        ├ Stage 4: LibreOffice headless --convert-to pdf
   *        ├ Stage 5: Post-render validation (pdfplumber: overlap / overflow /
   *        │           broken cells / duplicated headers → confidence score)
   *        ├ Stage 6: Safe retry (isolated LO profile) if confidence < 0.5
   *        └ Stage 7: Return JSON {success, pageCount, engine, confidence}
   *   8.   xlsx + pdf-lib table renderer — FALLBACK ONLY if LibreOffice crashes
   *   9.   Return result and clean up temp files (handled by caller)
   */
  async excelToPdf(
    xlsxBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const isXlsx = xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b
    const isXls  = xlsxBuffer[0] === 0xd0 && xlsxBuffer[1] === 0xcf
    const isCsv  = !isXlsx && !isXls   // CSV has no binary magic bytes

    // ── Stages 1–7: LibreOffice primary pipeline (xlsx / xls) ────────────
    // For CSV files we skip the Python preflight (openpyxl can't load CSV
    // reliably) and go directly to the LO bare conversion below.
    const loScript = this.resolveLoExcelScript()
    if (loScript && !isCsv) {
      try {
        return await this.loExcelToPdf(xlsxBuffer, options, loScript, isXlsx ? '.xlsx' : '.xls')
      } catch (err) {
        console.warn(
          '[DocumentConverter] LibreOffice primary pipeline failed:',
          err instanceof Error ? err.message : String(err)
        )
      }
    } else if (!loScript && !isCsv) {
      console.warn('[DocumentConverter] excel_to_pdf_lo.py not found — skipping LO pipeline')
    }

    // ── CSV path: direct LibreOffice conversion (no openpyxl preflight) ──
    if (isCsv && await binaryExists('soffice')) {
      try {
        return await this.libreOfficeConvert(xlsxBuffer, '.csv', 'csv')
      } catch (err) {
        console.warn('[DocumentConverter] LibreOffice CSV→PDF failed:', err instanceof Error ? err.message : String(err))
      }
    }

    // ── Stage 8a: Python ReportLab pipeline (Unicode-safe, Arabic RTL) ───
    // MUST run before pdf-lib — ReportLab embeds real Unicode fonts and
    // supports Arabic/RTL natively.  pdf-lib uses WinAnsi (Helvetica) which
    // CANNOT encode Arabic and will throw "WinAnsi cannot encode".
    if (isXlsx) {
      const rlScript = this.resolveExcelScript()
      if (rlScript) {
        try {
          return await this.pythonExcelToPdf(xlsxBuffer, options, rlScript)
        } catch (err) {
          console.warn(
            '[DocumentConverter] Python ReportLab pipeline also failed:',
            err instanceof Error ? err.message : String(err)
          )
        }
      }
    }

    // ── Stage 8b: xlsx + pdf-lib — absolute last resort ──────────────────
    // pdf-lib uses Helvetica (WinAnsi) which cannot encode Arabic/Unicode.
    // excelToPdfFallback sanitises all cell text before drawText() so this
    // path never throws "WinAnsi cannot encode" — Arabic chars are replaced
    // with '[?]' placeholder rather than crashing.
    console.warn('[DocumentConverter] Using pdf-lib last-resort fallback (WinAnsi-safe sanitisation applied)')
    return this.excelToPdfFallback(xlsxBuffer, options)
  }

  /** Resolve the path to excel_to_pdf_lo.py across deployment layouts */
  private resolveLoExcelScript(): string | null {
    const candidates = [
      join(process.cwd(), 'lib', 'processing', 'excel_to_pdf_lo.py'),
      join(process.cwd(), 'artifacts', 'web-toolify', 'lib', 'processing', 'excel_to_pdf_lo.py'),
      '/app/lib/processing/excel_to_pdf_lo.py',
      '/app/artifacts/web-toolify/lib/processing/excel_to_pdf_lo.py',
    ]
    return candidates.find(p => existsSync(p)) ?? null
  }

  /** Resolve the path to excel_to_pdf.py (legacy ReportLab pipeline) */
  private resolveExcelScript(): string | null {
    const candidates = [
      join(process.cwd(), 'lib', 'processing', 'excel_to_pdf.py'),
      join(process.cwd(), 'artifacts', 'web-toolify', 'lib', 'processing', 'excel_to_pdf.py'),
      '/app/lib/processing/excel_to_pdf.py',
      '/app/artifacts/web-toolify/lib/processing/excel_to_pdf.py',
    ]
    return candidates.find(p => existsSync(p)) ?? null
  }

  /**
   * Stages 1–7: LibreOffice primary pipeline via excel_to_pdf_lo.py.
   * Implements: validation → preflight → font normalisation →
   *             LO conversion → post-render validation → safe retry → return.
   * Throws on total failure so the caller falls back to pdf-lib (stage 8).
   */
  private async loExcelToPdf(
    xlsxBuffer: Buffer,
    options: ConversionOptions,
    scriptPath: string,
    inputExt: '.xlsx' | '.xls',
  ): Promise<ConversionResult> {
    return withTempDir('lo-excel-v3-', async (dir) => {
      const inFile  = join(dir, `input${inputExt}`)
      const outFile = join(dir, 'output.pdf')
      await writeFile(inFile, xlsxBuffer)

      const args: string[] = [
        scriptPath,
        inFile,
        outFile,
        '--page-size',   options.pageSize   ?? 'a4',
        '--orientation', options.orientation ?? 'landscape',
      ]

      const result = await runCli('python3', args, {
        timeoutMs: 180_000,
        env: { PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
      })

      // Script emits a single JSON line on stdout
      let parsed: Record<string, unknown> = {}
      try {
        const jsonLine = result.stdout.trim().split('\n').pop() ?? '{}'
        parsed = JSON.parse(jsonLine)
      } catch { /* handled below */ }

      if (!parsed.success) {
        const msg = (parsed.error as string | undefined) ?? `LO pipeline script exited ${result.code}`
        throw new Error(msg)
      }

      const pdfBuffer = await fsReadFile(outFile)
      if (!isPdf(pdfBuffer)) {
        throw new Error('LO primary pipeline produced an invalid or empty PDF')
      }

      const warnings = (parsed.warnings as string[] | undefined) ?? []
      if (warnings.length) {
        console.log('[excel-to-pdf] LO pipeline warnings:', warnings.join(' | '))
      }

      return {
        buffer:         pdfBuffer,
        pageCount:      (parsed.pageCount as number | undefined) ?? 1,
        originalFormat: inputExt.slice(1),
        engine:         (parsed.engine as string | undefined) ?? 'libreoffice-primary-v3',
      }
    })
  }

  /** Legacy Python ReportLab pipeline — kept for direct call if needed externally */
  private async pythonExcelToPdf(
    xlsxBuffer: Buffer,
    options: ConversionOptions,
    scriptPath: string,
  ): Promise<ConversionResult> {
    return withTempDir('py-excel-', async (dir) => {
      const inFile  = join(dir, 'input.xlsx')
      const outFile = join(dir, 'output.pdf')
      await writeFile(inFile, xlsxBuffer)

      const args: string[] = [
        scriptPath,
        inFile,
        outFile,
        '--page-size',   options.pageSize   ?? 'a4',
        '--orientation', options.orientation ?? 'landscape',
      ]
      if (options.fontSize && options.fontSize > 0) {
        args.push('--font-size', String(options.fontSize))
      }

      const result = await runCli('python3', args, {
        timeoutMs: 120_000,
        env: { PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
      })

      let parsed: Record<string, unknown> = {}
      try {
        const jsonLine = result.stdout.trim().split('\n').pop() ?? '{}'
        parsed = JSON.parse(jsonLine)
      } catch { /* will throw below */ }

      if (!parsed.success) {
        const msg = (parsed.error as string | undefined) ?? `Python script exited ${result.code}`
        throw new Error(msg)
      }

      const pdfBuffer = await fsReadFile(outFile)
      if (!isPdf(pdfBuffer)) {
        throw new Error('Python enterprise pipeline produced an invalid or empty PDF')
      }

      return {
        buffer:         pdfBuffer,
        pageCount:      (parsed.pageCount as number | undefined) ?? 1,
        originalFormat: 'xlsx',
        engine:         (parsed.engine as string | undefined) ?? 'python-enterprise-v2',
      }
    })
  }

  /**
   * Sanitise a string so it can safely be passed to pdf-lib's drawText()
   * with a WinAnsi-encoded standard font (Helvetica/Times/Courier).
   *
   * WinAnsi covers only Latin-1 (code points 0x00–0xFF).  Any character
   * outside that range — Arabic, CJK, Hebrew, emoji, … — causes pdf-lib to
   * throw "WinAnsi cannot encode <char>".  We replace each non-encodable
   * character with '?' so the fallback always completes without crashing.
   *
   * This is intentionally lossy: the correct fix is to use LibreOffice
   * (which embeds real Unicode fonts).  This method is the absolute last
   * resort when every other engine has already failed.
   */
  private sanitiseForWinAnsi(text: string): string {
    // Keep only characters in the WinAnsi / Latin-1 range (U+0000–U+00FF)
    // plus common printable ASCII.  Replace everything else with '?'.
    return text.replace(/[^\u0000-\u00FF]/g, '?')
  }

  /** Fallback: xlsx.js table parser + pdf-lib (WinAnsi-safe via sanitisation) */
  private async excelToPdfFallback(
    xlsxBuffer: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' })

    const pdfDoc   = await PDFDocument.create()
    const font     = await this.getFont(pdfDoc, options.fontFamily || 'helvetica')
    const boldFont = await this.getFont(pdfDoc, options.fontFamily || 'helvetica', true)

    const pageSize    = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width  = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width  : pageSize.height
    const margins = {
      top:    options.margins?.top    ?? 50,
      bottom: options.margins?.bottom ?? 50,
      left:   options.margins?.left   ?? 40,
      right:  options.margins?.right  ?? 40,
    }
    const fontSize       = options.fontSize ?? 10
    const headerFontSize = 12
    const cellPadding    = 4
    const rowHeight      = fontSize + cellPadding * 2

    for (const sheetName of workbook.SheetNames) {
      const sheet    = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
      if (jsonData.length === 0) continue

      const maxCols      = Math.max(...jsonData.map((r) => (r as unknown[]).length))
      const availableW   = width - margins.left - margins.right
      const colWidth     = Math.min(availableW / maxCols, 150)

      let page = pdfDoc.addPage([width, height])
      let y    = height - margins.top

      // Sheet name may also contain non-Latin chars — sanitise it too
      page.drawText(`Sheet: ${this.sanitiseForWinAnsi(sheetName)}`, {
        x: margins.left, y, size: headerFontSize, font: boldFont, color: rgb(0, 0, 0),
      })
      y -= headerFontSize + 10

      for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex] as unknown[]
        if (y - rowHeight < margins.bottom) {
          page = pdfDoc.addPage([width, height])
          y    = height - margins.top
        }
        for (let colIndex = 0; colIndex < maxCols; colIndex++) {
          const cellValue = row[colIndex]
          // CRITICAL: sanitise before drawText — WinAnsi cannot encode Arabic/Unicode
          const rawText  = cellValue != null ? String(cellValue).substring(0, 30) : ''
          const cellText = this.sanitiseForWinAnsi(rawText)
          const x        = margins.left + colIndex * colWidth
          page.drawRectangle({
            x, y: y - rowHeight, width: colWidth, height: rowHeight,
            borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5,
          })
          if (cellText && cellText.trim()) {
            page.drawText(cellText, {
              x: x + cellPadding,
              y: y - fontSize - cellPadding,
              size: rowIndex === 0 ? fontSize : fontSize - 1,
              font: rowIndex === 0 ? boldFont : font,
              color: rgb(0, 0, 0),
              maxWidth: colWidth - cellPadding * 2,
            })
          }
        }
        y -= rowHeight
      }
    }

    if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([width, height])

    return {
      buffer:         Buffer.from(await pdfDoc.save()),
      pageCount:      pdfDoc.getPageCount(),
      originalFormat: 'xlsx',
      engine:         'pdf-lib',
    }
  }

  // ── HTML → PDF ────────────────────────────────────────────────────────

  /**
   * Convert HTML content to PDF.
   * Primary: wkhtmltopdf  →  Fallback: HTML-strip + pdf-lib
   */
  async htmlToPdf(
    html: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    if (await binaryExists('wkhtmltopdf')) {
      try {
        return await this.htmlToPdfWkhtmltopdf(html, options)
      } catch (err) {
        console.warn(
          '[DocumentConverter] wkhtmltopdf HTML→PDF failed, using fallback:',
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    return this.htmlToPdfFallback(html, options)
  }

  /** wkhtmltopdf engine — renders HTML with CSS and JavaScript */
  private async htmlToPdfWkhtmltopdf(
    html: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const pageSize    = options.pageSize ?? 'a4'
    const orientation = options.orientation ?? 'portrait'

    // wkhtmltopdf expects title-cased page sizes: A4, Letter, Legal
    const wkPageSize = pageSize === 'a4' ? 'A4'
      : pageSize.charAt(0).toUpperCase() + pageSize.slice(1)
    const wkOrientation = orientation.charAt(0).toUpperCase() + orientation.slice(1)

    return withTempDir('wk-html-', async (dir) => {
      const inFile  = join(dir, 'input.html')
      const outFile = join(dir, 'output.pdf')

      // Write UTF-8 HTML with explicit charset meta so wkhtmltopdf handles
      // non-ASCII characters correctly even if the original lacks the tag.
      const htmlWithCharset = html.includes('<meta') && html.includes('charset')
        ? html
        : html.replace(/<head[^>]*>/i, '$&\n<meta charset="utf-8">')

      await writeFile(inFile, htmlWithCharset, 'utf8')

      const result = await runCli(
        'wkhtmltopdf',
        [
          '--quiet',
          '--page-size',    wkPageSize,
          '--orientation',  wkOrientation,
          '--margin-top',    '15mm',
          '--margin-right',  '15mm',
          '--margin-bottom', '15mm',
          '--margin-left',   '15mm',
          '--encoding',      'utf-8',
          '--no-stop-slow-scripts',
          '--javascript-delay', '500',
          '--load-error-handling', 'ignore',
          '--load-media-error-handling', 'ignore',
          inFile,
          outFile,
        ],
        { timeoutMs: 60_000 }
      )

      // wkhtmltopdf may exit 1 for warnings but still produce a valid PDF
      const pdfBuffer = await fsReadFile(outFile).catch(() => Buffer.alloc(0))

      if (!isPdf(pdfBuffer)) {
        throw new Error(
          `wkhtmltopdf produced no usable output (exit ${result.code}): `
          + (result.stderr || result.stdout).trim().slice(0, 300)
        )
      }

      let pageCount = 1
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
        pageCount = pdfDoc.getPageCount()
      } catch { /* best-effort */ }

      return { buffer: pdfBuffer, pageCount, originalFormat: 'html', engine: 'wkhtmltopdf' }
    })
  }

  /** Fallback: strip HTML tags, render plain text with pdf-lib */
  private async htmlToPdfFallback(
    html: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const text = this.stripHtml(html)

    const pdfDoc = await PDFDocument.create()
    const font   = await this.getFont(pdfDoc, options.fontFamily || 'helvetica')

    const pageSize    = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width  = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width  : pageSize.height
    const margins = {
      top:    options.margins?.top    ?? 72,
      bottom: options.margins?.bottom ?? 72,
      left:   options.margins?.left   ?? 72,
      right:  options.margins?.right  ?? 72,
    }
    const fontSize   = options.fontSize ?? 12
    const lineHeight = fontSize * 1.5
    const contentW   = width  - margins.left - margins.right
    const contentH   = height - margins.top  - margins.bottom
    const lines      = this.wrapText(text, font, fontSize, contentW)
    const linesPerPg = Math.floor(contentH / lineHeight)

    let lineIdx = 0
    while (lineIdx < lines.length) {
      const page = pdfDoc.addPage([width, height])
      let y = height - margins.top - fontSize
      for (let i = 0; i < linesPerPg && lineIdx < lines.length; i++) {
        page.drawText(lines[lineIdx], { x: margins.left, y, size: fontSize, font, color: rgb(0, 0, 0) })
        y -= lineHeight
        lineIdx++
      }
    }
    if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([width, height])

    return {
      buffer:         Buffer.from(await pdfDoc.save()),
      pageCount:      pdfDoc.getPageCount(),
      originalFormat: 'html',
      engine:         'pdf-lib',
    }
  }

  // ── PDF → Word ────────────────────────────────────────────────────────

  /**
   * Convert a PDF document to a Word document (.docx).
   * Uses LibreOffice headless: soffice --convert-to docx input.pdf
   * Preserves text, basic layout, and embedded fonts when possible.
   */
  async pdfToWord(pdfBuffer: Buffer): Promise<ConversionResult> {
    if (!isPdf(pdfBuffer)) {
      throw new Error('File is not a valid PDF')
    }

    if (await binaryExists('soffice')) {
      return withTempDir('lo-pdf-word-', async (dir) => {
        const inFile  = join(dir, 'input.pdf')
        const outFile = join(dir, 'input.docx')
        await writeFile(inFile, pdfBuffer)

        // ── Fast path: pdf2docx (pure Python, no LibreOffice startup) ──────────
        try {
          const pdf2docxOk = await runPdf2Docx(inFile, outFile, 90_000)
          if (pdf2docxOk && existsSync(outFile)) {
            const docxBuffer = await fsReadFile(outFile)
            if (docxBuffer.length >= 100) {
              let pageCount = 1
              try {
                const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
                pageCount = pdfDoc.getPageCount()
              } catch { /* best-effort */ }
              return { buffer: docxBuffer, pageCount, originalFormat: 'pdf', engine: 'pdf2docx' }
            }
          }
        } catch { /* fall through to LibreOffice */ }

        // ── Slow path: cold soffice spawn (fallback) ─────────────────────────
        const result = await runCli(
          'soffice',
          [
            '--headless',
            '--norestore',
            '--nofirststartwizard',
            '--infilter=writer_pdf_import',
            '--convert-to', 'docx',
            '--outdir', dir,
            inFile,
          ],
          {
            timeoutMs: 120_000,
            env: { HOME: dir, TMPDIR: dir, SAL_USE_VCLPLUGIN: 'svp' },
          }
        )

        if (result.code !== 0) {
          throw new Error(
            `LibreOffice exited ${result.code}: ${(result.stderr || result.stdout).trim().slice(0, 400)}`
          )
        }

        const docxBuffer = await fsReadFile(outFile)

        if (docxBuffer.length < 4) {
          throw new Error('LibreOffice produced an empty or invalid Word file')
        }

        let pageCount = 1
        try {
          const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
          pageCount = pdfDoc.getPageCount()
        } catch { /* best-effort */ }

        return { buffer: docxBuffer, pageCount, originalFormat: 'pdf', engine: 'libreoffice' }
      })
    }

    throw new Error(
      'LibreOffice (soffice) is required to convert PDF to Word. ' +
      'Please ensure it is installed on the server.'
    )
  }

  // ── PDF → PowerPoint ──────────────────────────────────────────────────

  /**
   * Convert a PDF document to a PowerPoint presentation (.pptx).
   * Uses LibreOffice headless: soffice --convert-to pptx input.pdf
   * Each PDF page is rendered as a slide in the output presentation.
   */
  async pdfToPresentation(
    pdfBuffer: Buffer
  ): Promise<ConversionResult> {
    if (!isPdf(pdfBuffer)) {
      throw new Error('File is not a valid PDF')
    }

    if (await binaryExists('soffice')) {
      return withTempDir('lo-pdf-ppt-', async (dir) => {
        const inFile = join(dir, 'input.pdf')
        await writeFile(inFile, pdfBuffer)

        const result = await runCli(
          'soffice',
          [
            '--headless',
            '--norestore',
            '--nofirststartwizard',
            '--convert-to', 'pptx',
            '--outdir', dir,
            inFile,
          ],
          {
            timeoutMs: 120_000,
            env: { HOME: dir, TMPDIR: dir, SAL_USE_VCLPLUGIN: 'svp' },
          }
        )

        if (result.code !== 0) {
          throw new Error(
            `LibreOffice exited ${result.code}: ${(result.stderr || result.stdout).trim().slice(0, 400)}`
          )
        }

        const outFile = join(dir, 'input.pptx')
        const pptxBuffer = await fsReadFile(outFile)

        if (pptxBuffer.length < 4) {
          throw new Error('LibreOffice produced an empty or invalid PowerPoint file')
        }

        // Estimate slide count from page count of source PDF
        let pageCount = 1
        try {
          const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
          pageCount = pdfDoc.getPageCount()
        } catch { /* best-effort */ }

        return {
          buffer:         pptxBuffer,
          pageCount,
          originalFormat: 'pdf',
          engine:         'libreoffice',
        }
      })
    }

    throw new Error(
      'LibreOffice (soffice) is required to convert PDF to PowerPoint. ' +
      'Please ensure it is installed on the server.'
    )
  }

  // ── Plain text → PDF ──────────────────────────────────────────────────

  async textToPdf(
    text: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const pdfDoc = await PDFDocument.create()
    const font   = await this.getFont(pdfDoc, options.fontFamily || 'courier')

    const pageSize    = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width  = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width  : pageSize.height
    const margins = {
      top:    options.margins?.top    ?? 72,
      bottom: options.margins?.bottom ?? 72,
      left:   options.margins?.left   ?? 72,
      right:  options.margins?.right  ?? 72,
    }
    const fontSize   = options.fontSize ?? 10
    const lineHeight = fontSize * 1.4
    const contentW   = width  - margins.left - margins.right
    const contentH   = height - margins.top  - margins.bottom

    const paragraphs = text.split('\n')
    const lines: string[] = []
    for (const para of paragraphs) {
      if (para.trim() === '') { lines.push('') } else {
        lines.push(...this.wrapText(para, font, fontSize, contentW))
      }
    }

    const linesPerPg = Math.floor(contentH / lineHeight)
    let lineIdx = 0
    while (lineIdx < lines.length) {
      const page = pdfDoc.addPage([width, height])
      let y = height - margins.top - fontSize
      for (let i = 0; i < linesPerPg && lineIdx < lines.length; i++) {
        if (lines[lineIdx]) {
          page.drawText(lines[lineIdx], { x: margins.left, y, size: fontSize, font, color: rgb(0, 0, 0) })
        }
        y -= lineHeight
        lineIdx++
      }
    }
    if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([width, height])

    return {
      buffer:         Buffer.from(await pdfDoc.save()),
      pageCount:      pdfDoc.getPageCount(),
      originalFormat: 'txt',
      engine:         'pdf-lib',
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private async getFont(
    pdfDoc: PDFDocument,
    family: 'helvetica' | 'times' | 'courier' = 'helvetica',
    bold = false
  ): Promise<PDFFont> {
    const fonts: Record<string, StandardFonts> = {
      helvetica: bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
      times:     bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
      courier:   bold ? StandardFonts.CourierBold : StandardFonts.Courier,
    }
    return pdfDoc.embedFont(fonts[family] || StandardFonts.Helvetica)
  }

  /**
   * Wrap text to fit within a given width using binary search for long words.
   */
  private wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''

    const fits    = (s: string) => font.widthOfTextAtSize(s, fontSize) <= maxWidth
    const fitPfx  = (str: string): string => {
      let lo = 1, hi = str.length, last = 0
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (fits(str.substring(0, mid))) { last = mid; lo = mid + 1 } else { hi = mid - 1 }
      }
      return str.substring(0, Math.max(last, 1))
    }

    for (const word of words) {
      if (!word) continue
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (fits(testLine)) {
        currentLine = testLine
      } else {
        if (currentLine) lines.push(currentLine)
        if (!fits(word)) {
          let remaining = word
          while (remaining) { const part = fitPfx(remaining); lines.push(part); remaining = remaining.slice(part.length) }
          currentLine = ''
        } else {
          currentLine = word
        }
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines.length > 0 ? lines : ['']
  }

  private stripHtml(html: string): string {
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
    text = text.replace(/<br[^>]*\/?>/gi, '\n')
    text = text.replace(/<[^>]+>/g, '')
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    text = text.replace(/\n\s*\n/g, '\n\n').trim()
    return text
  }
}

export const documentConverter = new DocumentConverter()
