import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { WordCounterClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/word-counter' },
  robots: { index: true, follow: true },
  title: 'Word Counter — Count Words & Characters Online Free',
  description:
    'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
  keywords: ['word counter', 'character counter', 'count words online', 'word count tool', 'text analyzer'],
}

export default function WordCounterPage() {
  const tool = getToolBySlug('word-counter')!
  return (
    <ToolPageServerLayout tool={tool}>
      <WordCounterClient />
    </ToolPageServerLayout>
  )
}
