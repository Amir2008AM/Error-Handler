/**
 * API Progress Helper
 * Server-side utilities for streaming progress to clients
 */

// Progress stages for different operations
export interface ProcessingStage {
  name: string
  weight: number // Percentage weight of this stage
}

export const PDF_STAGES: ProcessingStage[] = [
  { name: 'Loading document', weight: 20 },
  { name: 'Processing', weight: 60 },
  { name: 'Saving', weight: 20 },
]

export const IMAGE_STAGES: ProcessingStage[] = [
  { name: 'Loading image', weight: 15 },
  { name: 'Processing', weight: 70 },
  { name: 'Encoding', weight: 15 },
]

export const MERGE_STAGES: ProcessingStage[] = [
  { name: 'Creating document', weight: 10 },
  { name: 'Merging files', weight: 70 },
  { name: 'Finalizing', weight: 20 },
]

// Calculate overall progress from stage progress
export function calculateProgress(
  stages: ProcessingStage[],
  currentStageIndex: number,
  stageProgress: number = 100
): number {
  let totalProgress = 0
  
  // Add completed stages
  for (let i = 0; i < currentStageIndex; i++) {
    totalProgress += stages[i].weight
  }
  
  // Add current stage progress
  if (currentStageIndex < stages.length) {
    totalProgress += (stageProgress / 100) * stages[currentStageIndex].weight
  }
  
  return Math.round(Math.min(100, totalProgress))
}

// Create progress callback for multi-step operations
export function createProgressTracker(
  stages: ProcessingStage[],
  onProgress: (progress: number, message: string) => void
) {
  let currentStage = 0
  
  return {
    startStage: (stageIndex: number) => {
      currentStage = stageIndex
      const stageName = stages[stageIndex]?.name || 'Processing'
      const progress = calculateProgress(stages, stageIndex, 0)
      onProgress(progress, stageName)
    },
    updateStageProgress: (stageProgress: number) => {
      const stageName = stages[currentStage]?.name || 'Processing'
      const progress = calculateProgress(stages, currentStage, stageProgress)
      onProgress(progress, stageName)
    },
    completeStage: () => {
      const progress = calculateProgress(stages, currentStage, 100)
      const stageName = stages[currentStage]?.name || 'Processing'
      onProgress(progress, `${stageName} complete`)
      currentStage++
    },
    complete: () => {
      onProgress(100, 'Complete')
    },
    fail: (error: string) => {
      onProgress(0, error)
    }
  }
}

// Helper to send SSE progress updates
export function createSSEStream(
  processor: (onProgress: (progress: number, message: string) => void) => Promise<{
    buffer: Buffer
    fileName: string
    mimeType: string
    metadata?: Record<string, unknown>
  }>
) {
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
        const data = JSON.stringify({ type: 'progress', progress, message })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }
      
      try {
        const result = await processor(sendProgress)
        
        // Send completion with result metadata
        const completeData = JSON.stringify({
          type: 'complete',
          progress: 100,
          message: 'Processing complete',
          result: {
            fileName: result.fileName,
            fileSize: result.buffer.length,
            mimeType: result.mimeType,
            metadata: result.metadata,
          },
        })
        controller.enqueue(encoder.encode(`data: ${completeData}\n\n`))
        
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Processing failed',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
      } finally {
        controller.close()
      }
    },
  })
}
