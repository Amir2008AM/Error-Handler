import Link from 'next/link'
import {
  FileText, Image, Minimize2, FilePlus2, Scissors,
  Expand, RefreshCw, Type, CaseSensitive, Percent,
  Calendar, AlignLeft, ArrowRightLeft, Calculator,
  ImageIcon, RotateCw, Droplets, Crop,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tool } from '@/lib/tools'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Image,
  Minimize2,
  FilePlus2,
  Scissors,
  Expand,
  RefreshCw,
  Type,
  CaseSensitive,
  Percent,
  Calendar,
  AlignLeft,
  ArrowRightLeft,
  Calculator,
  ImageIcon,
  RotateCw,
  Droplets,
  Crop,
}

interface ToolCardProps {
  tool: Tool
  compact?: boolean
}

export function ToolCard({ tool, compact = false }: ToolCardProps) {
  const Icon = iconMap[tool.icon] ?? FileText

  if (compact) {
    return (
      <Link
        href={`/${tool.slug}`}
        className="group flex flex-col items-center justify-center bg-white border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1"
      >
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', tool.bgColor)}>
          <Icon className={cn('w-6 h-6', tool.color)} />
        </div>
        <h3 className="text-sm font-semibold text-foreground text-center group-hover:text-primary transition-colors">
          {tool.name}
        </h3>
      </Link>
    )
  }

  return (
    <Link
      href={`/${tool.slug}`}
      className="group flex flex-col items-center bg-white border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1"
    >
      <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-4', tool.bgColor)}>
        <Icon className={cn('w-7 h-7', tool.color)} />
      </div>
      <h3 className="text-base font-semibold text-foreground text-center mb-2 group-hover:text-primary transition-colors">
        {tool.name}
      </h3>
      <p className="text-sm text-muted-foreground text-center leading-relaxed line-clamp-2">
        {tool.description}
      </p>
    </Link>
  )
}
