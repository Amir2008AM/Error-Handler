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
        <div className="mb-12 flex items-center gap-1.5 font-black tracking-[-0.08em]" dir="ltr" aria-label="I love PDF">
          <span className="text-[27px] leading-none">I</span>
          <span className="relative inline-flex size-7 items-center justify-center text-[#ef2b2d]" aria-hidden="true">
            <span className="absolute top-0 size-5 rotate-45 rounded-[3px] bg-[#ef2b2d]" />
            <span className="absolute left-0 top-1 size-5 rotate-45 rounded-[3px] bg-[#ef2b2d]" />
          </span>
          <span className="text-[27px] leading-none">PDF</span>
        </div>

        {fileName ? (
          <>
            <h1 className="text-[25px] font-medium leading-tight sm:text-[29px]">{isComplete ? 'اكتمل تجهيز ملفك' : 'رفع الملف 1 من 1'}</h1>
            <div className="mt-1 flex max-w-full items-center gap-1.5 text-[16px] font-bold" dir="ltr">
              <FileText className="size-4 text-[#ef2b2d]" aria-hidden="true" />
              <span className="max-w-[min(80vw,560px)] truncate">{fileName}</span>
            </div>
            {hasError ? (
              <div className="mt-8 flex flex-col items-center gap-3" role="alert">
                <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
                <p className="text-base text-destructive">{error ?? 'حدث خطأ أثناء معالجة الملف'}</p>
                {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RotateCcw data-icon="inline-start" />إعادة المحاولة</Button>}
              </div>
            ) : (
              <>
                <p className="mt-8 text-[15px] text-[#252525]">{isComplete ? 'تم الرفع والمعالجة بنجاح' : 'الوقت المتبقي 28 ثانية · سرعة الرفع 74 KB/S'}</p>
                <div className="mt-5 w-full max-w-[800px]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isComplete ? 100 : 43} aria-label="نسبة التقدم">
                  <div className="h-[22px] w-full bg-white p-0.5 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]">
                    <div className="h-full bg-[#ef2b2d] transition-[width] duration-500" style={{ width: isComplete ? '100%' : '43%' }} />
                  </div>
                </div>
                <div className="mt-4 text-[44px] font-bold leading-none tracking-[-0.04em]">{isComplete ? '100%' : '43%'}</div>
                <div className="mt-3 flex items-center gap-2 text-[22px] font-medium">
                  {!isComplete && <Loader2 className="size-5 animate-spin text-[#ef2b2d]" aria-hidden="true" />}
                  <span>{isComplete ? 'تم الرفع' : 'جارٍ الرفع'}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full">{children}</div>
        )}

        {isComplete && <div className="mt-8 w-full">{children}</div>}
        {fileName && onChangeFile && <Button className="mt-8" variant="ghost" size="sm" onClick={onChangeFile} disabled={status === 'processing'}>تغيير الملف</Button>}
      </div>
    </section>
  )
}

export type { ProcessingWorkspaceProps }
