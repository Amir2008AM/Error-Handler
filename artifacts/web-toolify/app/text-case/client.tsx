'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/translations'

type ConversionKey = 'uppercase' | 'lowercase' | 'titleCase' | 'sentenceCase' | 'camelCase' | 'snakeCase' | 'kebabCase' | 'pascalCase'

interface Conversion {
  key: ConversionKey
  labelKey: TranslationKey
  descKey: TranslationKey
  fn: (t: string) => string
}

const conversions: Conversion[] = [
  {
    key: 'uppercase',
    labelKey: 'textCase.uppercase',
    descKey: 'textCase.uppercaseDesc',
    fn: (t) => t.toUpperCase(),
  },
  {
    key: 'lowercase',
    labelKey: 'textCase.lowercase',
    descKey: 'textCase.lowercaseDesc',
    fn: (t) => t.toLowerCase(),
  },
  {
    key: 'titleCase',
    labelKey: 'textCase.titleCase',
    descKey: 'textCase.titleCaseDesc',
    fn: (t) => t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
  },
  {
    key: 'sentenceCase',
    labelKey: 'textCase.sentenceCase',
    descKey: 'textCase.sentenceCaseDesc',
    fn: (t) => t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()),
  },
  {
    key: 'camelCase',
    labelKey: 'textCase.camelCase',
    descKey: 'textCase.camelCaseDesc',
    fn: (t) => t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()),
  },
  {
    key: 'snakeCase',
    labelKey: 'textCase.snakeCase',
    descKey: 'textCase.snakeCaseDesc',
    fn: (t) => t.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
  },
  {
    key: 'kebabCase',
    labelKey: 'textCase.kebabCase',
    descKey: 'textCase.kebabCaseDesc',
    fn: (t) => t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  },
  {
    key: 'pascalCase',
    labelKey: 'textCase.pascalCase',
    descKey: 'textCase.pascalCaseDesc',
    fn: (t) => t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).replace(/\s+/g, ''),
  },
]

export function TextCaseClient() {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [activeKey, setActiveKey] = useState<ConversionKey | ''>('')
  const [copied, setCopied] = useState(false)

  const apply = (key: ConversionKey, fn: (s: string) => string) => {
    setActiveKey(key)
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {conversions.map(({ key, labelKey, descKey, fn }) => (
          <button
            key={key}
            onClick={() => apply(key, fn)}
            className={cn(
              'text-left p-3 rounded-xl border transition-all',
              activeKey === key
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border hover:border-primary/30 hover:bg-muted/50'
            )}
          >
            <p className="text-xs font-bold text-foreground">{t(labelKey)}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{t(descKey)}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground block mb-2">{t('textCase.inputText')}</label>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (activeKey) {
              const conv = conversions.find((c) => c.key === activeKey)
              if (conv) setOutput(conv.fn(e.target.value))
            }
          }}
          placeholder={t('textCase.placeholder')}
          className="w-full h-36 px-4 py-3 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white font-sans leading-relaxed"
        />
      </div>

      {output && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">
              {t('textCase.result')} — <span className="text-primary">{activeKey ? t(conversions.find(c => c.key === activeKey)!.labelKey) : ''}</span>
            </label>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied
                ? <><Check className="w-3 h-3 text-green-600" /> {t('textCase.copiedExcl')}</>
                : <><Copy className="w-3 h-3" /> {t('common.copy')}</>
              }
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
