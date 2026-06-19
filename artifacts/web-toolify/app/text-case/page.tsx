import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { TextCaseClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/text-case' },
  robots: { index: true, follow: true },
  title: { absolute: 'Text Case Converter — Upper Lower Title Case | Toolify' },
  description: 'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
  keywords: ['text case converter', 'uppercase lowercase converter', 'title case online', 'camelCase converter'],
  openGraph: {
    title: 'Text Case Converter — Upper Lower Title Case | Toolify',
    description: 'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
    url: 'https://www.toolifypdf.online/text-case',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Text Case Converter — Upper Lower Title Case | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Text Case Converter — Upper Lower Title Case | Toolify',
    description: 'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function TextCasePage() {
  const tool = getToolBySlug('text-case')!
  return (
    <ToolPageServerLayout tool={tool}>
      <TextCaseClient />
    </ToolPageServerLayout>
  )
}
