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
  currentTotalSize?: number // in bytes - existing files total size
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
  const usagePercent = useMemo(() => Math.min((currentTotalSize / maxTotalBytes) * 100, 100), [currentTotalSize, maxTotalBytes])
  const remainingBytes = maxTotalBytes - currentTotalSize
  const isAtLimit = currentTotalSize >= maxTotalBytes

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      setSizeError(null)

      const maxPerFile = maxSizeMB * 1024 * 1024
      const validFiles: File[] = []
      let newTotalSize = currentTotalSize
      const errors: string[] = []

      for (const f of Array.from(fileList)) {
        // Check per-file limit
        if (f.size > maxPerFile) {
          errors.push(`"${f.name}" exceeds ${maxSizeMB}MB per-file limit`)
          continue
        }

        // Check if adding this file would exceed total limit
        if (newTotalSize + f.size > maxTotalBytes) {
          errors.push(`"${f.name}" would exceed total ${maxTotalSizeMB}MB limit`)
          continue
        }

        validFiles.push(f)
        newTotalSize += f.size
      }

      if (errors.length > 0) {
        setSizeError(errors.join('. '))
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [onFilesSelected, maxSizeMB, maxTotalBytes, currentTotalSize, maxTotalSizeMB]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!isAtLimit) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles, isAtLimit]
  )

  const handleClick = () => {
    if (!isAtLimit) {
      inputRef.current?.click()
    }
  }

  return (
    <div className="space-y-3">
      {/* Size Progress Bar - only show for multi-file uploads when there's existing files */}
      {multiple && currentTotalSize > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total size: <span className="font-semibold text-foreground">{formatBytes(currentTotalSize)}</span>
            </span>
            <span className={cn(
              "text-xs font-medium",
              usagePercent >= 90 ? "text-destructive" : usagePercent >= 70 ? "text-amber-600" : "text-muted-foreground"
            )}>
              {formatBytes(remainingBytes)} remaining
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                usagePercent >= 90 ? "bg-destructive" : usagePercent >= 70 ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 MB</span>
            <span>Max: {maxTotalSizeMB} MB</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {sizeError && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{sizeError}</span>
        </div>
      )}

      {/* Dropzone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200',
          isAtLimit 
            ? 'border-destructive/50 bg-destructive/5 cursor-not-allowed' 
            : 'cursor-pointer hover:border-primary hover:bg-primary/5',
          isDragging && !isAtLimit ? 'border-primary bg-primary/5 scale-[1.01]' : !isAtLimit && 'border-border bg-muted/30'
        )}
        onDragOver={(e) => { e.preventDefault(); if (!isAtLimit) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={isAtLimit ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label={label}
        aria-disabled={isAtLimit}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            isAtLimit ? "bg-destructive/10" : "bg-primary/10"
          )}>
            {isAtLimit ? (
              <AlertCircle className="w-7 h-7 text-destructive" />
            ) : (
              <Upload className="w-7 h-7 text-primary" />
            )}
          </div>
          <div>
            {isAtLimit ? (
              <>
                <p className="font-semibold text-destructive">Size limit reached</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Remove some files to add more (max {maxTotalSizeMB}MB total)
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">{label}</p>
                {sublabel && <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  Max {maxSizeMB}MB per file{multiple && ` · ${maxTotalSizeMB}MB total`}
                </p>
              </>
            )}
          </div>
          {!isAtLimit && (
            <button
              type="button"
              className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
            >
              Choose {multiple ? 'Files' : 'File'}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
          disabled={isAtLimit}
        />
      </div>
    </div>
  )
}
