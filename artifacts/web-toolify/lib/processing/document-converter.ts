/**
 * Document Converter
 *
 * Converts Word, Excel, and HTML to PDF using the best available engine.
 *
 * ENGINE PRIORITY
 * ───────────────
 * Word (.docx/.doc)  → LibreOffice headless → fallback: mammoth + pdf-lib
 * Excel (.xlsx/.xls) → LibreOffice headless → fallback: xlsx + pdf-lib
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
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'

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
   * Primary: LibreOffice headless  →  Fallback: mammoth text extraction + pdf-lib
   */
  async wordToPdf(
    docxBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // Detect format from magic bytes rather than relying on extension
    const isDocx = docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b // PK = ZIP = .docx
    const inputExt = isDocx ? '.docx' : '.doc'

    if (await binaryExists('soffice')) {
      try {
        return await this.libreOfficeConvert(docxBuffer, inputExt, 'docx')
      } catch (err) {
        console.warn(
          '[DocumentConverter] LibreOffice Word→PDF failed, using fallback:',
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    return this.wordToPdfFallback(docxBuffer, options)
  }

  /** LibreOffice headless conversion (Word / Excel → PDF) */
  private async libreOfficeConvert(
    inputBuffer: Buffer,
    inputExt: string,
    originalFormat: string
  ): Promise<ConversionResult> {
    return withTempDir('lo-conv-', async (dir) => {
      const inFile = join(dir, `input${inputExt}`)
      await writeFile(inFile, inputBuffer)

      // LibreOffice writes a .pdf alongside the input file in --outdir.
      // Set HOME + TMPDIR inside the temp dir so LO doesn't try to create
      // a user profile in a read-only location.
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

      // LO names the output file after the input — always 'input.pdf'
      const outFile = join(dir, 'input.pdf')
      const pdfBuffer = await fsReadFile(outFile)

      if (!isPdf(pdfBuffer)) {
        throw new Error('LibreOffice produced an invalid or empty PDF')
      }

      // Get page count without decryption
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

  // ── Excel → PDF ───────────────────────────────────────────────────────

  /**
   * Convert an Excel spreadsheet (.xlsx / .xls / .csv) to PDF.
   * Primary: LibreOffice headless  →  Fallback: xlsx + pdf-lib table renderer
   */
  async excelToPdf(
    xlsxBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // XLSX magic: PK (ZIP). XLS: 0xD0 0xCF 0x11 0xE0 (OLE). CSV: text.
    const isXlsx = xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b
    const isXls  = xlsxBuffer[0] === 0xd0 && xlsxBuffer[1] === 0xcf
    const inputExt = isXlsx ? '.xlsx' : isXls ? '.xls' : '.csv'

    if (await binaryExists('soffice')) {
      try {
        return await this.libreOfficeConvert(xlsxBuffer, inputExt, inputExt.slice(1))
      } catch (err) {
        console.warn(
          '[DocumentConverter] LibreOffice Excel→PDF failed, using fallback:',
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    return this.excelToPdfFallback(xlsxBuffer, options)
  }

  /** Fallback: xlsx.js table parser + pdf-lib */
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

      page.drawText(`Sheet: ${sheetName}`, {
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
          const cellText  = cellValue != null ? String(cellValue).substring(0, 30) : ''
          const x         = margins.left + colIndex * colWidth
          page.drawRectangle({
            x, y: y - rowHeight, width: colWidth, height: rowHeight,
            borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5,
          })
          if (cellText) {
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
