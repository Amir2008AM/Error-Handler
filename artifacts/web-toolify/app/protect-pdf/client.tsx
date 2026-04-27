'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Download, Loader2, FileText, Lock, Eye, EyeOff } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'

export function ProtectPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      progress.reset()
    }
  }, [progress])

  const handleProtect = async () => {
    if (!file) return

    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', password)

      const response = await xhrUpload({
        url: '/api/protect-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!response.ok) throw new Error('Protection failed')

      progress.stageProcessing(undefined, 'Encrypting PDF...')

      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `protected-${file.name}`
      a.click()
      URL.revokeObjectURL(url)

      progress.stageDone('PDF protected!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to protect PDF'
      setError(message)
      progress.fail(message)
    }
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="protect-pdf"
      title="Protect PDF"
      description="Add password protection to your PDF documents. Keep your sensitive files secure with encryption."
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
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload PDF to Protect</p>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setFile(null); progress.reset() }}
                  disabled={isProcessing}
                >
                  Change
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium mb-2 block">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  disabled={isProcessing}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleProtect}
                disabled={isProcessing || !password}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Protecting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Protect & Download
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
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
