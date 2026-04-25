/**
 * Job Status API Route
 * Get job status and cancel pending jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobManager } from '@/lib/queue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const manager = getJobManager()
    const status = manager.getJobStatus(id)

    if (!status) {
      return NextResponse.json(
        { error: 'Job not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const manager = getJobManager()
    
    const job = manager.getJob(id)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or expired' },
        { status: 404 }
      )
    }

    // Cancel if pending, delete if completed/failed
    if (job.status === 'pending') {
      const cancelled = manager.cancelJob(id)
      
      if (!cancelled) {
        return NextResponse.json(
          { error: 'Failed to cancel job' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Job cancelled',
      })
    }

    // Delete completed/failed jobs
    const deleted = manager.deleteJob(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job deleted',
    })
  } catch (error) {
    console.error('Error cancelling/deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to cancel/delete job' },
      { status: 500 }
    )
  }
}
