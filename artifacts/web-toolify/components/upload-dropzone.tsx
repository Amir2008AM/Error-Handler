'use client'

import { useCallback, useRef, useState, useMemo } from 'react'
import { Upload, AlertCircle, Loader2, X, Copy, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

const GD_SETUP_SEEN_KEY = 'gd_setup_banner_seen'

function GoogleDriveSetupBanner({ onClose, onProceed }: { onClose: () => void; onProceed: () => void }) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 1.2-13.75 23.8 16.25 28.1h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#2684fc"/>
              <path d="m33.25 53.1h27.5l-13.75 23.8c-1.35.8-2.9 1.2-4.5 1.2h-4.5c-1.6 0-3.15-.45-4.5-1.2z" fill="#ffba00"/>
            </svg>
            <h3 className="font-semibold text-base">إعداد Google Drive</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          لتفعيل Google Drive، أضف هذا النطاق في{' '}
          <strong className="text-foreground">Authorized JavaScript origins</strong>{' '}
          في Google Cloud Console:
        </p>

        <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 border border-border">
          <code className="flex-1 text-sm font-mono text-foreground truncate">{origin}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="نسخ"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
          <li>افتح <strong className="text-foreground">APIs &amp; Services → Credentials</strong></li>
          <li>اختر OAuth 2.0 Client ID الخاص بك</li>
          <li>أضف النطاق أعلاه في <strong className="text-foreground">Authorized JavaScript origins</strong></li>
          <li>احفظ، ثم ارجع وحاول مجدداً</li>
        </ol>

        <div className="flex items-center gap-2 pt-1">
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            فتح Google Cloud Console
          </a>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted/60 transition-colors text-sm"
          >
            إغلاق
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            جرّب الآن
          </button>
        </div>
      </div>
    </div>
  )
}

interface UploadDropzoneProps {
  accept?: string
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
  label?: string
  sublabel?: string
  maxSizeMB?: number
  maxTotalSizeMB?: number
  currentTotalSize?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function GoogleDriveIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  )
}

function DropboxIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2L0 6l6 4 6-4L6 2zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 19.5L12 23l6-3.5-6-4-6 4z" fill="#0061FF"/>
    </svg>
  )
}

export function UploadDropzone({
  accept,
  multiple = false,
  onFilesSelected,
  label = 'Drop files here or click to browse',
  sublabel,
  maxSizeMB = 50,
  maxTotalSizeMB = 100,
  currentTotalSize = 0,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [gdLoading, setGdLoading] = useState(false)
  const [gdError, setGdError] = useState<string | null>(null)
  const [showGdSetup, setShowGdSetup] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxTotalBytes = maxTotalSizeMB * 1024 * 1024
  const usagePercent = useMemo(
    () => Math.min((currentTotalSize / maxTotalBytes) * 100, 100),
    [currentTotalSize, maxTotalBytes],
  )
  const remainingBytes = Math.max(0, maxTotalBytes - currentTotalSize)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      setSizeError(null)
      setGdError(null)

      const maxPerFile = maxSizeMB * 1024 * 1024
      const validFiles: File[] = []
      let skippedCount = 0

      for (const f of Array.from(fileList)) {
        if (f.size > maxPerFile) {
          skippedCount++
          continue
        }
        validFiles.push(f)
      }

      if (skippedCount > 0) {
        setSizeError(
          skippedCount === 1
            ? `1 file was skipped because it exceeds the ${maxSizeMB} MB per-file limit.`
            : `${skippedCount} files were skipped because they exceed the ${maxSizeMB} MB per-file limit.`,
        )
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [onFilesSelected, maxSizeMB],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleGoogleDrive = useCallback(async () => {
    setGdError(null)
    const seen = typeof window !== 'undefined' && localStorage.getItem(GD_SETUP_SEEN_KEY)
    if (!seen) {
      setShowGdSetup(true)
      return
    }
    setGdLoading(true)
    try {
      const { pickFromGoogleDrive, isGoogleDriveConfigured } = await import('@/lib/upload/google-drive')
      if (!isGoogleDriveConfigured()) {
        setGdError('Google Drive is not configured.')
        return
      }
      const files = await pickFromGoogleDrive({ accept, multiple })
      if (files.length > 0) onFilesSelected(files)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Drive failed'
      setGdError(msg === 'GOOGLE_DRIVE_NOT_CONFIGURED' ? 'Google Drive is not configured.' : msg)
    } finally {
      setGdLoading(false)
    }
  }, [accept, multiple, onFilesSelected])

  const handleGdSetupClose = useCallback((proceed?: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GD_SETUP_SEEN_KEY, '1')
    }
    setShowGdSetup(false)
    if (proceed) {
      // re-trigger after closing so user can try immediately
      setTimeout(() => handleGoogleDrive(), 100)
    }
  }, [handleGoogleDrive])

  return (
    <div className="space-y-3">
      {showGdSetup && <GoogleDriveSetupBanner onClose={() => handleGdSetupClose(false)} onProceed={() => handleGdSetupClose(true)} />}
      {multiple && currentTotalSize > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total size:{' '}
              <span className="font-semibold text-foreground">{formatBytes(currentTotalSize)}</span>
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                usagePercent >= 100
                  ? 'text-destructive'
                  : usagePercent >= 90
                    ? 'text-destructive'
                    : usagePercent >= 70
                      ? 'text-amber-600'
                      : 'text-muted-foreground',
              )}
            >
              {usagePercent >= 100
                ? `${formatBytes(currentTotalSize - maxTotalBytes)} over limit`
                : `${formatBytes(remainingBytes)} remaining`}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                usagePercent >= 100
                  ? 'bg-destructive'
                  : usagePercent >= 90
                    ? 'bg-destructive'
                    : usagePercent >= 70
                      ? 'bg-amber-500'
                      : 'bg-primary',
              )}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 MB</span>
            <span>Max: {maxTotalSizeMB} MB</span>
          </div>
        </div>
      )}

      {sizeError && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{sizeError}</span>
        </div>
      )}

      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer hover:border-primary hover:bg-primary/5',
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-muted/30',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label={label}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-primary/10">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{label}</p>
            {sublabel && <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Max {maxSizeMB}MB per file{multiple && ` · ${maxTotalSizeMB}MB total`}
            </p>
          </div>
          <button
            type="button"
            className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          >
            Choose {multiple ? 'Files' : 'File'}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      <div className="space-y-2 pt-1">
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground px-1 shrink-0">or import from</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGoogleDrive}
            disabled={gdLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted/60 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {gdLoading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <GoogleDriveIcon />
            )}
            Google Drive
          </button>
          <button
            type="button"
            disabled
            title="Dropbox integration coming soon"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/30 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-60"
          >
            <DropboxIcon />
            Dropbox
            <span className="text-xs opacity-70">(soon)</span>
          </button>
        </div>
        {gdError && (
          <p className="text-xs text-destructive leading-relaxed">{gdError}</p>
        )}
      </div>
    </div>
  )
}
