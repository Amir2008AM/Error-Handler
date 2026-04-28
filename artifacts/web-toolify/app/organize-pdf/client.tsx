'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Download, Loader2, Trash2, Copy, GripVertical, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLoadingBar } from '@/components/global-loading-bar'
import { BackButton } from '@/components/back-button'

interface PageItem {
  index: number
  originalIndex: number
}

export function OrganizePdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pages, setPages] = useState<PageItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const { startLoading, stopLoading } = useLoadingBar()

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    
    // Get page count
    const formData = new FormData()
    formData.append('file', selectedFile)
    
    try {
      const response = await fetch('/api/pdf-metadata', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        const count = data.pageCount || 1
        setPageCount(count)
        setPages(Array.from({ length: count }, (_, i) => ({ index: i, originalIndex: i })))
      } else {
        // Default to showing some pages
        setPageCount(1)
        setPages([{ index: 0, originalIndex: 0 }])
      }
    } catch {
      setPageCount(1)
      setPages([{ index: 0, originalIndex: 0 }])
    }
  }, [])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newPages = [...pages]
    const [draggedItem] = newPages.splice(draggedIndex, 1)
    newPages.splice(index, 0, draggedItem)
    setPages(newPages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleDelete = (index: number) => {
    if (pages.length <= 1) return
    setPages(pages.filter((_, i) => i !== index))
  }

  const handleDuplicate = (index: number) => {
    const newPages = [...pages]
    newPages.splice(index + 1, 0, { ...pages[index] })
    setPages(newPages)
  }

  const handleProcess = async () => {
    if (!file || pages.length === 0) return

    setProcessing(true)
    startLoading()
    try {
      // Build operations based on the difference from original
      const operations: Array<{ type: 'delete' | 'move' | 'duplicate'; pageIndex: number; targetIndex?: number }> = []
      
      // Simple approach: extract pages in the new order
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pages', JSON.stringify(pages.map(p => p.originalIndex + 1)))

      // Use the split API with custom pages to reorder
      const response = await fetch('/api/split-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Processing failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'organized.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to organize PDF')
    } finally {
      setProcessing(false)
      stopLoading()
    }
  }

  return (
    <ToolPageLayout
      toolId="organize-pdf"
      title="Organize PDF"
      description="Rearrange, delete, or duplicate pages in your PDF document. Drag and drop to reorder pages exactly how you want them."
    >
      <div className="max-w-4xl mx-auto">
        <BackButton />
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload PDF</p>
                  <p className="text-sm text-muted-foreground">Click or drag and drop your PDF file here</p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">({pages.length} pages)</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null)
                  setPages([])
                  setPageCount(0)
                }}
              >
                Change File
              </Button>
            </div>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Drag pages to reorder. Use the buttons to delete or duplicate pages.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pages.map((page, index) => (
                  <div
                    key={`${page.originalIndex}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'relative group bg-muted rounded-lg p-4 cursor-grab active:cursor-grabbing transition-all',
                      draggedIndex === index && 'opacity-50 scale-95'
                    )}
                  >
                    <div className="aspect-[3/4] bg-white rounded border flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-muted-foreground">
                        {page.originalIndex + 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Page {page.originalIndex + 1}</span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicate(index)}
                        className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                        disabled={pages.length <= 1}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleProcess}
                disabled={processing || pages.length === 0}
                className="min-w-[200px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Organized PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
