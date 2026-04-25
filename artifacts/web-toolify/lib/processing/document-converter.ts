/**
 * Document Converter
 * Converts various document formats to PDF
 * Supports: Word (.docx), Excel (.xlsx), HTML
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'

export interface ConversionOptions {
  pageSize?: 'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
  fontSize?: number
  fontFamily?: 'helvetica' | 'times' | 'courier'
}

export interface ConversionResult {
  buffer: Buffer
  pageCount: number
  originalFormat: string
}

// Page dimensions in points (72 points = 1 inch)
const PAGE_SIZES = {
  a4: { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
}

export class DocumentConverter {
  /**
   * Convert Word document (.docx) to PDF
   */
  async wordToPdf(
    docxBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // Extract text and basic formatting from Word document
    const result = await mammoth.extractRawText({ buffer: docxBuffer })
    const text = result.value

    // Also try to get HTML for better formatting
    let html = ''
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer: docxBuffer })
      html = htmlResult.value
    } catch {
      // Use plain text if HTML conversion fails
    }

    // Create PDF with extracted content
    const pdfDoc = await PDFDocument.create()
    const font = await this.getFont(pdfDoc, options.fontFamily || 'helvetica')
    
    const pageSize = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width : pageSize.height

    const margins = {
      top: options.margins?.top ?? 72,
      bottom: options.margins?.bottom ?? 72,
      left: options.margins?.left ?? 72,
      right: options.margins?.right ?? 72,
    }

    const fontSize = options.fontSize ?? 12
    const lineHeight = fontSize * 1.5
    const contentWidth = width - margins.left - margins.right
    const contentHeight = height - margins.top - margins.bottom

    // Split text into lines that fit the page width
    const lines = this.wrapText(text, font, fontSize, contentWidth)

    // Calculate lines per page
    const linesPerPage = Math.floor(contentHeight / lineHeight)

    // Create pages and add text
    let lineIndex = 0
    while (lineIndex < lines.length) {
      const page = pdfDoc.addPage([width, height])
      let y = height - margins.top - fontSize

      for (let i = 0; i < linesPerPage && lineIndex < lines.length; i++) {
        page.drawText(lines[lineIndex], {
          x: margins.left,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
        y -= lineHeight
        lineIndex++
      }
    }

    // Ensure at least one page
    if (pdfDoc.getPageCount() === 0) {
      pdfDoc.addPage([width, height])
    }

    const pdfBytes = await pdfDoc.save()

    return {
      buffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
      originalFormat: 'docx',
    }
  }

  /**
   * Convert Excel spreadsheet (.xlsx) to PDF
   */
  async excelToPdf(
    xlsxBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // Parse Excel file
    const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' })
    
    const pdfDoc = await PDFDocument.create()
    const font = await this.getFont(pdfDoc, options.fontFamily || 'helvetica')
    const boldFont = await this.getFont(pdfDoc, options.fontFamily || 'helvetica', true)

    const pageSize = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width : pageSize.height

    const margins = {
      top: options.margins?.top ?? 50,
      bottom: options.margins?.bottom ?? 50,
      left: options.margins?.left ?? 40,
      right: options.margins?.right ?? 40,
    }

    const fontSize = options.fontSize ?? 10
    const headerFontSize = 12
    const cellPadding = 4
    const rowHeight = fontSize + cellPadding * 2

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown[][]

      if (jsonData.length === 0) continue

      // Calculate column widths
      const maxCols = Math.max(...jsonData.map((row) => (row as unknown[]).length))
      const availableWidth = width - margins.left - margins.right
      const colWidth = Math.min(availableWidth / maxCols, 150)

      // Add sheet name as header on first page
      let page = pdfDoc.addPage([width, height])
      let y = height - margins.top

      // Draw sheet name
      page.drawText(`Sheet: ${sheetName}`, {
        x: margins.left,
        y,
        size: headerFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      })
      y -= headerFontSize + 10

      // Draw table
      for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex] as unknown[]

        // Check if we need a new page
        if (y - rowHeight < margins.bottom) {
          page = pdfDoc.addPage([width, height])
          y = height - margins.top
        }

        // Draw row
        for (let colIndex = 0; colIndex < maxCols; colIndex++) {
          const cellValue = row[colIndex]
          const cellText = cellValue != null ? String(cellValue).substring(0, 30) : ''
          const x = margins.left + colIndex * colWidth

          // Draw cell border
          page.drawRectangle({
            x,
            y: y - rowHeight,
            width: colWidth,
            height: rowHeight,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5,
          })

          // Draw cell text
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

    // Ensure at least one page
    if (pdfDoc.getPageCount() === 0) {
      pdfDoc.addPage([width, height])
    }

    const pdfBytes = await pdfDoc.save()

    return {
      buffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
      originalFormat: 'xlsx',
    }
  }

  /**
   * Convert HTML to PDF
   */
  async htmlToPdf(
    html: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // Parse HTML and extract text content
    // For a full implementation, you'd use puppeteer or playwright
    const text = this.stripHtml(html)

    const pdfDoc = await PDFDocument.create()
    const font = await this.getFont(pdfDoc, options.fontFamily || 'helvetica')

    const pageSize = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width : pageSize.height

    const margins = {
      top: options.margins?.top ?? 72,
      bottom: options.margins?.bottom ?? 72,
      left: options.margins?.left ?? 72,
      right: options.margins?.right ?? 72,
    }

    const fontSize = options.fontSize ?? 12
    const lineHeight = fontSize * 1.5
    const contentWidth = width - margins.left - margins.right
    const contentHeight = height - margins.top - margins.bottom

    // Split text into lines
    const lines = this.wrapText(text, font, fontSize, contentWidth)
    const linesPerPage = Math.floor(contentHeight / lineHeight)

    // Create pages
    let lineIndex = 0
    while (lineIndex < lines.length) {
      const page = pdfDoc.addPage([width, height])
      let y = height - margins.top - fontSize

      for (let i = 0; i < linesPerPage && lineIndex < lines.length; i++) {
        page.drawText(lines[lineIndex], {
          x: margins.left,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
        y -= lineHeight
        lineIndex++
      }
    }

    // Ensure at least one page
    if (pdfDoc.getPageCount() === 0) {
      pdfDoc.addPage([width, height])
    }

    const pdfBytes = await pdfDoc.save()

    return {
      buffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
      originalFormat: 'html',
    }
  }

  /**
   * Convert text file to PDF
   */
  async textToPdf(
    text: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const pdfDoc = await PDFDocument.create()
    const font = await this.getFont(pdfDoc, options.fontFamily || 'courier')

    const pageSize = PAGE_SIZES[options.pageSize || 'a4']
    const isLandscape = options.orientation === 'landscape'
    const width = isLandscape ? pageSize.height : pageSize.width
    const height = isLandscape ? pageSize.width : pageSize.height

    const margins = {
      top: options.margins?.top ?? 72,
      bottom: options.margins?.bottom ?? 72,
      left: options.margins?.left ?? 72,
      right: options.margins?.right ?? 72,
    }

    const fontSize = options.fontSize ?? 10
    const lineHeight = fontSize * 1.4
    const contentWidth = width - margins.left - margins.right
    const contentHeight = height - margins.top - margins.bottom

    // Split by newlines first, then wrap long lines
    const paragraphs = text.split('\n')
    const lines: string[] = []
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('')
      } else {
        lines.push(...this.wrapText(paragraph, font, fontSize, contentWidth))
      }
    }

    const linesPerPage = Math.floor(contentHeight / lineHeight)

    let lineIndex = 0
    while (lineIndex < lines.length) {
      const page = pdfDoc.addPage([width, height])
      let y = height - margins.top - fontSize

      for (let i = 0; i < linesPerPage && lineIndex < lines.length; i++) {
        if (lines[lineIndex]) {
          page.drawText(lines[lineIndex], {
            x: margins.left,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          })
        }
        y -= lineHeight
        lineIndex++
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      pdfDoc.addPage([width, height])
    }

    const pdfBytes = await pdfDoc.save()

    return {
      buffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
      originalFormat: 'txt',
    }
  }

  /**
   * Get font for PDF
   */
  private async getFont(
    pdfDoc: PDFDocument,
    family: 'helvetica' | 'times' | 'courier' = 'helvetica',
    bold: boolean = false
  ): Promise<PDFFont> {
    const fonts: Record<string, typeof StandardFonts.Helvetica> = {
      'helvetica': bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
      'times': bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
      'courier': bold ? StandardFonts.CourierBold : StandardFonts.Courier,
    }

    return pdfDoc.embedFont(fonts[family] || StandardFonts.Helvetica)
  }

  /**
   * Wrap text to fit within a given width.
   * Uses binary search when a word is too wide, reducing calls to widthOfTextAtSize
   * from O(n) per word to O(log n).
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

    const fits = (s: string) => font.widthOfTextAtSize(s, fontSize) <= maxWidth

    // Binary-search the largest prefix of `str` that fits within maxWidth
    const fitPrefix = (str: string): string => {
      let lo = 1
      let hi = str.length
      let last = 0
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (fits(str.substring(0, mid))) {
          last = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
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
          // Word itself is too long — break it with binary search
          let remaining = word
          while (remaining) {
            const part = fitPrefix(remaining)
            lines.push(part)
            remaining = remaining.substring(part.length)
          }
          currentLine = ''
        } else {
          currentLine = word
        }
      }
    }

    if (currentLine) lines.push(currentLine)

    return lines.length > 0 ? lines : ['']
  }

  /**
   * Strip HTML tags and decode entities
   */
  private stripHtml(html: string): string {
    // Remove script and style tags with their content
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // Replace common block elements with newlines
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
    text = text.replace(/<br[^>]*\/?>/gi, '\n')
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '')
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    text = text.replace(/&#39;/g, "'")
    
    // Normalize whitespace
    text = text.replace(/\n\s*\n/g, '\n\n')
    text = text.trim()
    
    return text
  }
}

// Export singleton instance
export const documentConverter = new DocumentConverter()
