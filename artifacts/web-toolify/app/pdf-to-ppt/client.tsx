'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Download, Loader2, FileText } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { getToolBySlug } from '@/lib/tools'

const tool = getToolBySlug('pdf-to-ppt')!

import { TrustpilotReview } from '@/components/trustpilot-review'

export function PdfToPptClient() {
  const [file, setFile] = useState<File | null>(null)
  const progress        = useRealProgress()

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (!selected) return

      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        progress.fail('Please upload a PDF file (.pdf)')
        return
      }
      setFile(selected)
      progress.reset()
      e.target.value = ''
    },
    [progress]
  )

  const handleConvert = async () => {
    if (!file) return

    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await xhrUpload({
        url: '/api/pdf-to-ppt',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageProcessing(undefined, [
        'Analysing PDF content...',
        'Building presentation slides...',
        'Finalising PowerPoint...',
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
      a.download = file.name.replace(/\.pdf$/i, '.pptx')
      a.click()
      URL.revokeObjectURL(url)

      progress.stageDone('Conversion complete!')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to convert PDF to PowerPoint'
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
    <ToolPageLayout tool={tool}>
      <div className="max-w-2xl mx-auto">
        <BackButton />

        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload PDF</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .pdf files up to 50 MB
                  </p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600" />
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
                    Convert to PowerPoint
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
    </ToolPageLayout>
  )
}
