'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Loader2, FileText, Settings, CheckCircle2, RotateCcw } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

const tool = getToolBySlug('word-to-pdf')!
const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

export function WordToPdfClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  // ── Background pre-upload state ──────────────────────────────────────────
  const preUploadRef = useRef<Promise<{ uploadId: string | null }> | null>(null)
  const preUploadAbortRef = useRef<AbortController | null>(null)

  const cancelPreUpload = useCallback(() => {
    preUploadAbortRef.current?.abort()
    preUploadAbortRef.current = null
    preUploadRef.current = null
  }, [])

  const startPreUpload = useCallback((f: File) => {
    cancelPreUpload()
    const ac = new AbortController()
    preUploadAbortRef.current = ac

    const formData = new FormData()
    formData.append('file', f)

    preUploadRef.current = fetch('/api/preupload', {
      method: 'POST',
      body: formData,
      signal: ac.signal,
    })
      .then((r) => r.json() as Promise<{ uploadId: string }>)
      .catch(() => ({ uploadId: null }))
  }, [cancelPreUpload])

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (!selectedFile) return

    if (selectedFile.size > MAX_FILE_BYTES) {
      progress.fail(`الملف كبير جداً (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). الحد الأقصى 25 MB لضمان اكتمال التحويل في أقل من 30 ثانية.`)
      return
    }

    const ext = selectedFile.name.toLowerCase()
    if (!ext.endsWith('.docx') && !ext.endsWith('.doc')) {
      progress.fail('Please upload a Word document (.docx or .doc)')
      return
    }

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(selectedFile)
    progress.reset()

    // Start background upload immediately — user sees nothing
    startPreUpload(selectedFile)
  }, [progress, startPreUpload, downloadUrl])

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('جاري التحضير...')

    try {
      // Await the silent background upload (usually already resolved)
      let uploadId: string | null = null
      if (preUploadRef.current) {
        const result = await preUploadRef.current
        uploadId = result.uploadId
      }

      const filename = file.name.replace(/\.(docx?|doc)$/i, '.pdf')

      if (uploadId) {
        // ── Fast path: file already on server, only conversion needed ────────
        progress.stageProcessing(undefined, ['جاري تحويل المستند...', 'جاري بناء ملف PDF...', 'يكاد ينتهي...'])

        const res = await fetch('/api/word-to-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId, pageSize, orientation }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Conversion failed' }))
          throw new Error(err.error || 'Conversion failed')
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadFilename(filename)
        progress.stageDone('تم التحويل بنجاح!')
      } else {
        // ── Fallback: upload + convert in one request ─────────────────────────
        progress.stageUpload(0, 'جاري رفع الملف...')

        const formData = new FormData()
        formData.append('file', file)
        formData.append('pageSize', pageSize)
        formData.append('orientation', orientation)

        const { xhrUpload } = await import('@/lib/utils/xhr-upload')
        const response = await xhrUpload({
          url: '/api/word-to-pdf',
          formData,
          onUploadProgress: (pct) => progress.stageUpload(pct, 'جاري رفع الملف...'),
        })

        progress.stageProcessing(undefined, ['جاري تحويل المستند...', 'يكاد ينتهي...'])

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Conversion failed')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadFilename(filename)
        progress.stageDone('تم التحويل بنجاح!')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert document'
      progress.fail(message)
    }
  }

  const handleReset = useCallback(() => {
    cancelPreUpload()
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(null)
    progress.reset()
  }, [cancelPreUpload, progress, downloadUrl])

  useEffect(() => () => { cancelPreUpload() }, [cancelPreUpload])

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
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onFilesSelected={handleFilesSelected}
            label={t(lang, 'wordToPdf.uploadTitle')}
            sublabel={t(lang, 'wordToPdf.supportedFormats')}
          />
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
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
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t(lang, 'wordToPdf.pdfSettings')}
              </h3>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pageSize">{t(lang, 'wordToPdf.pageSize')}</Label>
                  <Select
                    value={pageSize}
                    onValueChange={(v) => setPageSize(v as typeof pageSize)}
                    disabled={isProcessing}
                  >
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
                  <Label htmlFor="orientation">{t(lang, 'wordToPdf.orientation')}</Label>
                  <Select
                    value={orientation}
                    onValueChange={(v) => setOrientation(v as typeof orientation)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger id="orientation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">{t(lang, 'wordToPdf.portrait')}</SelectItem>
                      <SelectItem value="landscape">{t(lang, 'wordToPdf.landscape')}</SelectItem>
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
                    {t(lang, 'wordToPdf.converting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t(lang, 'wordToPdf.action')}
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
                    <p className="font-semibold text-green-900">تم التحويل بنجاح!</p>
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
                    {t(lang, 'wordToPdf.action')}
                  </a>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t(lang, 'common.change')}
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
