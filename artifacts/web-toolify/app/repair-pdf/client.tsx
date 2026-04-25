'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Loader2, FileText, Wrench } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'

export function RepairPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      progress.reset()
    }
  }, [progress])

  const handleRepair = async () => {
    if (!file) return

    progress.startProcessing('Uploading PDF...')
    try {
      const formData = new FormData()
      formData.append('file', file)

      progress.updateProgress(20, 'Repairing document...')

      const response = await fetch('/api/repair-pdf', {
        method: 'POST',
        body: formData,
      })

      progress.updateProgress(60, 'Rebuilding structure...')

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Repair failed' }))
        throw new Error(error.error || 'Repair failed')
      }

      progress.updateProgress(85, 'Saving...')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `repaired-${file.name}`
      a.click()
      URL.revokeObjectURL(url)

      progress.complete('PDF repaired successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to repair PDF. The file may be too damaged.'
      progress.fail(message)
    }
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="repair-pdf"
      title="Repair PDF"
      description="Fix corrupted or damaged PDF files. Our tool attempts to recover and repair PDF documents that won't open properly."
    >
      <div className="max-w-2xl mx-auto">
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
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload Damaged PDF</p>
                  <p className="text-sm text-muted-foreground">Click or drag and drop your PDF file here</p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); progress.reset() }} disabled={isProcessing}>
                  Change
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-muted/50">
              <h3 className="font-medium mb-3">What this tool does:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  Attempts to load and parse the PDF structure
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  Recovers all readable pages and content
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  Rebuilds the PDF with a clean structure
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span>
                  Preserves metadata where possible
                </li>
              </ul>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleRepair}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repairing...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Repair & Download</>
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
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
