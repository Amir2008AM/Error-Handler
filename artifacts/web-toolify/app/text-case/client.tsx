'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/back-button'

const conversions = [
  {
    label: 'UPPERCASE',
    description: 'ALL LETTERS CAPITALIZED',
    fn: (t: string) => t.toUpperCase(),
  },
  {
    label: 'lowercase',
    description: 'all letters in small caps',
    fn: (t: string) => t.toLowerCase(),
  },
  {
    label: 'Title Case',
    description: 'First Letter Of Each Word',
    fn: (t: string) =>
      t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
  },
  {
    label: 'Sentence case',
    description: 'First letter of each sentence',
    fn: (t: string) =>
      t
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()),
  },
  {
    label: 'camelCase',
    description: 'joinWordsLikeThis',
    fn: (t: string) =>
      t
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()),
  },
  {
    label: 'snake_case',
    description: 'join_words_like_this',
    fn: (t: string) =>
      t.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
  },
  {
    label: 'kebab-case',
    description: 'join-words-like-this',
    fn: (t: string) =>
      t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  },
  {
    label: 'PascalCase',
    description: 'JoinWordsLikeThis',
    fn: (t: string) =>
      t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).replace(/\s+/g, ''),
  },
]

export function TextCaseClient() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [activeCase, setActiveCase] = useState('')
  const [copied, setCopied] = useState(false)

  const apply = (label: string, fn: (t: string) => string) => {
    setActiveCase(label)
    setOutput(fn(input))
  }

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <BackButton />
      {/* Case Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {conversions.map(({ label, description, fn }) => (
          <button
            key={label}
            onClick={() => apply(label, fn)}
            className={cn(
              'text-left p-3 rounded-xl border transition-all',
              activeCase === label
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border hover:border-primary/30 hover:bg-muted/50'
            )}
          >
            <p className="text-xs font-bold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          </button>
        ))}
      </div>

      {/* Input */}
      <div>
        <label className="text-sm font-semibold text-foreground block mb-2">Input Text</label>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (activeCase) {
              const conv = conversions.find((c) => c.label === activeCase)
              if (conv) setOutput(conv.fn(e.target.value))
            }
          }}
          placeholder="Type or paste your text here..."
          className="w-full h-36 px-4 py-3 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white font-sans leading-relaxed"
        />
      </div>

      {/* Output */}
      {output && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">
              Result — <span className="text-primary">{activeCase}</span>
            </label>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <div className="w-full min-h-36 px-4 py-3 border border-border rounded-xl text-sm bg-muted/30 font-sans leading-relaxed whitespace-pre-wrap break-words">
            {output}
          </div>
        </div>
      )}
    </div>
  )
}
