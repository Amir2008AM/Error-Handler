'use client'

import { FileText, Loader2, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProgressStatus } from '@/components/real-progress-bar'

interface ProcessingWorkspaceProps {
  fileName?: string
  status: ProgressStatus
  error?: string
  onRetry?: () => void
  onChangeFile?: () => void
  children: React.ReactNode
}

export function ProcessingWorkspace({
  fileName,
  status,
  error,
  onRetry,
  onChangeFile,
  children,
}: ProcessingWorkspaceProps) {
  const hasError = status === 'error'
  const isComplete = status === 'completed'

  return (
    <section dir="rtl" className="relative min-h-[500px] overflow-hidden rounded-[2px] bg-[#f7f7fb] px-4 py-10 text-[#161616] font-[Arial,sans-serif] sm:px-8 sm:py-12" aria-label="Processing workspace">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="mb-12" dir="ltr">
          <div className="text-2xl font-bold tracking-tight text-primary">ToolifyPDF</div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">Simple tools. Better documents.</div>
        </div>

        {fileName ? (
          <>
            <h1 className="text-[25px] font-semibold leading-tight text-foreground sm:text-[29px]">{isComplete ? 'Your file is ready' : 'Preparing your file'}</h1>
            <div className="mt-1 flex max-w-full items-center gap-1.5 text-[16px] font-bold" dir="ltr">
              <FileText className="size-4 text-primary" aria-hidden="true" />
              <span className="max-w-[min(80vw,560px)] truncate">{fileName}</span>
            </div>
            {hasError ? (
              <div className="mt-8 flex flex-col items-center gap-3" role="alert">
                <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
                <p className="text-base text-destructive">{error ?? 'Something went wrong while processing this file.'}</p>
                {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RotateCcw data-icon="inline-start" />Try again</Button>}
              </div>
            ) : (
              <>
                <p className="mt-8 text-[15px] text-muted-foreground">{isComplete ? 'Processing completed successfully.' : 'We are securely preparing your document.'}</p>
                <div className="mt-5 w-full max-w-[800px]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isComplete ? 100 : 43} aria-label="نسبة التقدم">
                  <div className="h-3 w-full rounded-full bg-muted p-0.5">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: isComplete ? '100%' : '43%' }} />
                  </div>
                </div>
                <div className="mt-4 text-[44px] font-bold leading-none tracking-[-0.04em]">{isComplete ? '100%' : '43%'}</div>
                <div className="mt-3 flex items-center gap-2 text-[22px] font-medium">
                  {!isComplete && <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />}
                  <span>{isComplete ? 'Ready to download' : 'Working on it'}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full">{children}</div>
        )}

        {isComplete && <div className="mt-8 w-full">{children}</div>}
        {fileName && onChangeFile && <Button className="mt-8" variant="ghost" size="sm" onClick={onChangeFile} disabled={status === 'processing'}>Choose a different file</Button>}
      </div>
    </section>
  )
}

export type { ProcessingWorkspaceProps }
