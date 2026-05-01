/**
 * Job Processor
 *
 * Executes processing jobs against the right engine. Two big upgrades
 * over the previous version:
 *
 *  1. **Per-operation + per-job timeouts** via `withTimeout`. A single
 *     pathological PDF can no longer pin a worker forever.
 *  2. **Bounded concurrency for batches** via `mapWithConcurrency`.
 *     The old code did `Promise.all(files.map(...))` which decoded
 *     every image at once — easy to OOM on a 50-image batch.
 */

import { Job, JobType, JobResult } from './types'
import { getJobManager } from './job-manager'
import { PDFProcessor } from '../processing/pdf-processor'
import { ImageProcessor } from '../processing/image-processor'
import { createZipFromFiles } from '../processing/file-utils'
import { withTimeout, TIMEOUTS } from '../processing/timeout'
import { mapWithConcurrency, defaultCpuConcurrency } from '../processing/concurrency'
import type { ProcessingResult } from '../processing/types'

type ProcessorFunction = (job: Job) => Promise<{
  buffer: Buffer
  fileName: string
  mimeType: string
} | {
  buffers: Array<{ buffer: Buffer; fileName: string; mimeType: string }>
}>

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

const processors: Partial<Record<JobType, ProcessorFunction>> = {
  'merge-pdf': processMergePdf,
  'split-pdf': processSplitPdf,
  'rotate-pdf': processRotatePdf,
  'compress-pdf': processCompressPdf,
  'watermark-pdf': processWatermarkPdf,
  'add-page-numbers': processAddPageNumbers,
  'organize-pdf': processOrganizePdf,
  'image-to-pdf': processImageToPdf,
  'repair-pdf': processRepairPdf,
  'compress-image': processCompressImage,
  'resize-image': processResizeImage,
  'convert-image': processConvertImage,
  'crop-image': processCropImage,
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

  try {
    manager.startProcessing()
    manager.updateJobStatus(jobId, 'processing', 0)

    // Whole-job safety net — even if the engine forgets its own
    // timeout, this guarantees the slot is released eventually.
    const result = await withTimeout(
      processor(job),
      TIMEOUTS.jobOverall,
      `job:${job.type}`
    )

    if ('buffers' in result) {
      await manager.setJobResultBatch(jobId, result.buffers)
    } else {
      await manager.setJobResult(jobId, result.buffer, result.fileName, result.mimeType)
    }
    return manager.getJobStatus(jobId)?.result ?? null
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed'
    manager.setJobError(jobId, errorMessage)
    throw error
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
// Processor Functions
// ============================================================

async function processMergePdf(job: Job) {
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

async function processSplitPdf(job: Job) {
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

async function processRotatePdf(job: Job) {
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

async function processCompressPdf(job: Job) {
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

async function processWatermarkPdf(job: Job) {
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

async function processAddPageNumbers(job: Job) {
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

async function processOrganizePdf(job: Job) {
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

async function processImageToPdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)
  const images = job.files.map((f) => toArrayBuffer(f.buffer))
  const result = await withTimeout(
    processor.imagesToPdf({
      images,
      pageSize: (job.options.pageSize as 'auto' | 'a4' | 'letter') || 'a4',
      margin:     (job.options.margin      as number) ?? 20,
      quality:    (job.options.imageQuality as number) ?? 78,
      maxWidthPx: (job.options.maxWidthPx  as number) ?? 1_600,
    }),
    TIMEOUTS.pdfHeavy,
    'pdf.imagesToPdf'
  )
  manager.updateJobProgress(job.id, 90)
  return { buffer: unwrap(result), fileName: 'images.pdf', mimeType: 'application/pdf' }
}

async function processRepairPdf(job: Job) {
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

async function processCompressImage(job: Job) {
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

  // Bounded-concurrency batch: cap at the libuv pool size so sharp's
  // workers don't fight `fs` for threads. Each item already has its
  // own per-op timeout from inside ImageProcessor.
  const concurrency = defaultCpuConcurrency()
  let done = 0
  const results = await mapWithConcurrency(job.files, concurrency, async (file) => {
    const r = await processor.compress({
      file: toArrayBuffer(file.buffer),
      quality,
    })
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

async function processResizeImage(job: Job) {
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

async function processConvertImage(job: Job) {
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

async function processCropImage(job: Job) {
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
