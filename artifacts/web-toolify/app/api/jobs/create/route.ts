/**
 * Create Job API Route
 * Creates a new processing job and returns job ID for polling
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobManager, processJob, JobType } from '@/lib/queue'

export const maxDuration = 300 // 5 minutes for heavy operations

const VALID_JOB_TYPES: JobType[] = [
  'merge-pdf',
  'split-pdf',
  'rotate-pdf',
  'compress-pdf',
  'watermark-pdf',
  'protect-pdf',
  'unlock-pdf',
  'sign-pdf',
  'pdf-to-jpg',
  'pdf-to-word',
  'pdf-to-excel',
  'word-to-pdf',
  'excel-to-pdf',
  'html-to-pdf',
  'ocr-pdf',
  'ocr-image',
  'compress-image',
  'resize-image',
  'convert-image',
  'crop-image',
  'image-to-pdf',
  'add-page-numbers',
  'organize-pdf',
  'extract-pages',
  'delete-pages',
  'repair-pdf',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const jobType = formData.get('type') as JobType
    const optionsStr = formData.get('options') as string | null
    const processImmediately = formData.get('processNow') === 'true'

    // Validate job type
    if (!jobType || !VALID_JOB_TYPES.includes(jobType)) {
      return NextResponse.json(
        { error: `Invalid job type: ${jobType}` },
        { status: 400 }
      )
    }

    // Extract files from form data
    const files: Array<{ name: string; buffer: Buffer; type: string }> = []
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        const arrayBuffer = await value.arrayBuffer()
        files.push({
          name: value.name,
          buffer: Buffer.from(arrayBuffer),
          type: value.type,
        })
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      )
    }

    // Parse options
    let options = {}
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr)
      } catch {
        return NextResponse.json(
          { error: 'Invalid options JSON' },
          { status: 400 }
        )
      }
    }

    // Create the job
    const manager = getJobManager()
    const job = manager.createJob(jobType, files, options)

    // If processNow is true, process immediately and wait for result
    if (processImmediately) {
      try {
        const result = await processJob(job.id)
        const status = manager.getJobStatus(job.id)
        
        return NextResponse.json({
          id: job.id,
          status: status?.status || 'completed',
          progress: 100,
          result,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed'
        return NextResponse.json({
          id: job.id,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    // Otherwise return job ID for polling
    // Start processing in the background (fire and forget)
    processJob(job.id).catch((error) => {
      console.error(`Job ${job.id} failed:`, error)
    })

    return NextResponse.json({
      id: job.id,
      status: 'pending',
      progress: 0,
      pollUrl: `/api/jobs/${job.id}`,
    })
  } catch (error) {
    console.error('Error creating job:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create job'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
