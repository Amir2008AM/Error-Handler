'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Download, Loader2, FileText, CheckCircle2, RotateCcw } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'

export function PageNumbersClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [position, setPosition] = useState('bottom-center')
  const [format, setFormat] = useState('numeric')
  const [startFrom, setStartFrom] = useState(1)
  const [fontSize, setFontSize] = useState(12)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  const positions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-right', label: 'Bottom Right' },
  ]

  const formats = [
    { value: 'numeric', label: '1, 2, 3...' },
    { value: 'roman', label: 'I, II, III...' },
    { value: 'page-of-total', label: 'Page 1 of 10' },
  ]

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
      setFile(selectedFile)
      progress.reset()
    }
  }, [progress, downloadUrl])

  const handleProcess = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('Uploading PDF...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('position', position)
      formData.append('format', format)
      formData.append('startFrom', String(startFrom))
      formData.append('fontSize', String(fontSize))

      const response = await xhrUpload({
        url: '/api/page-numbers',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!response.ok) throw new Error('Processing failed')

      progress.stageProcessing(undefined, ['Adding page numbers...', 'Almost done...'])

      const blob = await response.blob()
      const filename = `numbered-${file.name}`
      const url = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setDownloadFilename(filename)
      progress.stageDone('Page numbers added!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add page numbers'
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
            label={t(lang, 'common.uploadPdf')}
            sublabel={t(lang, 'common.clickOrDragPdf')}
          />
        ) : (
          <div className="space-y-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  {t(lang, 'common.change')}
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">{t(lang, 'pageNum.position')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {positions.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => setPosition(pos.value)}
                      disabled={isProcessing}
                      className={`p-3 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                        position === pos.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">{t(lang, 'pageNum.format')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setFormat(fmt.value)}
                      disabled={isProcessing}
                      className={`p-3 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                        format === fmt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startFrom" className="text-sm font-medium mb-2 block">
                    {t(lang, 'pageNum.startFrom')}
                  </Label>
                  <Input
                    id="startFrom"
                    type="number"
                    min={1}
                    value={startFrom}
                    onChange={(e) => setStartFrom(parseInt(e.target.value) || 1)}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <Label htmlFor="fontSize" className="text-sm font-medium mb-2 block">
                    {t(lang, 'pageNum.fontSize')}
                  </Label>
                  <Input
                    id="fontSize"
                    type="number"
                    min={8}
                    max={24}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleProcess}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t(lang, 'pageNum.processing')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t(lang, 'pageNum.action')}
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
                    <p className="font-semibold text-green-900">Page numbers added!</p>
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
            {downloadUrl && progress.status === 'completed' && (
              <ShareButtons downloadUrl={downloadUrl} filename={downloadFilename} />
            )}
            {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
          </div>
        )}
      </div>
    </>
  )
}
