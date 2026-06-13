'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Loader2, Presentation, CheckCircle2, RotateCcw } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { getToolBySlug } from '@/lib/tools'

const tool = getToolBySlug('ppt-to-pdf')!


export function PptToPdfClient() {
  const [file, setFile]                     = useState<File | null>(null)
  const [downloadUrl, setDownloadUrl]       = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress                            = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selected = files[0]
    if (!selected) return
    const name = selected.name.toLowerCase()
    if (!name.endsWith('.pptx') && !name.endsWith('.ppt')) {
      progress.fail('Please upload a PowerPoint file (.pptx or .ppt)')
      return
    }
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(selected)
    progress.reset()
  }, [progress, downloadUrl])

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
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
      const filename = file.name.replace(/\.pptx?$/i, '.pdf')

      setDownloadUrl(url)
      setDownloadFilename(filename)
      progress.stageDone('Conversion complete!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert presentation'
      progress.fail(message)
    }
  }

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(null)
    progress.reset()
  }, [downloadUrl, progress])

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
                  onClick={handleReset}
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
            </div>

            {downloadUrl && progress.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Conversion complete!</p>
                    <p className="text-sm text-green-700">{downloadFilename}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New File
                  </button>
                </div>
              </div>
            )}
            {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
          </div>
        )}
      </div>
    </>
  )
}
