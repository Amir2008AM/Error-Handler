import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { WordCounterClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/word-counter' },
  robots: { index: true, follow: true },
  title: { absolute: 'Word Counter — Count Words & Characters Free | Toolify' },
  description: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
  keywords: ['word counter', 'character counter', 'count words online', 'word count tool', 'text analyzer'],
  openGraph: {
    title: 'Word Counter — Count Words & Characters Free | Toolify',
    description: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
    url: 'https://toolifypdf.online/word-counter',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Word Counter — Count Words & Characters Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Counter — Count Words & Characters Free | Toolify',
    description: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function WordCounterPage() {
  const tool = getToolBySlug('word-counter')!
  return (
    <ToolPageServerLayout tool={tool}>
      <WordCounterClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📝",
                    "title": "Check essay or assignment length",
                    "text": "Verify a draft meets a required word count before submitting to a teacher or editor."
              },
              {
                    "icon": "🐦",
                    "title": "Stay within character limits",
                    "text": "Count characters to keep posts within Twitter's 280-character or LinkedIn's platform limits."
              },
              {
                    "icon": "⏱️",
                    "title": "Estimate reading time",
                    "text": "Average reading speed is roughly 200–250 words per minute — use the count to gauge how long your article takes to read."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
