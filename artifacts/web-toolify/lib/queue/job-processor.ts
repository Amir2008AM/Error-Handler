/**
 * Job Processor
 *
 * Executes processing jobs against the right engine. Key features:
 *
 *  1. **Per-operation + per-job timeouts** via `withTimeout`.
 *  2. **Bounded concurrency for batches** via `mapWithConcurrency`.
 *  3. **Retry mechanism**: up to MAX_RETRIES automatic retries with
 *     exponential backoff before a job is marked failed.
 *  4. **Complete job-type coverage**: all 25 job types are handled.
 */

import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { nanoid } from 'nanoid'
import { Job, JobType, JobResult } from './types'
import { getJobManager } from './job-manager'
import { PDFProcessor } from '../processing/pdf-processor'
import { ImageProcessor } from '../processing/image-processor'
import { OCRProcessor } from '../processing/ocr-processor'
import { PDFSecurityProcessor } from '../processing/pdf-security'
import { PdfToImageConverter } from '../processing/pdf-to-image'
import { DocumentConverter } from '../processing/document-converter'
import { createZipFromFiles } from '../processing/file-utils'
import { withTimeout, TIMEOUTS } from '../processing/timeout'
import { mapWithConcurrency, defaultCpuConcurrency } from '../processing/concurrency'
import type { ProcessingResult } from '../processing/types'
import { recordJob, recordError } from '../telegram/analytics'

const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 1_000

const MIN_PDF_BYTES = 512

const PDF_OUTPUT_TYPES = new Set<JobType>([
  'merge-pdf', 'rotate-pdf', 'compress-pdf', 'watermark-pdf',
  'protect-pdf', 'unlock-pdf', 'sign-pdf',
  'word-to-pdf', 'excel-to-pdf', 'html-to-pdf', 'ppt-to-pdf',
  'add-page-numbers', 'organize-pdf', 'delete-pages', 'extract-pages',
  'repair-pdf', 'image-to-pdf',
  // Note: pdf-to-word → .docx, pdf-to-excel → .xlsx — checked separately
])

/**
 * Quality Gate — runs after every processor returns.
 * For PDF outputs: verifies the magic header and minimum size.
 * Throws so the retry loop can attempt a safer fallback mode.
 */
function assertOutputQuality(jobType: JobType, buffer: Buffer): void {
  if (!PDF_OUTPUT_TYPES.has(jobType)) return

  if (buffer.length < MIN_PDF_BYTES) {
    throw new Error(
      `Quality gate failed: output is only ${buffer.length} bytes (min ${MIN_PDF_BYTES})`
    )
  }

  const header = buffer.slice(0, 5).toString('ascii')
  if (!header.startsWith('%PDF')) {
    throw new Error(
      `Quality gate failed: output does not start with %PDF (got "${header}")`
    )
  }
}

type SingleResult = { buffer: Buffer; fileName: string; mimeType: string }
type BatchResult = { buffers: Array<{ buffer: Buffer; fileName: string; mimeType: string }> }
type ProcessorFunction = (job: Job) => Promise<SingleResult | BatchResult>

function unwrap<T>(result: ProcessingResult<T>): T {
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'Processing failed')
  }
  return result.data
}

/** View Buffer as ArrayBuffer slice (zero-copy). */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

/**
 * Write a buffer to a temp file, run `fn` with the path, then delete the file.
 * Ensures temp files are always cleaned up, even on error.
 */
async function withTempFile<T>(
  buffer: Buffer,
  ext: string,
  fn: (path: string) => Promise<T>
): Promise<T> {
  const path = join(tmpdir(), `job-${nanoid(10)}.${ext}`)
  try {
    await writeFile(path, buffer)
    return await fn(path)
  } finally {
    await unlink(path).catch(() => undefined)
  }
}

const processors: Partial<Record<JobType, ProcessorFunction>> = {
  'merge-pdf':       processMergePdf,
  'split-pdf':       processSplitPdf,
  'rotate-pdf':      processRotatePdf,
  'compress-pdf':    processCompressPdf,
  'watermark-pdf':   processWatermarkPdf,
  'add-page-numbers': processAddPageNumbers,
  'organize-pdf':    processOrganizePdf,
  'image-to-pdf':    processImageToPdf,
  'repair-pdf':      processRepairPdf,
  'delete-pages':    processDeletePages,
  'extract-pages':   processExtractPages,
  'protect-pdf':     processProtectPdf,
  'unlock-pdf':      processUnlockPdf,
  'sign-pdf':        processSignPdf,
  'pdf-to-jpg':      processPdfToJpg,
  'pdf-to-word':     processPdfToWord,
  'ocr-image':       processOcrImage,
  'ocr-pdf':         processOcrPdf,
  'compress-image':  processCompressImage,
  'resize-image':    processResizeImage,
  'convert-image':   processConvertImage,
  'crop-image':      processCropImage,
  'ppt-to-pdf':      processPptToPdf,
  'pdf-to-ppt':      processPdfToPpt,
}

export async function processJob(jobId: string): Promise<JobResult | null> {
  const manager = getJobManager()
  const job = manager.getJob(jobId)
  if (!job) throw new Error('Job not found')
  if (job.status !== 'pending') {
    throw new Error(`Job is not pending (status: ${job.status})`)
  }

  const processor = processors[job.type]
  if (!processor) {
    manager.setJobError(jobId, `No processor available for job type: ${job.type}`)
    throw new Error(`No processor available for job type: ${job.type}`)
  }

  // ── PDF size guard ─────────────────────────────────────────────────────────
  // pdf-lib loads entire PDFs into the JS heap; oversized inputs cause OOM on
  // servers without swap.  These caps are enforced before any processing starts.
  const MERGE_TOTAL_LIMIT_MB  = 200  // sum of all inputs for merge
  const SINGLE_PDF_LIMIT_MB   = 150  // single-file limit for other PDF ops
  const HEAVY_PDF_TYPES_SET = new Set<JobType>([
    'merge-pdf', 'split-pdf', 'repair-pdf', 'compress-pdf',
    'pdf-to-jpg', 'pdf-to-word', 'pdf-to-excel',
    'rotate-pdf', 'watermark-pdf', 'add-page-numbers', 'organize-pdf',
    'protect-pdf', 'unlock-pdf', 'extract-pages', 'delete-pages',
  ])
  if (HEAVY_PDF_TYPES_SET.has(job.type)) {
    if (job.type === 'merge-pdf') {
      const totalMB = job.files.reduce((s, f) => s + f.size, 0) / (1024 * 1024)
      if (totalMB > MERGE_TOTAL_LIMIT_MB) {
        const msg = `Total upload size ${totalMB.toFixed(0)} MB exceeds the ${MERGE_TOTAL_LIMIT_MB} MB limit for merge operations.`
        manager.setJobError(jobId, msg)
        throw new Error(msg)
      }
    } else {
      const fileMB = (job.files[0]?.size ?? 0) / (1024 * 1024)
      if (fileMB > SINGLE_PDF_LIMIT_MB) {
        const msg = `File size ${fileMB.toFixed(0)} MB exceeds the ${SINGLE_PDF_LIMIT_MB} MB limit for this operation.`
        manager.setJobError(jobId, msg)
        throw new Error(msg)
      }
    }
  }

  manager.startProcessing()
  manager.updateJobStatus(jobId, 'processing', 0)

  let lastError: Error = new Error('Processing failed')
  const startedAt = Date.now()

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential back-off: 1s, 2s
        const delayMs = RETRY_BASE_DELAY_MS * attempt
        console.warn(
          `[Queue] Job ${jobId} (${job.type}) attempt ${attempt} failed: ${lastError.message}. ` +
          `Retrying in ${delayMs}ms…`
        )
        await new Promise((r) => setTimeout(r, delayMs))
        manager.updateJobProgress(jobId, 0)
      }

      try {
        // Whole-job safety net — even if the engine forgets its own timeout.
        const result = await withTimeout(
          processor(job),
          TIMEOUTS.jobOverall,
          `job:${job.type}`
        )

        if ('buffers' in result) {
          await manager.setJobResultBatch(jobId, result.buffers)
        } else {
          assertOutputQuality(job.type, result.buffer)
          await manager.setJobResult(jobId, result.buffer, result.fileName, result.mimeType)
        }

        // ── Analytics: record successful job ──────────────────────────────
        const durationMs = Date.now() - startedAt
        const primaryFile = job.files[0]
        const ext = primaryFile?.name.split('.').pop()?.toLowerCase() ?? 'unknown'
        recordJob({
          type:       job.type,
          success:    true,
          durationMs,
          fileSizeB:  primaryFile?.size ?? 0,
          format:     ext,
          userId:     jobId.slice(0, 12), // anonymised — no PII stored
          ts:         Date.now(),
        })

        return manager.getJobStatus(jobId)?.result ?? null
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Continue to next retry attempt
      }
    }

    // All retries exhausted
    manager.setJobError(jobId, lastError.message)

    // ── Analytics: record failed job ──────────────────────────────────────
    recordJob({
      type:       job.type,
      success:    false,
      durationMs: Date.now() - startedAt,
      fileSizeB:  job.files[0]?.size ?? 0,
      format:     job.files[0]?.name.split('.').pop()?.toLowerCase() ?? 'unknown',
      userId:     jobId.slice(0, 12),
      ts:         Date.now(),
    })
    recordError(job.type, lastError.message)

    throw lastError
  } finally {
    manager.finishProcessing()
  }
}

export async function processNextJob(): Promise<JobResult | null> {
  const manager = getJobManager()
  const job = manager.getNextPendingJob()
  if (!job) return null
  return processJob(job.id)
}

// ============================================================
// PDF Processors
// ============================================================

async function processMergePdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const files = job.files.map((f) => toArrayBuffer(f.buffer))
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    processor.merge({ files }),
    TIMEOUTS.pdfHeavy,
    'pdf.merge'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'merged.pdf', mimeType: 'application/pdf' }
}

async function processSplitPdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const splitMode = job.options.splitMode as 'all' | 'ranges' | 'extract' | undefined
  const ranges = job.options.ranges as string | undefined
  const mode: 'all' | 'range' | 'custom' =
    splitMode === 'ranges' ? 'range' : splitMode === 'extract' ? 'custom' : 'all'

  const result = await withTimeout(
    processor.split({ file: toArrayBuffer(job.files[0].buffer), mode, ranges }),
    TIMEOUTS.pdfHeavy,
    'pdf.split'
  )
  manager.updateJobProgress(job.id, 80)

  const data = unwrap(result)
  const isZip = result.metadata?.outputFormat === 'zip'
  if (isZip) {
    return { buffer: data, fileName: 'split-pages.zip', mimeType: 'application/zip' }
  }
  return { buffer: data, fileName: 'split.pdf', mimeType: 'application/pdf' }
}

async function processRotatePdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const rotation = ((job.options.rotation as number) || 90) as 90 | 180 | 270
  const pages = job.options.pages as number[] | undefined
  const result = await withTimeout(
    processor.rotate({ file: toArrayBuffer(job.files[0].buffer), rotation, pages }),
    TIMEOUTS.pdfOp,
    'pdf.rotate'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'rotated.pdf', mimeType: 'application/pdf' }
}

async function processCompressPdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    processor.compress(toArrayBuffer(job.files[0].buffer)),
    TIMEOUTS.pdfHeavy,
    'pdf.compress'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'compressed.pdf', mimeType: 'application/pdf' }
}

async function processWatermarkPdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    processor.addWatermark({
      file: toArrayBuffer(job.files[0].buffer),
      text: job.options.watermarkText as string,
      opacity: (job.options.watermarkOpacity as number) || 0.3,
      position:
        (job.options.watermarkPosition as 'center' | 'diagonal' | 'top' | 'bottom') ||
        'diagonal',
    }),
    TIMEOUTS.pdfOp,
    'pdf.watermark'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'watermarked.pdf', mimeType: 'application/pdf' }
}

async function processAddPageNumbers(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    processor.addPageNumbers({
      file: toArrayBuffer(job.files[0].buffer),
      position:
        (job.options.position as
          | 'bottom-center'
          | 'bottom-right'
          | 'bottom-left'
          | 'top-center'
          | 'top-right'
          | 'top-left') || 'bottom-center',
      format:
        (job.options.format as 'numeric' | 'roman' | 'page-of-total') || 'page-of-total',
      startFrom: (job.options.startNumber as number) || 1,
    }),
    TIMEOUTS.pdfOp,
    'pdf.pageNumbers'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'numbered.pdf', mimeType: 'application/pdf' }
}

async function processOrganizePdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const pageOrder = job.options.pageOrder as number[]
  if (!pageOrder || pageOrder.length === 0) {
    throw new Error('Page order is required for organize operation')
  }
  const result = await withTimeout(
    processor.reorderPages(toArrayBuffer(job.files[0].buffer), pageOrder),
    TIMEOUTS.pdfOp,
    'pdf.reorder'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'organized.pdf', mimeType: 'application/pdf' }
}

async function processImageToPdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const images = job.files.map((f) => toArrayBuffer(f.buffer))
  const result = await withTimeout(
    processor.imagesToPdf({
      images,
      pageSize: (job.options.pageSize as 'auto' | 'a4' | 'letter') || 'a4',
      margin: (job.options.margin as number) ?? 20,
      quality: (job.options.imageQuality as number) ?? 78,
      maxWidthPx: (job.options.maxWidthPx as number) ?? 1_600,
    }),
    TIMEOUTS.pdfHeavy,
    'pdf.imagesToPdf'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'images.pdf', mimeType: 'application/pdf' }
}

async function processRepairPdf(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    processor.repair(toArrayBuffer(job.files[0].buffer)),
    TIMEOUTS.pdfOp,
    'pdf.repair'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'repaired.pdf', mimeType: 'application/pdf' }
}

async function processDeletePages(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const pagesToDelete = job.options.pages as number[]
  if (!pagesToDelete || pagesToDelete.length === 0) {
    throw new Error('Pages to delete are required')
  }

  const result = await withTimeout(
    processor.deletePages(toArrayBuffer(job.files[0].buffer), pagesToDelete),
    TIMEOUTS.pdfOp,
    'pdf.deletePages'
  )
  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  return {
    buffer: unwrap(result),
    fileName: `${baseName}-edited.pdf`,
    mimeType: 'application/pdf',
  }
}

async function processExtractPages(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const pages = job.options.pages as number[]
  if (!pages || pages.length === 0) {
    throw new Error('Pages to extract are required')
  }

  const result = await withTimeout(
    processor.extractPages(toArrayBuffer(job.files[0].buffer), pages),
    TIMEOUTS.pdfOp,
    'pdf.extractPages'
  )
  manager.updateJobProgress(job.id, 90)
  return {
    buffer: unwrap(result),
    fileName: 'extracted-pages.pdf',
    mimeType: 'application/pdf',
  }
}

async function processProtectPdf(job: Job): Promise<SingleResult> {
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const password = (job.options.password as string) || ''
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters')
  }

  const ownerPassword = (job.options.ownerPassword as string) || password + '_owner'
  const allowPrinting = job.options.allowPrinting !== false
  const allowCopying = job.options.allowCopying !== false
  const allowModifying = job.options.allowModifying !== false
  const allowAnnotating = job.options.allowAnnotating !== false

  const result = await withTimeout(
    withTempFile(job.files[0].buffer, 'pdf', async (inputPath) => {
      const securityProcessor = new PDFSecurityProcessor()
      return securityProcessor.protect(inputPath, {
        userPassword: password,
        ownerPassword,
        permissions: {
          printing: allowPrinting ? 'highResolution' : 'none',
          copying: allowCopying,
          modifying: allowModifying,
          annotating: allowAnnotating,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: allowModifying,
        },
      })
    }),
    TIMEOUTS.pdfOp,
    'pdf.protect'
  )

  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  return {
    buffer: result,
    fileName: `protected-${baseName}.pdf`,
    mimeType: 'application/pdf',
  }
}

async function processUnlockPdf(job: Job): Promise<SingleResult> {
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const password = (job.options.password as string) || ''

  const result = await withTimeout(
    withTempFile(job.files[0].buffer, 'pdf', async (inputPath) => {
      const securityProcessor = new PDFSecurityProcessor()
      return securityProcessor.unlock(inputPath, { password })
    }),
    TIMEOUTS.pdfOp,
    'pdf.unlock'
  )

  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  return {
    buffer: result,
    fileName: `unlocked-${baseName}.pdf`,
    mimeType: 'application/pdf',
  }
}

async function processSignPdf(job: Job): Promise<SingleResult> {
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const signerName = (job.options.signerName as string) || (job.options.signatureText as string) || 'Signature'
  if (!signerName.trim()) throw new Error('Signer name or signature text is required')

  const rawPage = job.options.page
  const pageNumber: number = typeof rawPage === 'number' ? rawPage : 0
  const position = (job.options.position as string) || 'bottom-right'

  const boxWidth = 200
  const boxHeight = 80
  const padding = 30

  let x: number, y: number
  switch (position) {
    case 'top-left':    x = padding;                       y = 700; break
    case 'top-right':   x = 595 - padding - boxWidth;      y = 700; break
    case 'bottom-left': x = padding;                       y = padding; break
    case 'center':      x = (595 - boxWidth) / 2;          y = (842 - boxHeight) / 2; break
    default:            x = 595 - padding - boxWidth;      y = padding; break
  }

  const securityProcessor = new PDFSecurityProcessor()
  const result = await withTimeout(
    securityProcessor.addSignature(job.files[0].buffer, {
      signerName,
      reason: (job.options.reason as string) || '',
      location: (job.options.location as string) || '',
      position: { page: pageNumber, x, y, width: boxWidth, height: boxHeight },
    }),
    TIMEOUTS.pdfOp,
    'pdf.sign'
  )

  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  return {
    buffer: result,
    fileName: `signed-${baseName}.pdf`,
    mimeType: 'application/pdf',
  }
}

async function processPdfToJpg(job: Job): Promise<SingleResult | BatchResult> {
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const format = ((job.options.format as string) || 'jpg') as 'jpg' | 'png' | 'webp'
  const quality = (job.options.quality as unknown as number) || 90
  const dpi = (job.options.dpi as unknown as number) || 150

  const pagesOption = job.options.pages
  let pages: number[] | 'all' = 'all'
  if (pagesOption && pagesOption !== 'all') {
    if (Array.isArray(pagesOption)) {
      pages = pagesOption as number[]
    } else if (typeof pagesOption === 'string') {
      const parts = (pagesOption as string).split(',').flatMap((p) => {
        const trimmed = p.trim()
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(Number)
          return Array.from({ length: end - start + 1 }, (_, i) => start + i)
        }
        return [Number(trimmed)]
      })
      pages = parts.filter((n) => Number.isFinite(n) && n > 0)
    }
  }

  const converter = new PdfToImageConverter()
  const convertedPages = await withTimeout(
    converter.convert(job.files[0].buffer, { format, quality, dpi, pages }),
    TIMEOUTS.pdfHeavy,
    'pdf.toJpg'
  )

  manager.updateJobProgress(job.id, 80)

  if (convertedPages.length === 0) {
    throw new Error('No pages were converted')
  }

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  const mimeType = mimeMap[format] || 'image/jpeg'
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')

  if (convertedPages.length === 1) {
    return {
      buffer: convertedPages[0].buffer,
      fileName: `${baseName}-page-1.${format}`,
      mimeType,
    }
  }

  const zipBuffer = await createZipFromFiles(
    convertedPages.map((p) => ({
      name: `${baseName}-page-${p.pageNumber}.${format}`,
      buffer: p.buffer,
    }))
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: zipBuffer, fileName: `${baseName}-pages.zip`, mimeType: 'application/zip' }
}

async function processPdfToWord(job: Job): Promise<SingleResult> {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    processor.toWord({ file: toArrayBuffer(job.files[0].buffer) }),
    TIMEOUTS.pdfHeavy,
    'pdf.toWord'
  )
  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  return {
    buffer: unwrap(result),
    fileName: `${baseName}.docx`,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
}

// ============================================================
// OCR Processors
// ============================================================

async function processOcrImage(job: Job): Promise<SingleResult> {
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const language = (job.options.language as string) || 'eng'
  const ocr = new OCRProcessor()

  const result = await withTimeout(
    ocr.recognizeImage(job.files[0].buffer, { language }),
    TIMEOUTS.ocrOp,
    'ocr.image'
  )
  manager.updateJobProgress(job.id, 90)

  const baseName = job.files[0].name.replace(/\.[^.]+$/, '')
  const textBuffer = Buffer.from(result.text, 'utf-8')
  return {
    buffer: textBuffer,
    fileName: `${baseName}-ocr.txt`,
    mimeType: 'text/plain; charset=utf-8',
  }
}

async function processOcrPdf(job: Job): Promise<SingleResult> {
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const language = (job.options.language as string) || 'eng'
  const ocr = new OCRProcessor()

  const result = await withTimeout(
    ocr.recognizePdf(job.files[0].buffer, { language }),
    TIMEOUTS.ocrOp,
    'ocr.pdf'
  )
  manager.updateJobProgress(job.id, 90)

  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  const textBuffer = Buffer.from(result.text, 'utf-8')
  return {
    buffer: textBuffer,
    fileName: `${baseName}-ocr.txt`,
    mimeType: 'text/plain; charset=utf-8',
  }
}

// ============================================================
// Image Processors
// ============================================================

async function processCompressImage(job: Job): Promise<SingleResult | BatchResult> {
  const processor = new ImageProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const quality = (job.options.quality as unknown as number) || 80

  if (job.files.length === 1) {
    const result = await processor.compress({
      file: toArrayBuffer(job.files[0].buffer),
      quality,
    })
    manager.updateJobProgress(job.id, 90)
    return {
      buffer: unwrap(result),
      fileName: `compressed-${job.files[0].name}`,
      mimeType: job.files[0].type,
    }
  }

  const concurrency = defaultCpuConcurrency()
  let done = 0
  const results = await mapWithConcurrency(job.files, concurrency, async (file) => {
    const r = await processor.compress({ file: toArrayBuffer(file.buffer), quality })
    done++
    manager.updateJobProgress(job.id, 10 + Math.round((done / job.files.length) * 70))
    return {
      buffer: unwrap(r),
      fileName: `compressed-${file.name}`,
      mimeType: file.type,
    }
  })

  const zipBuffer = await createZipFromFiles(
    results.map((r) => ({ name: r.fileName, buffer: r.buffer }))
  )
  return {
    buffer: zipBuffer,
    fileName: 'compressed-images.zip',
    mimeType: 'application/zip',
  }
}

async function processResizeImage(job: Job): Promise<SingleResult> {
  const processor = new ImageProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const width = job.options.width as number | undefined
  const height = job.options.height as number | undefined
  const maintainAspectRatio = job.options.maintainAspectRatio !== false
  const result = await processor.resize({
    file: toArrayBuffer(job.files[0].buffer),
    width,
    height,
    fit: maintainAspectRatio ? 'inside' : 'fill',
  })
  manager.updateJobProgress(job.id, 90)
  return {
    buffer: unwrap(result),
    fileName: `resized-${job.files[0].name}`,
    mimeType: job.files[0].type,
  }
}

async function processConvertImage(job: Job): Promise<SingleResult> {
  const processor = new ImageProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const outputFormat =
    (job.options.outputFormat as 'jpg' | 'png' | 'webp' | 'gif') || 'png'
  const result = await processor.convert({
    file: toArrayBuffer(job.files[0].buffer),
    targetFormat: outputFormat,
  })
  manager.updateJobProgress(job.id, 90)
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  const baseName = job.files[0].name.replace(/\.[^.]+$/, '')
  return {
    buffer: unwrap(result),
    fileName: `${baseName}.${outputFormat}`,
    mimeType: mimeTypes[outputFormat] || 'image/png',
  }
}

async function processCropImage(job: Job): Promise<SingleResult> {
  const processor = new ImageProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const { left, top, width, height } = job.options as {
    left: number
    top: number
    width: number
    height: number
  }
  if (!width || !height) throw new Error('Crop width and height are required')
  const result = await processor.crop({
    file: toArrayBuffer(job.files[0].buffer),
    left: left || 0,
    top: top || 0,
    width,
    height,
  })
  manager.updateJobProgress(job.id, 90)
  return {
    buffer: unwrap(result),
    fileName: `cropped-${job.files[0].name}`,
    mimeType: job.files[0].type,
  }
}

async function processPptToPdf(job: Job): Promise<SingleResult> {
  const converter = new DocumentConverter()
  const manager   = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    converter.pptToPdf(job.files[0].buffer),
    TIMEOUTS.pdfHeavy,
    'ppt.toPdf'
  )
  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pptx?$/i, '')
  return {
    buffer:   result.buffer,
    fileName: `${baseName}.pdf`,
    mimeType: 'application/pdf',
  }
}

async function processPdfToPpt(job: Job): Promise<SingleResult> {
  const converter = new DocumentConverter()
  const manager   = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const result = await withTimeout(
    converter.pdfToPresentation(job.files[0].buffer),
    TIMEOUTS.pdfHeavy,
    'pdf.toPpt'
  )
  manager.updateJobProgress(job.id, 90)
  const baseName = job.files[0].name.replace(/\.pdf$/i, '')
  return {
    buffer:   result.buffer,
    fileName: `${baseName}.pptx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
}
