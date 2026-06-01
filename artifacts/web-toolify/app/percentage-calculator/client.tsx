'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/translations'

type CalcMode = 'whatPercent' | 'percentOf' | 'increase' | 'decrease'

interface ModeConfig {
  labelKey: TranslationKey
  descKey: TranslationKey
  inputs: { id: string; labelKey: TranslationKey; placeholder: string }[]
  compute: (vals: Record<string, string>) => string | null
}

const modes: Record<CalcMode, ModeConfig> = {
  whatPercent: {
    labelKey: 'pct.whatPercent',
    descKey: 'pct.whatPercentDesc',
    inputs: [
      { id: 'x', labelKey: 'pct.valueX', placeholder: 'e.g. 25' },
      { id: 'y', labelKey: 'pct.totalY', placeholder: 'e.g. 200' },
    ],
    compute: ({ x, y }) => {
      const nx = parseFloat(x), ny = parseFloat(y)
      if (isNaN(nx) || isNaN(ny) || ny === 0) return null
      return `${((nx / ny) * 100).toFixed(4).replace(/\.?0+$/, '')}%`
    },
  },
  percentOf: {
    labelKey: 'pct.percentOf',
    descKey: 'pct.percentOfDesc',
    inputs: [
      { id: 'pct', labelKey: 'pct.percentage', placeholder: 'e.g. 15' },
      { id: 'y', labelKey: 'pct.ofNumber', placeholder: 'e.g. 500' },
    ],
    compute: ({ pct, y }) => {
      const np = parseFloat(pct), ny = parseFloat(y)
      if (isNaN(np) || isNaN(ny)) return null
      return `${((np / 100) * ny).toFixed(4).replace(/\.?0+$/, '')}`
    },
  },
  increase: {
    labelKey: 'pct.increaseBy',
    descKey: 'pct.increaseByDesc',
    inputs: [
      { id: 'base', labelKey: 'pct.originalValue', placeholder: 'e.g. 100' },
      { id: 'pct', labelKey: 'pct.increasePercent', placeholder: 'e.g. 20' },
    ],
    compute: ({ base, pct }) => {
      const nb = parseFloat(base), np = parseFloat(pct)
      if (isNaN(nb) || isNaN(np)) return null
      const result = nb * (1 + np / 100)
      return `${result.toFixed(4).replace(/\.?0+$/, '')} (+${(nb * np / 100).toFixed(2)})`
    },
  },
  decrease: {
    labelKey: 'pct.decreaseBy',
    descKey: 'pct.decreaseByDesc',
    inputs: [
      { id: 'base', labelKey: 'pct.originalValue', placeholder: 'e.g. 200' },
      { id: 'pct', labelKey: 'pct.decreasePercent', placeholder: 'e.g. 25' },
    ],
    compute: ({ base, pct }) => {
      const nb = parseFloat(base), np = parseFloat(pct)
      if (isNaN(nb) || isNaN(np)) return null
      const result = nb * (1 - np / 100)
      return `${result.toFixed(4).replace(/\.?0+$/, '')} (-${(nb * np / 100).toFixed(2)})`
    },
  },
}

export function PercentageCalculatorClient() {
  const { t } = useI18n()
  const [mode, setMode] = useState<CalcMode>('whatPercent')
  const [values, setValues] = useState<Record<string, string>>({})

  const config = modes[mode]
  const result = config.compute(values)

  const handleModeChange = (m: CalcMode) => {
    setMode(m)
    setValues({})
  }

  return (
    <div className="space-y-5 max-w-lg">
      <BackButton />
      <div>
        <label className="text-sm font-semibold text-foreground block mb-3">{t('pct.calcType')}</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(modes) as [CalcMode, ModeConfig][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={cn(
                'text-left p-3 rounded-xl border transition-all',
                mode === key
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/30'
              )}
            >
              <p className="text-xs font-bold text-foreground">{t(cfg.labelKey)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t(cfg.descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {config.inputs.map((inp) => (
          <div key={inp.id}>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              {t(inp.labelKey)}
            </label>
            <input
              type="number"
              value={values[inp.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [inp.id]: e.target.value }))}
              placeholder={inp.placeholder}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
            />
          </div>
        ))}
      </div>

      {result !== null && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">{t('pct.result')}</p>
          <p className="text-3xl font-bold text-primary">{result}</p>
        </div>
      )}
    </div>
  )
}
