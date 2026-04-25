'use client'

import { useState, useMemo } from 'react'
import { RotateCcw } from 'lucide-react'

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
  const [text, setText] = useState('')
  const stats = useMemo(() => analyze(text), [text])

  const statCards = [
    { label: 'Words', value: stats.words, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    { label: 'Characters', value: stats.chars, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { label: 'Chars (no spaces)', value: stats.charsNoSpaces, color: 'bg-indigo-50 border-indigo-200', textColor: 'text-indigo-700' },
    { label: 'Sentences', value: stats.sentences, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
    { label: 'Paragraphs', value: stats.paragraphs, color: 'bg-pink-50 border-pink-200', textColor: 'text-pink-700' },
    { label: 'Reading Time', value: stats.readingTime, color: 'bg-teal-50 border-teal-200', textColor: 'text-teal-700' },
  ]

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Text area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your text here..."
          className="w-full h-64 px-4 py-3 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white font-sans leading-relaxed"
        />
        {text && (
          <button
            onClick={() => setText('')}
            className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-white border border-border px-2.5 py-1 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-xs text-muted-foreground text-center">
        Statistics update instantly as you type. No server required.
      </p>
    </div>
  )
}
