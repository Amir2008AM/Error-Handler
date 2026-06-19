import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { WordCounterClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/word-counter' },
  robots: { index: true, follow: true },
  title: { absolute: 'Word Counter — Count Words & Characters Free | Toolify' },
  description: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
  keywords: ['word counter', 'character counter', 'count words online', 'word count tool', 'text analyzer'],
  openGraph: {
    title: 'Word Counter — Count Words & Characters Free | Toolify',
    description: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
    url: 'https://www.toolifypdf.online/word-counter',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Word Counter — Count Words & Characters Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Counter — Count Words & Characters Free | Toolify',
    description: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function WordCounterPage() {
  const tool = getToolBySlug('word-counter')!
  return (
    <ToolPageServerLayout tool={tool}>
      <WordCounterClient />
    </ToolPageServerLayout>
  )
}
