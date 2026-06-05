import type { Metadata } from 'next'
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
    <ToolPageLayout tool={tool}>
      <TextCaseClient />
    </ToolPageLayout>
  )
}
