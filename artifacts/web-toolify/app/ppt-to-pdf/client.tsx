'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Loader2, Presentation } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { getToolBySlug } from '@/lib/tools'

const tool = getToolBySlug('ppt-to-pdf')!


export function PptToPdfClient() {
  const [file, setFile]     = useState<File | null>(null)
  const progress            = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selected = files[0]
    if (!selected) return
    const name = selected.name.toLowerCase()
    if (!name.endsWith('.pptx') && !name.endsWith('.ppt')) {
      progress.fail('Please upload a PowerPoint file (.pptx or .ppt)')
      return
    }
    setFile(selected)
    progress.reset()
  }, [progress])

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    progress.startProcessing('Uploading presentation...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await xhrUpload({
        url: '/api/ppt-to-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading presentation...')
        },
      })

      progress.stageProcessing(undefined, [
        'Converting slides...',
        'Rendering pages...',
        'Finalising PDF...',
        'Almost done...',
      ])

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Conversion failed' }))
        throw new Error(err.error || 'Conversion failed')
      }

      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = file.name.replace(/\.pptx?$/i, '.pdf')
      a.click()
      URL.revokeObjectURL(url)

      progress.stageDone('Conversion complete!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert presentation'
      progress.fail(message)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isProcessing = progress.status === 'processing'

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <BackButton />

        {!file ? (
          <UploadDropzone
            accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
            onFilesSelected={handleFilesSelected}
            label="Upload PowerPoint"
            sublabel="Supports .pptx and .ppt files up to 50 MB"
          />
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Presentation className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFile(null); progress.reset() }}
                  disabled={isProcessing}
                >
                  Change
                </Button>
              </div>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Convert to PDF
                  </>
                )}
              </Button>

              <RealProgressBar
                status={progress.status}
                progress={progress.progress}
                message={progress.message}
                error={progress.error}
                className="w-[280px]"
                showPercentage={true}
                showMessage={true}
                autoHide={false}
              />
              {progress.status === 'completed' && <TrustpilotReview />}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
