'use client'

import { useCallback, useRef, useState, useMemo } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <div className="space-y-3">
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
    </div>
  )
}
