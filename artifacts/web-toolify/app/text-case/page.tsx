import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { TextCaseClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Text Case Converter — Uppercase, Lowercase, Title Case Online',
  description:
    'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
  keywords: ['text case converter', 'uppercase lowercase converter', 'title case online', 'camelCase converter'],
}

export default function TextCasePage() {
  const tool = getToolBySlug('text-case')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <TextCaseClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
