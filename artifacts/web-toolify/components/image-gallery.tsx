'use client'

import { useState, useRef, useCallback } from 'react'
import { X, GripVertical, AlertTriangle } from 'lucide-react'
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
  onReorder: (fromId: string, toId: string) => void
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

export function ImageGallery({
  images,
  onRemove,
  onReorder,
  onToggleOrder,
  isProcessing = false,
  maxTotalSizeMB,
  showOrderBadges = false,
  clickToToggleLabel,
}: ImageGalleryProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const touchRef = useRef<{ id: string } | null>(null)

  const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
  const maxTotalBytes = maxTotalSizeMB ? maxTotalSizeMB * 1024 * 1024 : Infinity
  const isSizeExceeded = maxTotalSizeMB ? totalSize > maxTotalBytes : false

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isProcessing) return
    e.dataTransfer.effectAllowed = 'move'
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (isProcessing) return
    setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId || isProcessing) return
    onReorder(draggedId, targetId)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    if (isProcessing) return
    touchRef.current = { id }
    setDraggedId(id)
  }

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current || isProcessing) return
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const card = el?.closest('[data-gallery-id]')
    const targetId = card?.getAttribute('data-gallery-id') ?? null
    setDragOverId(targetId)
  }, [isProcessing])

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current) return
    const fromId = touchRef.current.id
    if (dragOverId && dragOverId !== fromId) {
      onReorder(fromId, dragOverId)
    }
    touchRef.current = null
    setDraggedId(null)
    setDragOverId(null)
  }, [dragOverId, onReorder])

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
          <div
            key={img.id}
            data-gallery-id={img.id}
            draggable={!isProcessing}
            onDragStart={(e) => handleDragStart(e, img.id)}
            onDragOver={(e) => handleDragOver(e, img.id)}
            onDrop={(e) => handleDrop(e, img.id)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, img.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
            className={cn(
              'relative group rounded-xl overflow-hidden border-2 transition-all select-none',
              onToggleOrder ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
              showOrderBadges && img.order != null
                ? 'border-primary shadow-md ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40',
              dragOverId === img.id && draggedId !== img.id && 'border-primary scale-105 shadow-lg',
              draggedId === img.id && 'opacity-40 scale-95',
              isProcessing && 'pointer-events-none opacity-60',
            )}
            onClick={() => !isProcessing && onToggleOrder?.(img.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.preview}
              alt={img.file.name}
              className="w-full aspect-square object-cover"
              draggable={false}
            />

            {showOrderBadges && img.order != null && (
              <div className="absolute top-2 left-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
                {img.order}
              </div>
            )}

            <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <GripVertical className="w-4 h-4 text-white drop-shadow" />
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onRemove(img.id) }}
              disabled={isProcessing}
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-30 z-10"
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
        ))}
      </div>
    </div>
  )
}
