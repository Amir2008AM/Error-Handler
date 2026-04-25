import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { WordCounterClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Word Counter — Count Words & Characters Online Free',
  description:
    'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter tool, no sign-up required.',
  keywords: ['word counter', 'character counter', 'count words online', 'word count tool', 'text analyzer'],
}

export default function WordCounterPage() {
  const tool = getToolBySlug('word-counter')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <WordCounterClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
