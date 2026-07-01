'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Loader2, Table, Settings, CheckCircle2, RotateCcw } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

const tool = getToolBySlug('excel-to-pdf')!


export function ExcelToPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase()
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl)
        setDownloadUrl(null)
        setFile(selectedFile)
        progress.reset()
      } else {
        progress.fail('Please upload an Excel file (.xlsx, .xls, or .csv)')
      }
    }
  }, [downloadUrl, progress])

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('Uploading spreadsheet...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pageSize', pageSize)
      formData.append('orientation', orientation)

      const response = await xhrUpload({
        url: '/api/excel-to-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading spreadsheet...')
        },
      })

      progress.stageProcessing(undefined, ['Converting spreadsheet...', 'Building PDF...', 'Almost done...'])

      if (!response.ok) {
        let message = 'Conversion failed'
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch {
          message = `Conversion failed (HTTP ${response.status})`
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const filename = file.name.replace(/\.(xlsx?|xls|csv)$/i, '.pdf')

      setDownloadUrl(url)
      setDownloadFilename(filename)
      progress.stageDone('Conversion complete!')
    } catch (error) {
      progress.fail(error instanceof Error ? error.message : 'Failed to convert spreadsheet')
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
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onFilesSelected={handleFilesSelected}
            label="Upload Excel File"
            sublabel="Supports .xlsx, .xls, and .csv files"
          />
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Table className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} disabled={isProcessing}>
                  Change
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                PDF Settings
              </h3>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pageSize">Page Size</Label>
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as typeof pageSize)} disabled={isProcessing}>
                    <SelectTrigger id="pageSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                      <SelectItem value="letter">Letter (8.5 x 11 in)</SelectItem>
                      <SelectItem value="legal">Legal (8.5 x 14 in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orientation">Orientation</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as typeof orientation)} disabled={isProcessing}>
                    <SelectTrigger id="orientation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape (recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
