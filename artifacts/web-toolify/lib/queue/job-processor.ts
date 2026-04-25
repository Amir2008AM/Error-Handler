/**
 * Job Processor
 * Executes processing jobs using the appropriate engine
 */

import { Job, JobType, JobResult } from './types'
import { getJobManager } from './job-manager'
import { PDFProcessor } from '../processing/pdf-processor'
import { ImageProcessor } from '../processing/image-processor'
import { createZipFromFiles } from '../processing/file-utils'

type ProcessorFunction = (job: Job) => Promise<{
  buffer: Buffer
  fileName: string
  mimeType: string
} | {
  buffers: Array<{ buffer: Buffer; fileName: string; mimeType: string }>
}>

// Map job types to their processor functions
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

/**
 * Process a job
 */
export async function processJob(jobId: string): Promise<JobResult | null> {
  const manager = getJobManager()
  const job = manager.getJob(jobId)

  if (!job) {
    throw new Error('Job not found')
  }

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

    const result = await processor(job)

    if ('buffers' in result) {
      // Multiple output files
      manager.setJobResultBatch(jobId, result.buffers)
    } else {
      // Single output file
      manager.setJobResult(jobId, result.buffer, result.fileName, result.mimeType)
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

/**
 * Process next pending job in queue
 */
export async function processNextJob(): Promise<JobResult | null> {
  const manager = getJobManager()
  const job = manager.getNextPendingJob()

  if (!job) {
    return null
  }

  return processJob(job.id)
}

// ============================================================
// Processor Functions
// ============================================================

async function processMergePdf(job: Job) {
  const processor = new PDFProcessor()
  const buffers = job.files.map((f) => f.buffer)
  
  // Update progress
  const manager = getJobManager()
  manager.updateJobProgress(job.id, 10)

  const result = await processor.merge(buffers)
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'merged.pdf',
    mimeType: 'application/pdf',
  }
}

async function processSplitPdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const splitMode = job.options.splitMode as 'all' | 'ranges' | 'extract' | undefined
  const ranges = job.options.ranges as string | undefined

  const results = await processor.split(job.files[0].buffer, {
    mode: splitMode || 'all',
    ranges: ranges,
  })

  manager.updateJobProgress(job.id, 80)

  if (results.length === 1) {
    return {
      buffer: results[0],
      fileName: 'split-page-1.pdf',
      mimeType: 'application/pdf',
    }
  }

  // Create ZIP for multiple files
  const zipFiles = results.map((buf, i) => ({
    name: `page-${i + 1}.pdf`,
    buffer: buf,
  }))

  const zipBuffer = await createZipFromFiles(zipFiles)

  return {
    buffer: zipBuffer,
    fileName: 'split-pages.zip',
    mimeType: 'application/zip',
  }
}

async function processRotatePdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const rotation = (job.options.rotation as number) || 90
  const pages = job.options.pages as number[] | undefined

  const result = await processor.rotate(job.files[0].buffer, rotation, pages)
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'rotated.pdf',
    mimeType: 'application/pdf',
  }
}

async function processCompressPdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const quality = (job.options.quality as 'low' | 'medium' | 'high') || 'medium'

  const result = await processor.compress(job.files[0].buffer, { quality })
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'compressed.pdf',
    mimeType: 'application/pdf',
  }
}

async function processWatermarkPdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const result = await processor.addWatermark(job.files[0].buffer, {
    text: job.options.watermarkText as string,
    opacity: (job.options.watermarkOpacity as number) || 0.3,
    position: (job.options.watermarkPosition as 'center' | 'diagonal') || 'diagonal',
  })
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'watermarked.pdf',
    mimeType: 'application/pdf',
  }
}

async function processAddPageNumbers(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const result = await processor.addPageNumbers(job.files[0].buffer, {
    position: (job.options.position as 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left') || 'bottom-center',
    format: (job.options.format as string) || 'Page {n} of {total}',
    startNumber: (job.options.startNumber as number) || 1,
  })
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'numbered.pdf',
    mimeType: 'application/pdf',
  }
}

async function processOrganizePdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const pageOrder = job.options.pageOrder as number[]
  
  if (!pageOrder || pageOrder.length === 0) {
    throw new Error('Page order is required for organize operation')
  }

  const result = await processor.organizePdf(job.files[0].buffer, pageOrder)
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'organized.pdf',
    mimeType: 'application/pdf',
  }
}

async function processImageToPdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const images = job.files.map((f) => ({
    buffer: f.buffer,
    name: f.name,
  }))

  const result = await processor.imagesToPdf(images, {
    pageSize: (job.options.pageSize as 'a4' | 'letter' | 'fit') || 'a4',
    margin: (job.options.margin as number) || 20,
  })
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'images.pdf',
    mimeType: 'application/pdf',
  }
}

async function processRepairPdf(job: Job) {
  const processor = new PDFProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const result = await processor.repairPdf(job.files[0].buffer)
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: 'repaired.pdf',
    mimeType: 'application/pdf',
  }
}

async function processCompressImage(job: Job) {
  const processor = new ImageProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const quality = (job.options.quality as number) || 80

  if (job.files.length === 1) {
    const result = await processor.compress(job.files[0].buffer, { quality })
    manager.updateJobProgress(job.id, 90)
    
    return {
      buffer: result,
      fileName: `compressed-${job.files[0].name}`,
      mimeType: job.files[0].type,
    }
  }

  // Batch processing
  const results = await Promise.all(
    job.files.map(async (file, index) => {
      const result = await processor.compress(file.buffer, { quality })
      manager.updateJobProgress(job.id, 10 + Math.round((index / job.files.length) * 70))
      return {
        buffer: result,
        fileName: `compressed-${file.name}`,
        mimeType: file.type,
      }
    })
  )

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

  const result = await processor.resize(job.files[0].buffer, {
    width,
    height,
    fit: maintainAspectRatio ? 'inside' : 'fill',
  })
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: `resized-${job.files[0].name}`,
    mimeType: job.files[0].type,
  }
}

async function processConvertImage(job: Job) {
  const processor = new ImageProcessor()
  const manager = getJobManager()
  
  manager.updateJobProgress(job.id, 10)

  const outputFormat = (job.options.outputFormat as 'jpg' | 'png' | 'webp' | 'gif') || 'png'

  const result = await processor.convert(job.files[0].buffer, outputFormat)
  
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
    buffer: result,
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

  if (!width || !height) {
    throw new Error('Crop width and height are required')
  }

  const result = await processor.crop(job.files[0].buffer, {
    left: left || 0,
    top: top || 0,
    width,
    height,
  })
  
  manager.updateJobProgress(job.id, 90)

  return {
    buffer: result,
    fileName: `cropped-${job.files[0].name}`,
    mimeType: job.files[0].type,
  }
}
