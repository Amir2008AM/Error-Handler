'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Download, Loader2, Table, Settings } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { useLoadingBar } from '@/components/global-loading-bar'
import { BackButton } from '@/components/back-button'

const tool = getToolBySlug('excel-to-pdf')!

export function ExcelToPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const { startLoading, stopLoading } = useLoadingBar()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase()
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
        setFile(selectedFile)
      } else {
        alert('Please upload an Excel file (.xlsx, .xls, or .csv)')
      }
    }
  }, [])

  const handleConvert = async () => {
    if (!file) return

    setProcessing(true)
    startLoading()
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pageSize', pageSize)
      formData.append('orientation', orientation)

      const response = await fetch('/api/excel-to-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.(xlsx?|xls|csv)$/i, '.pdf')
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to convert spreadsheet')
    } finally {
      setProcessing(false)
      stopLoading()
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload Excel File</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
              </div>
            </Card>
          </label>
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
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
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
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as typeof pageSize)}>
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
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as typeof orientation)}>
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

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={processing}
                className="min-w-[200px]"
              >
                {processing ? (
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
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
