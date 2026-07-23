import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { TextCaseClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/text-case' },
  robots: { index: true, follow: true },
  title: { absolute: 'Text Case Converter — Upper Lower Title Case | Toolify' },
  description: 'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
  keywords: ['text case converter', 'uppercase lowercase converter', 'title case online', 'camelCase converter'],
  openGraph: {
    title: 'Text Case Converter — Upper Lower Title Case | Toolify',
    description: 'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
    url: 'https://toolifypdf.online/text-case',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Text Case Converter — Upper Lower Title Case | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Text Case Converter — Upper Lower Title Case | Toolify',
    description: 'Convert text between uppercase, lowercase, title case, sentence case, camelCase, and snake_case instantly. Free online case converter.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function TextCasePage() {
  const tool = getToolBySlug('text-case')!
  return (
    <ToolPageServerLayout tool={tool}>
      <TextCaseClient />
      <ToolInfoSection tips={[
              {
                    "icon": "🔡",
                    "title": "Fix ALL CAPS text",
                    "text": "Convert text pasted from systems that force all-capitals into normal sentence case instantly."
              },
              {
                    "icon": "📰",
                    "title": "Format headings consistently",
                    "text": "Apply title case to headings so every significant word is capitalised without doing it manually."
              },
              {
                    "icon": "🗃️",
                    "title": "Standardise data entries",
                    "text": "Convert mixed-case entries from different sources into a single consistent format before importing."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
