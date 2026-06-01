'use client'

import { useState, useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'

interface Stats {
  words: number
  chars: number
  charsNoSpaces: number
  sentences: number
  paragraphs: number
  readingTime: string
}

function analyze(text: string): Stats {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const chars = text.length
  const charsNoSpaces = text.replace(/\s/g, '').length
  const sentences = text === '' ? 0 : (text.match(/[.!?]+/g) ?? []).length
  const paragraphs = text.trim() === '' ? 0 : text.split(/\n\s*\n/).filter((p) => p.trim() !== '').length || (text.trim() !== '' ? 1 : 0)
  const readingTime = words === 0 ? '< 1 min' : `${Math.ceil(words / 200)} min read`
  return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime }
}

export function WordCounterClient() {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const stats = useMemo(() => analyze(text), [text])

  const statCards = [
    { labelKey: 'wordCounter.words' as const, value: stats.words, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    { labelKey: 'wordCounter.characters' as const, value: stats.chars, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { labelKey: 'wordCounter.charsNoSpaces' as const, value: stats.charsNoSpaces, color: 'bg-indigo-50 border-indigo-200', textColor: 'text-indigo-700' },
    { labelKey: 'wordCounter.sentences' as const, value: stats.sentences, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
    { labelKey: 'wordCounter.paragraphs' as const, value: stats.paragraphs, color: 'bg-pink-50 border-pink-200', textColor: 'text-pink-700' },
    { labelKey: 'wordCounter.readingTime' as const, value: stats.readingTime, color: 'bg-teal-50 border-teal-200', textColor: 'text-teal-700' },
  ]

  return (
    <div className="space-y-5">
      <BackButton />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <div key={card.labelKey} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-xs font-medium text-muted-foreground">{t(card.labelKey)}</p>
            <p className={`text-2xl font-bold mt-1 ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('wordCounter.placeholder')}
          className="w-full h-64 px-4 py-3 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white font-sans leading-relaxed"
        />
        {text && (
          <button
            onClick={() => setText('')}
            className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-white border border-border px-2.5 py-1 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t('wordCounter.clear')}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t('wordCounter.hint')}
      </p>
    </div>
  )
}
