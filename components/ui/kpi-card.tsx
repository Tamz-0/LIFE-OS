'use client'

import { motion } from 'framer-motion'
import { cn, getScoreBg, getScoreLabel } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number
  suffix?: string
  description?: string
  trend?: number // positive = good, negative = bad
  icon?: React.ReactNode
  highlight?: boolean
  loading?: boolean
  className?: string
  decimals?: number
  showLabel?: boolean
}

export function KPICard({
  title,
  value,
  suffix = '%',
  description,
  trend,
  icon,
  highlight = false,
  loading = false,
  className,
  decimals = 0,
  showLabel = true,
}: KPICardProps) {
  const displayValue = typeof value === 'number' ? value.toFixed(decimals) : '—'
  const label = showLabel ? getScoreLabel(value) : undefined
  const colorClass = getScoreBg(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-card border border-border rounded-xl p-4 flex flex-col gap-2',
        highlight && 'ring-1 ring-brand/30 bg-brand/5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground truncate">{title}</span>
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 bg-muted rounded-md animate-pulse" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tabular-nums leading-none">
            {displayValue}
            <span className="text-sm font-medium text-muted-foreground ml-0.5">{suffix}</span>
          </span>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-0.5 text-xs mb-0.5',
              trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {trend > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : trend < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(trend).toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Label + description */}
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        {description && (
          <span className="text-xs text-muted-foreground truncate">{description}</span>
        )}
        {label && !loading && (
          <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-auto', colorClass)}>
            {label}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Compact variant for smaller spaces
export function MiniKPICard({
  title,
  value,
  suffix = '',
  icon,
  loading = false,
}: {
  title: string
  value: number | string
  suffix?: string
  icon?: React.ReactNode
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{title}</div>
        {loading ? (
          <div className="h-4 w-12 bg-muted rounded animate-pulse mt-0.5" />
        ) : (
          <div className="text-sm font-semibold tabular-nums">
            {value}{suffix}
          </div>
        )}
      </div>
    </div>
  )
}
