import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { getToolBySlug } from '@/lib/tools'
import { RotatePdfClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Rotate PDF Pages — Toolify',
  description: 'Rotate PDF pages by 90, 180, or 270 degrees. Free online PDF rotation tool with instant processing.',
}

export default function RotatePdfPage() {
  const tool = getToolBySlug('rotate-pdf')
  if (!tool) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <RotatePdfClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
