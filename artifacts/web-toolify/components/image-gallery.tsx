'use client'

import { memo } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImageItem {
  id: string
  file: File
  preview: string
  order?: number | null
}

interface ImageGalleryProps {
  images: ImageItem[]
  onRemove: (id: string) => void
  onToggleOrder?: (id: string) => void
  isProcessing?: boolean
  maxTotalSizeMB?: number
  showOrderBadges?: boolean
  clickToToggleLabel?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getIsSizeExceeded(images: ImageItem[], maxTotalSizeMB?: number): boolean {
  if (!maxTotalSizeMB) return false
  const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
  return totalSize > maxTotalSizeMB * 1024 * 1024
}

interface ImageCardProps {
  img: ImageItem
  onRemove: (id: string) => void
  onToggleOrder?: (id: string) => void
  isProcessing: boolean
  showOrderBadges: boolean
  clickToToggleLabel?: string
}

const ImageCard = memo(function ImageCard({
  img,
  onRemove,
  onToggleOrder,
  isProcessing,
  showOrderBadges,
  clickToToggleLabel,
}: ImageCardProps) {
  return (
    <div
      className={cn(
        'relative group rounded-xl overflow-hidden border-2 transition-all select-none',
        onToggleOrder ? 'cursor-pointer' : 'cursor-default',
        showOrderBadges && img.order != null
          ? 'border-primary shadow-md ring-2 ring-primary/20'
          : 'border-border hover:border-primary/40',
        isProcessing && 'pointer-events-none opacity-60',
      )}
      onClick={() => !isProcessing && onToggleOrder?.(img.id)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.preview}
        alt={img.file.name}
        className="w-full aspect-square object-cover"
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      {showOrderBadges && img.order != null && (
        <div className="absolute top-2 left-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
          {img.order}
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(img.id) }}
        disabled={isProcessing}
        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all disabled:opacity-30 z-10 shadow"
        aria-label="Remove image"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 pointer-events-none">
        <p className="text-xs text-white truncate">{img.file.name}</p>
      </div>

      {onToggleOrder && clickToToggleLabel && img.order == null && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-lg">
            {clickToToggleLabel}
          </span>
        </div>
      )}
    </div>
  )
})

export const ImageGallery = memo(function ImageGallery({
  images,
  onRemove,
  onToggleOrder,
  isProcessing = false,
  maxTotalSizeMB,
  showOrderBadges = false,
  clickToToggleLabel,
}: ImageGalleryProps) {
  const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
  const maxTotalBytes = maxTotalSizeMB ? maxTotalSizeMB * 1024 * 1024 : Infinity
  const isSizeExceeded = maxTotalSizeMB ? totalSize > maxTotalBytes : false

  return (
    <div className="space-y-3">
      {isSizeExceeded && maxTotalSizeMB && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">
              Total selected files exceed the maximum allowed size of {maxTotalSizeMB} MB.
            </p>
            <p className="text-amber-700 mt-0.5">
              Please remove some images before continuing. Current total: {formatBytes(totalSize)}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img) => (
          <ImageCard
            key={img.id}
            img={img}
            onRemove={onRemove}
            onToggleOrder={onToggleOrder}
            isProcessing={isProcessing}
            showOrderBadges={showOrderBadges}
            clickToToggleLabel={clickToToggleLabel}
          />
        ))}
      </div>
    </div>
  )
})
