import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { TextCaseClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/text-case' },
  robots: { index: true, follow: true },
  title: 'Text Case Converter: Uppercase, Lowercase & Title Case',
  description:
    'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
  keywords: ['text case converter', 'uppercase lowercase converter', 'title case online', 'camelCase converter'],
}

export default function TextCasePage() {
  const tool = getToolBySlug('text-case')!
  return (
    <ToolPageServerLayout tool={tool}>
      <TextCaseClient />
    </ToolPageServerLayout>
  )
}
