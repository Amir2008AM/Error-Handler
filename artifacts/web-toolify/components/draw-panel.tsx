'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Public types ──────────────────────────────────────────────────────────────

export type PenType =
  | 'pen' | 'fountain' | 'pencil' | 'calligraphy'
  | 'brush' | 'marker' | 'signature' | 'dashed'

export type HlType =
  | 'standard' | 'soft' | 'wide' | 'gradient' | 'curved' | 'dotted'

export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export type BrushPreset = {
  color: string
  size: number
  opacity: number
  style: StrokeStyle
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PEN_PRESETS: Record<PenType, BrushPreset> = {
  pen:         { color: '#2563eb', size: 3,  opacity: 1,    style: 'solid'  },
  fountain:    { color: '#7c3aed', size: 4,  opacity: 0.95, style: 'solid'  },
  pencil:      { color: '#64748b', size: 2,  opacity: 0.65, style: 'solid'  },
  calligraphy: { color: '#1e293b', size: 6,  opacity: 1,    style: 'solid'  },
  brush:       { color: '#dc2626', size: 12, opacity: 0.75, style: 'solid'  },
  marker:      { color: '#f59e0b', size: 16, opacity: 0.60, style: 'solid'  },
  signature:   { color: '#1e293b', size: 2,  opacity: 1,    style: 'solid'  },
  dashed:      { color: '#0891b2', size: 3,  opacity: 1,    style: 'dashed' },
}

export const DEFAULT_HL_PRESETS: Record<HlType, BrushPreset> = {
  standard: { color: '#fde047', size: 22, opacity: 0.40, style: 'solid'  },
  soft:     { color: '#86efac', size: 32, opacity: 0.28, style: 'solid'  },
  wide:     { color: '#c4b5fd', size: 44, opacity: 0.32, style: 'solid'  },
  gradient: { color: '#fb923c', size: 26, opacity: 0.38, style: 'solid'  },
  curved:   { color: '#67e8f9', size: 20, opacity: 0.44, style: 'solid'  },
  dotted:   { color: '#f472b6', size: 14, opacity: 0.55, style: 'dotted' },
}

// ─── SVG Tool Icons ────────────────────────────────────────────────────────────

function PenSvgIcon({ type }: { type: PenType }) {
  const shadow: React.CSSProperties = { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }
  switch (type) {
    case 'pen': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="4" y="1" width="12" height="32" rx="6" fill="#e8ecf1" />
        <rect x="4" y="1" width="5" height="32" rx="5" fill="rgba(255,255,255,0.45)" />
        <rect x="13" y="4" width="2" height="26" rx="1" fill="rgba(0,0,0,0.07)" />
        <rect x="4" y="29" width="12" height="6" rx="2" fill="#9eaab8" />
        <rect x="4" y="30" width="12" height="1.5" fill="rgba(255,255,255,0.35)" />
        <path d="M5 35 L10 51 L15 35Z" fill="#c8d2de" />
        <path d="M8 46 L10 51 L12 46Z" fill="#6b7a8d" />
        <circle cx="10" cy="51" r="1.5" fill="#3d4a58" />
      </svg>
    )
    case 'fountain': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="4" y="1" width="12" height="26" rx="6" fill="#e8ecf1" />
        <rect x="4" y="1" width="5" height="26" rx="5" fill="rgba(255,255,255,0.45)" />
        <rect x="4" y="24" width="12" height="8" rx="2" fill="#9eaab8" />
        <rect x="5" y="25" width="10" height="1" fill="rgba(255,255,255,0.35)" />
        <rect x="5" y="27" width="10" height="1" fill="rgba(255,255,255,0.2)" />
        <rect x="5" y="29" width="10" height="1" fill="rgba(255,255,255,0.15)" />
        <path d="M4 32 Q10 28 16 32 L14 51 Q10 54 6 51 Z" fill="#d2dae6" />
        <path d="M6 33 Q10 30 14 33 L12 50 Q10 52 8 50 Z" fill="#b8c4d2" />
        <line x1="10" y1="34" x2="10" y2="50" stroke="rgba(50,70,90,0.3)" strokeWidth="0.9" />
        <circle cx="10" cy="51" r="1" fill="#5a6a7a" />
      </svg>
    )
    case 'pencil': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="5" y="1" width="10" height="5" rx="2.5" fill="#f0a0a0" />
        <rect x="5" y="6" width="10" height="2" fill="#a0a8b0" />
        <rect x="5" y="8" width="10" height="27" fill="#f5e090" />
        <rect x="5" y="8" width="3.5" height="27" fill="#edd878" />
        <rect x="5" y="8" width="1.5" height="27" fill="rgba(255,255,255,0.32)" />
        <rect x="13" y="8" width="2" height="27" fill="rgba(0,0,0,0.07)" />
        <path d="M5 35 L10 52 L15 35Z" fill="#c8a848" />
        <path d="M7.5 43 L10 52 L12.5 43Z" fill="#eee8cc" />
        <path d="M9.2 49 L10 52 L10.8 49Z" fill="#3a3a3a" />
      </svg>
    )
    case 'calligraphy': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="4" y="1" width="12" height="28" rx="5" fill="#e8ecf1" />
        <rect x="4" y="1" width="5" height="28" rx="5" fill="rgba(255,255,255,0.45)" />
        <rect x="4" y="26" width="12" height="6" rx="1.5" fill="#9eaab8" />
        <rect x="4" y="27" width="12" height="1" fill="rgba(255,255,255,0.35)" />
        <rect x="3" y="32" width="14" height="20" rx="1.5" fill="#d2dae6" />
        <rect x="3" y="32" width="6" height="20" rx="1.5" fill="rgba(255,255,255,0.22)" />
        <rect x="3" y="32" width="14" height="3.5" rx="1.5" fill="#aebace" />
        <rect x="3" y="50" width="14" height="2.5" rx="1" fill="#8899aa" />
      </svg>
    )
    case 'brush': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="7.5" y="1" width="5" height="26" rx="2.5" fill="#c8956a" />
        <rect x="7.5" y="1" width="2" height="26" rx="2" fill="rgba(255,255,255,0.32)" />
        <rect x="6.5" y="24" width="7" height="6" rx="1.5" fill="#8899aa" />
        <rect x="6.5" y="25" width="7" height="1" fill="rgba(255,255,255,0.4)" />
        <rect x="6.5" y="28" width="7" height="1" fill="rgba(0,0,0,0.15)" />
        <path d="M6 30 Q10 27 14 30 L13 51 Q10 54 7 51 Z" fill="#f2f2f2" />
        <path d="M7.5 31 Q10 28.5 12.5 31 L11.5 50 Q10 53 8.5 50 Z" fill="rgba(0,0,0,0.05)" />
        <path d="M9.2 47 L10 54 L10.8 47 Z" fill="#c8c8c8" />
      </svg>
    )
    case 'marker': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="3" y="1" width="14" height="9" rx="5" fill="#b0bac8" />
        <rect x="3" y="1" width="6" height="9" rx="5" fill="rgba(255,255,255,0.28)" />
        <rect x="3" y="8" width="14" height="27" rx="2" fill="#e8ecf1" />
        <rect x="3" y="8" width="6" height="27" rx="2" fill="rgba(255,255,255,0.38)" />
        <rect x="3" y="33" width="14" height="5" rx="1.5" fill="#9eaab8" />
        <rect x="3" y="34" width="14" height="1" fill="rgba(255,255,255,0.3)" />
        <path d="M3 38 L6 52 L14 52 L17 38Z" fill="#c8d2de" />
        <rect x="6" y="50" width="8" height="2.5" rx="1" fill="#6b7a8d" />
      </svg>
    )
    case 'signature': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="7" y="1" width="6" height="33" rx="3" fill="#e8ecf1" />
        <rect x="7" y="1" width="2.5" height="33" rx="2.5" fill="rgba(255,255,255,0.5)" />
        <rect x="6.5" y="31" width="7" height="5" rx="1.5" fill="#9eaab8" />
        <path d="M7.5 36 L10 52 L12.5 36Z" fill="#c8d2de" />
        <path d="M9.2 48 L10 52 L10.8 48Z" fill="#5a6a7a" />
        <circle cx="10" cy="52" r="1.2" fill="#2d3a48" />
      </svg>
    )
    case 'dashed': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow}>
        <rect x="4" y="1" width="12" height="32" rx="6" fill="#e8ecf1" />
        <rect x="4" y="1" width="5" height="32" rx="5" fill="rgba(255,255,255,0.45)" />
        <line x1="6.5" y1="11" x2="13.5" y2="11" stroke="#7a8a9a" strokeWidth="1.6" strokeDasharray="2.8,2.4" />
        <line x1="6.5" y1="17" x2="13.5" y2="17" stroke="#7a8a9a" strokeWidth="1.6" strokeDasharray="2.8,2.4" />
        <line x1="6.5" y1="23" x2="13.5" y2="23" stroke="#7a8a9a" strokeWidth="1.6" strokeDasharray="2.8,2.4" />
        <rect x="4" y="29" width="12" height="6" rx="2" fill="#9eaab8" />
        <path d="M5 35 L10 51 L15 35Z" fill="#c8d2de" />
        <path d="M8 46 L10 51 L12 46Z" fill="#6b7a8d" />
        <circle cx="10" cy="51" r="1.5" fill="#3d4a58" />
      </svg>
    )
    default: return null
  }
}

function HlSvgIcon({ type }: { type: HlType }) {
  const shadow: React.CSSProperties = { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }
  const caps: Record<HlType, string> = {
    standard: '#fbbf24',
    soft:     '#4ade80',
    wide:     '#a78bfa',
    gradient: '#f97316',
    curved:   '#22d3ee',
    dotted:   '#ec4899',
  }
  const tips: Record<HlType, string> = {
    standard: '#fde68a',
    soft:     '#bbf7d0',
    wide:     '#ddd6fe',
    gradient: '#fed7aa',
    curved:   '#a5f3fc',
    dotted:   '#fbcfe8',
  }
  const cap = caps[type]
  const tip = tips[type]
  const shadow2: React.CSSProperties = shadow

  switch (type) {
    case 'standard':
    case 'gradient':
    default: return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow2}>
        <rect x="3" y="1" width="14" height="13" rx="6" fill={cap} />
        <rect x="3" y="1" width="6" height="13" rx="6" fill="rgba(255,255,255,0.3)" />
        <rect x="3" y="12" width="14" height="24" rx="2" fill="#f0f1f3" />
        <rect x="3" y="12" width="6" height="24" rx="2" fill="rgba(255,255,255,0.42)" />
        <rect x="3" y="34" width="14" height="5" rx="1.5" fill="#9eaab8" />
        <rect x="3" y="35" width="14" height="1" fill="rgba(255,255,255,0.3)" />
        <path d="M3 39 L6 53 L14 53 L17 39Z" fill={tip} />
        <rect x="6" y="51" width="8" height="2.5" rx="1" fill={cap} opacity="0.85" />
      </svg>
    )
    case 'soft': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow2}>
        <rect x="3" y="1" width="14" height="13" rx="7" fill={cap} />
        <rect x="3" y="1" width="5.5" height="13" rx="7" fill="rgba(255,255,255,0.3)" />
        <rect x="3" y="12" width="14" height="24" rx="3" fill="#f0f1f3" />
        <rect x="3" y="12" width="5.5" height="24" rx="3" fill="rgba(255,255,255,0.42)" />
        <rect x="4" y="34" width="12" height="5" rx="2" fill="#9eaab8" />
        <path d="M4 39 Q10 36 16 39 L13 51 Q10 54 7 51 Z" fill={tip} />
        <ellipse cx="10" cy="51.5" rx="3.5" ry="1.5" fill={cap} opacity="0.8" />
      </svg>
    )
    case 'wide': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow2}>
        <rect x="2" y="1" width="16" height="12" rx="5" fill={cap} />
        <rect x="2" y="1" width="7" height="12" rx="5" fill="rgba(255,255,255,0.3)" />
        <rect x="2" y="11" width="16" height="24" rx="2" fill="#f0f1f3" />
        <rect x="2" y="11" width="7" height="24" rx="2" fill="rgba(255,255,255,0.42)" />
        <rect x="2" y="33" width="16" height="5" rx="1.5" fill="#9eaab8" />
        <rect x="1" y="38" width="18" height="14" rx="1.5" fill={tip} />
        <rect x="1" y="38" width="8" height="14" rx="1.5" fill="rgba(255,255,255,0.2)" />
        <rect x="1" y="50.5" width="18" height="2.5" rx="1" fill={cap} opacity="0.9" />
      </svg>
    )
    case 'curved': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow2}>
        <rect x="3" y="1" width="14" height="12" rx="6" fill={cap} />
        <rect x="3" y="1" width="5.5" height="12" rx="6" fill="rgba(255,255,255,0.3)" />
        <rect x="3" y="11" width="14" height="24" rx="2" fill="#f0f1f3" />
        <rect x="3" y="11" width="5.5" height="24" rx="2" fill="rgba(255,255,255,0.4)" />
        <rect x="3" y="33" width="14" height="5" rx="2" fill="#9eaab8" />
        <path d="M3 38 L3 52 Q10 56 17 52 L17 38Z" fill={tip} />
        <path d="M3 38 L3 43 Q10 47 17 43 L17 38Z" fill={cap} opacity="0.55" />
      </svg>
    )
    case 'dotted': return (
      <svg viewBox="0 0 20 54" width={20} height={54} fill="none" style={shadow2}>
        <rect x="5" y="1" width="10" height="11" rx="5" fill={cap} />
        <rect x="5" y="1" width="4" height="11" rx="5" fill="rgba(255,255,255,0.3)" />
        <rect x="5" y="10" width="10" height="27" rx="2" fill="#f0f1f3" />
        <rect x="5" y="10" width="4" height="27" rx="2" fill="rgba(255,255,255,0.42)" />
        <rect x="5" y="35" width="10" height="5" rx="2" fill="#9eaab8" />
        <path d="M6 40 L10 53 L14 40Z" fill={tip} />
        <circle cx="10" cy="53" r="1.8" fill={cap} />
      </svg>
    )
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

type PenMeta = { label: string; icon: React.ReactNode; lineCap: 'round' | 'square'; widthMult: number }
type HlMeta  = { label: string; icon: React.ReactNode }

const PEN_META: Record<PenType, PenMeta> = {
  pen:         { label: 'Pen',         icon: <PenSvgIcon type="pen" />,         lineCap: 'round',  widthMult: 1.0 },
  fountain:    { label: 'Fountain',    icon: <PenSvgIcon type="fountain" />,    lineCap: 'round',  widthMult: 1.5 },
  pencil:      { label: 'Pencil',      icon: <PenSvgIcon type="pencil" />,      lineCap: 'round',  widthMult: 0.8 },
  calligraphy: { label: 'Calligraphy', icon: <PenSvgIcon type="calligraphy" />, lineCap: 'square', widthMult: 1.2 },
  brush:       { label: 'Brush',       icon: <PenSvgIcon type="brush" />,       lineCap: 'round',  widthMult: 2.0 },
  marker:      { label: 'Marker',      icon: <PenSvgIcon type="marker" />,      lineCap: 'square', widthMult: 2.5 },
  signature:   { label: 'Signature',   icon: <PenSvgIcon type="signature" />,   lineCap: 'round',  widthMult: 0.7 },
  dashed:      { label: 'Dashed',      icon: <PenSvgIcon type="dashed" />,      lineCap: 'round',  widthMult: 1.0 },
}

const HL_META: Record<HlType, HlMeta> = {
  standard: { label: 'Standard', icon: <HlSvgIcon type="standard" /> },
  soft:     { label: 'Soft',     icon: <HlSvgIcon type="soft"     /> },
  wide:     { label: 'Wide',     icon: <HlSvgIcon type="wide"     /> },
  gradient: { label: 'Gradient', icon: <HlSvgIcon type="gradient" /> },
  curved:   { label: 'Curved',   icon: <HlSvgIcon type="curved"   /> },
  dotted:   { label: 'Dotted',   icon: <HlSvgIcon type="dotted"   /> },
}

const PRESET_COLORS = [
  '#000000', '#1e293b', '#374151', '#dc2626', '#ea580c', '#d97706',
  '#ca8a04', '#65a30d', '#16a34a', '#0891b2', '#2563eb', '#7c3aed',
  '#9333ea', '#c026d3', '#db2777', '#f43f5e', '#ffffff', '#f1f5f9',
]

const LS_KEY = 'pdf-editor-recent-colors'

// ─── Stroke preview canvas ────────────────────────────────────────────────────

function StrokePreview({ preset, penType, mode }: {
  preset: BrushPreset; penType?: PenType; mode: 'pen' | 'highlight'
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const { width: W, height: H } = cv
    ctx.clearRect(0, 0, W, H)

    const meta   = penType ? PEN_META[penType] : null
    const rawSz  = preset.size * (meta?.widthMult ?? 1)
    const sz     = mode === 'highlight' ? Math.min(preset.size, H * 0.68) : Math.min(rawSz, H * 0.68)

    ctx.save()
    ctx.globalAlpha  = preset.opacity
    ctx.strokeStyle  = preset.color
    ctx.lineWidth    = sz
    ctx.lineCap      = (meta?.lineCap ?? 'round') as CanvasLineCap
    ctx.lineJoin     = 'round'

    if (preset.style === 'dashed') {
      ctx.setLineDash([sz * 3, sz * 2])
    } else if (preset.style === 'dotted') {
      ctx.setLineDash([2, sz * 2])
    } else {
      ctx.setLineDash([])
    }

    ctx.beginPath()
    ctx.moveTo(20, H * 0.65)
    ctx.bezierCurveTo(W * 0.30, H * 0.08, W * 0.65, H * 0.92, W - 20, H * 0.35)
    ctx.stroke()
    ctx.restore()
  }, [preset, penType, mode])

  return (
    <canvas ref={ref} width={300} height={52}
      className="w-full rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.06)' }} />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DrawPanelProps {
  mode: 'pen' | 'highlight'
  activePenType: PenType
  activeHlType: HlType
  penPresets: Record<PenType, BrushPreset>
  hlPresets: Record<HlType, BrushPreset>
  onChangePenType: (t: PenType) => void
  onChangeHlType: (t: HlType) => void
  onUpdatePreset: (preset: BrushPreset) => void
  onClose: () => void
}

export default function DrawPanel({
  mode, activePenType, activeHlType,
  penPresets, hlPresets,
  onChangePenType, onChangeHlType,
  onUpdatePreset, onClose,
}: DrawPanelProps) {
  const activeType = mode === 'pen' ? activePenType : activeHlType
  const preset     = mode === 'pen' ? penPresets[activePenType] : hlPresets[activeHlType]

  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const update = useCallback((partial: Partial<BrushPreset>) => {
    onUpdatePreset({ ...preset, ...partial })
  }, [preset, onUpdatePreset])

  const pickColor = useCallback((color: string) => {
    update({ color })
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, 8)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [update])

  const types = mode === 'pen' ? (Object.keys(PEN_META) as PenType[]) : (Object.keys(HL_META) as HlType[])

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 mt-2 z-50
        w-[340px] rounded-3xl overflow-hidden
        shadow-2xl border border-white/10
        bg-zinc-900/96 backdrop-blur-xl"
      style={{ animation: 'drawPanelIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes drawPanelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-white/85 text-sm font-semibold tracking-wide">
          {mode === 'pen' ? 'Pen' : 'Highlighter'}
        </span>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Tool type selector */}
      <div className="px-3 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {types.map((t) => {
            const meta     = mode === 'pen' ? PEN_META[t as PenType] : HL_META[t as HlType]
            const isActive = t === activeType
            return (
              <button key={t}
                onClick={() => mode === 'pen' ? onChangePenType(t as PenType) : onChangeHlType(t as HlType)}
                style={isActive ? { transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' } : {}}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-1 pt-3 pb-2 px-2 rounded-2xl transition-all duration-200 min-w-[44px]',
                  isActive
                    ? 'bg-white/20 ring-1 ring-white/35 scale-105'
                    : 'bg-white/6 hover:bg-white/12'
                )}>
                {/* SVG tool illustration */}
                <span className="flex items-end justify-center" style={{ height: 54 }}>
                  {meta.icon}
                </span>
                <span className={cn(
                  'text-[9px] font-medium whitespace-nowrap mt-0.5',
                  isActive ? 'text-white' : 'text-white/50'
                )}>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">

        {/* Live preview */}
        <StrokePreview
          preset={preset}
          penType={mode === 'pen' ? activePenType : undefined}
          mode={mode}
        />

        {/* Size */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/55 text-[11px] uppercase tracking-wider font-medium">Size</span>
            <span className="text-white text-xs font-bold tabular-nums">{preset.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => update({ size: Math.max(1, preset.size - 1) })}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-colors shrink-0">
              <Minus size={11} />
            </button>
            <input type="range" min={1} max={mode === 'highlight' ? 80 : 40} value={preset.size}
              onChange={(e) => update({ size: Number(e.target.value) })}
              className="flex-1 h-1 accent-violet-400 cursor-pointer" />
            <button onClick={() => update({ size: Math.min(mode === 'highlight' ? 80 : 40, preset.size + 1) })}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-colors shrink-0">
              <Plus size={11} />
            </button>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/55 text-[11px] uppercase tracking-wider font-medium">Opacity</span>
            <span className="text-white text-xs font-bold tabular-nums">{Math.round(preset.opacity * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => update({ opacity: Math.max(0.05, +(preset.opacity - 0.05).toFixed(2)) })}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-colors shrink-0">
              <Minus size={11} />
            </button>
            <div className="flex-1 relative h-5 flex items-center">
              <div className="absolute inset-0 rounded-full overflow-hidden" style={{
                background: 'linear-gradient(to right, transparent, ' + preset.color + ')',
                opacity: 0.4, height: '4px', top: '50%', transform: 'translateY(-50%)'
              }} />
              <input type="range" min={0.05} max={1} step={0.05} value={preset.opacity}
                onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1 accent-violet-400 cursor-pointer relative" />
            </div>
            <button onClick={() => update({ opacity: Math.min(1, +(preset.opacity + 0.05).toFixed(2)) })}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-colors shrink-0">
              <Plus size={11} />
            </button>
          </div>
        </div>

        {/* Color */}
        <div>
          <span className="text-white/55 text-[11px] uppercase tracking-wider font-medium block mb-2">Color</span>

          {recentColors.length > 0 && (
            <div className="flex gap-1.5 mb-2.5 flex-wrap">
              {recentColors.map((c) => (
                <button key={c} onClick={() => pickColor(c)}
                  style={{ background: c }}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all border-2 shrink-0',
                    preset.color === c ? 'border-white scale-110 shadow-lg' : 'border-white/15 hover:scale-110'
                  )} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-9 gap-1 mb-3">
            {PRESET_COLORS.map((c) => (
              <button key={c} onClick={() => pickColor(c)}
                style={{ background: c }}
                className={cn(
                  'w-[30px] h-[30px] rounded-xl transition-all border-2 shrink-0',
                  preset.color === c
                    ? 'border-violet-400 scale-115 shadow-md'
                    : 'border-white/8 hover:scale-110 hover:border-white/25',
                  (c === '#ffffff' || c === '#f1f5f9') && 'border-white/20'
                )} />
            ))}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white/20 shrink-0">
              <div className="absolute inset-0 rounded-xl" style={{ background: preset.color }} />
              <input type="color" value={preset.color}
                onChange={(e) => pickColor(e.target.value)}
                className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] opacity-0 cursor-pointer" />
            </div>
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Custom</p>
              <p className="text-white/70 text-xs font-mono">{preset.color.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Stroke style */}
        <div>
          <span className="text-white/55 text-[11px] uppercase tracking-wider font-medium block mb-2">Style</span>
          <div className="flex gap-1.5">
            {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((s) => (
              <button key={s}
                onClick={() => update({ style: s })}
                className={cn(
                  'flex-1 py-2 rounded-2xl text-xs font-medium transition-all duration-150',
                  preset.style === s
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                    : 'bg-white/8 text-white/55 hover:bg-white/14 hover:text-white/80'
                )}>
                {s === 'solid' ? '────' : s === 'dashed' ? '- - -' : '· · ·'}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Helpers exported for client.tsx ─────────────────────────────────────────

export function buildBrushColor(color: string, opacity: number): string {
  if (opacity >= 1) return color
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export function getPenLineCap(penType: PenType): 'round' | 'square' {
  return PEN_META[penType].lineCap
}

export function getPenWidthMult(penType: PenType): number {
  return PEN_META[penType].widthMult
}

export function getDashArray(style: StrokeStyle, size: number): number[] {
  if (style === 'dashed') return [size * 3.5, size * 2.5]
  if (style === 'dotted') return [2, size * 2.5]
  return []
}
