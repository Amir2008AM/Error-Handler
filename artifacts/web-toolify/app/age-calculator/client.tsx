'use client'

import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { BackButton } from '@/components/back-button'

interface AgeResult {
  years: number
  months: number
  days: number
  totalDays: number
  totalMonths: number
  totalWeeks: number
  nextBirthday: string
  daysUntilBirthday: number
}

function calculateAge(dob: string, target: string): AgeResult | null {
  const d = new Date(dob)
  const t = new Date(target)
  if (isNaN(d.getTime()) || isNaN(t.getTime()) || d > t) return null

  let years = t.getFullYear() - d.getFullYear()
  let months = t.getMonth() - d.getMonth()
  let days = t.getDate() - d.getDate()

  if (days < 0) {
    months--
    const prevMonth = new Date(t.getFullYear(), t.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  const totalDays = Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  const totalMonths = years * 12 + months
  const totalWeeks = Math.floor(totalDays / 7)

  // Next birthday
  const nextBd = new Date(t.getFullYear(), d.getMonth(), d.getDate())
  if (nextBd <= t) nextBd.setFullYear(nextBd.getFullYear() + 1)
  const daysUntilBirthday = Math.ceil((nextBd.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))
  const nextBirthday = nextBd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return { years, months, days, totalDays, totalMonths, totalWeeks, nextBirthday, daysUntilBirthday }
}

export function AgeCalculatorClient() {
  const [dob, setDob] = useState('')
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0])

  const result = useMemo(() => {
    if (!dob) return null
    return calculateAge(dob, targetDate)
  }, [dob, targetDate])

  return (
    <div className="space-y-5 max-w-lg">
      <BackButton />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Date of Birth</label>
          <input
            type="date"
            value={dob}
            max={targetDate}
            onChange={(e) => setDob(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Calculate Age As Of</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
          />
        </div>
      </div>

      {result === null && dob && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          Date of birth must be before the target date.
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Primary result */}
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">Your exact age</p>
            <div className="flex items-end gap-2 flex-wrap">
              <span className="text-5xl font-bold text-pink-700">{result.years}</span>
              <span className="text-2xl font-medium text-pink-500 mb-1">years</span>
              <span className="text-2xl font-bold text-pink-700 mb-0.5">{result.months}</span>
              <span className="text-lg font-medium text-pink-500 mb-1">months</span>
              <span className="text-2xl font-bold text-pink-700 mb-0.5">{result.days}</span>
              <span className="text-lg font-medium text-pink-500 mb-1">days</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Months', value: result.totalMonths.toLocaleString() },
              { label: 'Total Weeks', value: result.totalWeeks.toLocaleString() },
              { label: 'Total Days', value: result.totalDays.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Next birthday */}
          <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Next Birthday: {result.nextBirthday}</p>
              <p className="text-xs text-muted-foreground">
                {result.daysUntilBirthday === 0
                  ? 'Today! Happy Birthday!'
                  : `${result.daysUntilBirthday} days away`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
