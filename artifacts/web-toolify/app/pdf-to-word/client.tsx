'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'
import { formatBytes } from '@/lib/utils/format-bytes'
import { useState, useCallback, useEffect } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, FileText } from 'lucide-react'
import { RealProgressBar, useJobProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

export function PdfToWordClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState('')

  const job = useJobProgress(800)

  // Build download URL once the job completes and a fileId is available
  useEffect(() => {
    if (job.status === 'completed' && job.result) {
      const fileId: string | undefined =
        job.result.fileId ?? job.result.id ?? job.result.file_id
      if (fileId) {
        setDownloadUrl(`/api/files/${fileId}`)
      }
    }
  }, [job.status, job.result])

  const handleFileSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    if (f.size > MAX_FILE_BYTES) return
    setFile(f)
    setDownloadUrl(null)
    setFilename(`${f.name.replace(/\.pdf$/i, '')}.docx`)
    job.reset()
  }, [job])

  const handleConvert = useCallback(async () => {
    if (job.status === 'processing' || !file) return
    setDownloadUrl(null)

    // ── Phase 1: Upload (bar: 0 → 50%) ───────────────────────────────────
    job.setUploadProgress(0, 'Uploading…')

    const formData = new FormData()
    formData.append('type', 'pdf-to-word')
    formData.append('options', JSON.stringify({}))
    formData.append('file0', file)

    let jobId: string | null = null
    try {
      const { xhrUpload } = await import('@/lib/utils/xhr-upload')
      const res = await xhrUpload({
        url: '/api/jobs/create',
        formData,
        onUploadProgress: (pct) => {
          // Map XHR upload 0-100% → bar 0-50%
          job.setUploadProgress(Math.round(pct / 2), 'Uploading…')
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error ?? 'Upload failed')
      }

      const data = await res.json()
      jobId = data.id ?? data.jobId ?? null
      if (!jobId) throw new Error('Server did not return a job ID')

      // If the server processed it synchronously already
      if (data.status === 'completed') {
        const fileId =
          data.result?.fileId ?? data.result?.id ?? data.result?.file_id
        if (fileId) setDownloadUrl(`/api/files/${fileId}`)
        return
      }
    } catch (err: any) {
      job.fail(err.message ?? 'Upload failed')
      return
    }

    // ── Phase 2: Poll processing (bar: 50 → 100%) ────────────────────────
    // baseProgress=50 so polling maps server 0-100% into bar 50-100%
    job.startPolling(jobId, 50)
  }, [file, job])

  const reset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl(null)
    setFilename('')
    job.reset()
  }, [downloadUrl, job])

  const isProcessing = job.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      {!file ? (
        <UploadDropzone
          accept="application/pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label={t(lang, 'pdfToWord.dropFile')}
          sublabel={t(lang, 'pdfToWord.subLabel')}
        />
      ) : (
        <div className="space-y-5">
          {/* File card */}
          <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={reset}
              disabled={isProcessing}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Info note */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-700">
            <strong>Note:</strong> {t(lang, 'pdfToWord.note')}
          </div>

          {/* Error */}
          {job.error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {job.error}
            </div>
          )}

          {/* Actions + progress */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t(lang, 'pdfToWord.converting')}</>
                ) : (
                  <><FileText className="w-5 h-5" /> {t(lang, 'pdfToWord.action')}</>
                )}
              </button>
              <button
                onClick={reset}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> {t(lang, 'pdfToWord.reset')}
              </button>
            </div>

            <RealProgressBar
              status={job.status === 'error' ? 'error' : job.status}
              progress={job.progress}
              message={job.message}
              error={job.error}
              className="w-full"
              showPercentage={true}
              showMessage={true}
              autoHide={false}
            />
          </div>

          {/* Download card */}
          {downloadUrl && job.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">{t(lang, 'pdfToWord.successTitle')}</p>
                  <p className="text-sm text-green-700">{filename}</p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={filename}
                className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                {t(lang, 'pdfToWord.download')}
              </a>
            </div>
          )}
          {downloadUrl && job.status === 'completed' && (
            <ShareButtons downloadUrl={downloadUrl} filename={filename} />
          )}
          {downloadUrl && job.status === 'completed' && <TrustpilotReview />}
        </div>
      )}
    </div>
  )
}
