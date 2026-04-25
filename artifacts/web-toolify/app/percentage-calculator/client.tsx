'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type CalcMode = 'whatPercent' | 'percentOf' | 'increase' | 'decrease'

interface ModeConfig {
  label: string
  description: string
  inputs: { id: string; label: string; placeholder: string }[]
  compute: (vals: Record<string, string>) => string | null
}

const modes: Record<CalcMode, ModeConfig> = {
  whatPercent: {
    label: 'What % is X of Y?',
    description: 'Find what percentage one number is of another',
    inputs: [
      { id: 'x', label: 'Value (X)', placeholder: 'e.g. 25' },
      { id: 'y', label: 'Total (Y)', placeholder: 'e.g. 200' },
    ],
    compute: ({ x, y }) => {
      const nx = parseFloat(x), ny = parseFloat(y)
      if (isNaN(nx) || isNaN(ny) || ny === 0) return null
      return `${((nx / ny) * 100).toFixed(4).replace(/\.?0+$/, '')}%`
    },
  },
  percentOf: {
    label: 'X% of Y = ?',
    description: 'Calculate a percentage of a number',
    inputs: [
      { id: 'pct', label: 'Percentage (%)', placeholder: 'e.g. 15' },
      { id: 'y', label: 'Of number (Y)', placeholder: 'e.g. 500' },
    ],
    compute: ({ pct, y }) => {
      const np = parseFloat(pct), ny = parseFloat(y)
      if (isNaN(np) || isNaN(ny)) return null
      return `${((np / 100) * ny).toFixed(4).replace(/\.?0+$/, '')}`
    },
  },
  increase: {
    label: 'Increase by %',
    description: 'Add a percentage to a value (e.g. price + tax)',
    inputs: [
      { id: 'base', label: 'Original value', placeholder: 'e.g. 100' },
      { id: 'pct', label: 'Increase by (%)', placeholder: 'e.g. 20' },
    ],
    compute: ({ base, pct }) => {
      const nb = parseFloat(base), np = parseFloat(pct)
      if (isNaN(nb) || isNaN(np)) return null
      const result = nb * (1 + np / 100)
      return `${result.toFixed(4).replace(/\.?0+$/, '')} (+${(nb * np / 100).toFixed(2)})`
    },
  },
  decrease: {
    label: 'Decrease by %',
    description: 'Subtract a percentage from a value (e.g. discount)',
    inputs: [
      { id: 'base', label: 'Original value', placeholder: 'e.g. 200' },
      { id: 'pct', label: 'Decrease by (%)', placeholder: 'e.g. 25' },
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
      {/* Mode Tabs */}
      <div>
        <label className="text-sm font-semibold text-foreground block mb-3">Calculation Type</label>
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
              <p className="text-xs font-bold text-foreground">{cfg.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{cfg.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        {config.inputs.map((inp) => (
          <div key={inp.id}>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              {inp.label}
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

      {/* Result */}
      {result !== null && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Result</p>
          <p className="text-3xl font-bold text-primary">{result}</p>
        </div>
      )}
    </div>
  )
}
