'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Loader2, FileText, CheckCircle2, RotateCcw } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'

export function RepairPdfClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
      setFile(selectedFile)
      progress.reset()
    }
  }, [progress, downloadUrl])

  const handleRepair = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('Uploading PDF...')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await xhrUpload({
        url: '/api/repair-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Repair failed' }))
        throw new Error(error.error || 'Repair failed')
      }

      progress.stageProcessing(undefined, ['Repairing document...', 'Almost done...'])

      const blob = await response.blob()
      const filename = `repaired-${file.name}`
      const url = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setDownloadFilename(filename)
      progress.stageDone('PDF repaired successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to repair PDF. The file may be too damaged.'
      progress.fail(message)
    }
  }

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(null)
    progress.reset()
  }, [downloadUrl, progress])

  const isProcessing = progress.status === 'processing'

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <UploadDropzone
            accept=".pdf,application/pdf"
            onFilesSelected={handleFilesSelected}
            label={t(lang, 'repair.uploadTitle')}
            sublabel={t(lang, 'common.clickOrDragPdf')}
          />
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} disabled={isProcessing}>
                  {t(lang, 'common.change')}
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-muted/50">
              <h3 className="font-medium mb-3">{t(lang, 'repair.whatItDoes')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  {t(lang, 'repair.step1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  {t(lang, 'repair.step2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  {t(lang, 'repair.step3')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span>
                  {t(lang, 'repair.step4')}
                </li>
              </ul>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleRepair}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t(lang, 'repair.processing')}</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />{t(lang, 'repair.action')}</>
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
                    <p className="font-semibold text-green-900">PDF repaired successfully!</p>
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
                    Download Repaired PDF
                  </a>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New File
                  </button>
                </div>
              <ShareButtons downloadUrl={downloadUrl} filename={downloadFilename} />
              </div>
            )}
            {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
          </div>
        )}
      </div>
    </>
  )
}
