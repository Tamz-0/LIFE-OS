'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppUI } from '@/stores/app'
import { getCurrentMonthRange } from '@/lib/utils'
import type { StrategicReview, KPISnapshot } from '@/types'
import { FileText, Download, CheckCircle2, AlertTriangle, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportData {
  review: StrategicReview
  kpis: KPISnapshot
}

function ScorePill({ value }: { value: number }) {
  const label = value >= 90 ? 'Excellent' : value >= 75 ? 'Strong' : value >= 60 ? 'Moderate' : value >= 45 ? 'Weak' : 'Critical'
  const cls = value >= 90 ? 'score-excellent' : value >= 75 ? 'score-strong' : value >= 60 ? 'score-moderate' : value >= 45 ? 'score-weak' : 'score-critical'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cls)}>
      {Math.round(value)}% — {label}
    </span>
  )
}

function ReviewSection({ title, icon, items, variant = 'default' }: {
  title: string
  icon: React.ReactNode
  items: Array<{ title: string; description: string; metric?: string; value?: string | number }>
  variant?: 'default' | 'success' | 'danger' | 'warning'
}) {
  const colors = {
    default: 'bg-card border-border',
    success: 'bg-emerald-500/5 border-emerald-500/20',
    danger: 'bg-red-500/5 border-red-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
  }

  return (
    <div className={cn('border rounded-xl p-5 space-y-4', colors[variant])}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items to report.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                {item.value !== undefined && (
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">{item.value}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const { setActiveTab } = useAppUI()
  const { start, end } = getCurrentMonthRange()
  const [exportType, setExportType] = useState<'json' | 'csv'>('json')

  useEffect(() => { setActiveTab('reports') }, [setActiveTab])

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['report', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=monthly&start=${start}&end=${end}`)
      if (!res.ok) throw new Error('Failed to fetch report')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  function handleExport() {
    if (!data) return
    if (exportType === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-report-${start}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const { review } = data
      const rows = [
        ['Section', 'Title', 'Description', 'Value'],
        ...review.strengths.map(i => ['Strength', i.title, i.description, i.value ?? '']),
        ...review.weaknesses.map(i => ['Weakness', i.title, i.description, i.value ?? '']),
        ...review.bottlenecks.map(i => ['Bottleneck', i.title, i.description, i.value ?? '']),
        ...review.highest_leverage.map(i => ['High Leverage', i.title, i.description, i.value ?? '']),
      ]
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-report-${start}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const review = data?.review
  const kpis = data?.kpis

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Monthly Report</h2>
          <p className="text-sm text-muted-foreground">
            {review?.period ?? 'Current Month'} · Generated {review ? new Date(review.generated_at).toLocaleString() : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as 'json' | 'csv')}
            className="h-8 px-2 text-xs bg-input border border-border rounded-lg outline-none"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* KPI pills */}
      {kpis && (
        <div className="flex flex-wrap gap-2">
          <ScorePill value={kpis.discipline_score} />
          <ScorePill value={kpis.focus_score} />
          <ScorePill value={kpis.consistency_score} />
          <ScorePill value={kpis.self_control_score} />
        </div>
      )}

      {/* Executive Summary */}
      {review && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold">Executive Summary</h3>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{review.executive_summary}</p>

          {kpis && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Perfect Days', value: kpis.perfect_days },
                { label: 'Best Streak', value: `${kpis.best_streak}d` },
                { label: 'Days Tracked', value: kpis.total_tracked_days },
                { label: 'Completion', value: `${Math.round(kpis.completion_percentage)}%` },
              ].map((s) => (
                <div key={s.label} className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-bold tabular-nums">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review sections grid */}
      {review && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReviewSection
            title="Strengths"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            items={review.strengths}
            variant="success"
          />
          <ReviewSection
            title="Weaknesses"
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            items={review.weaknesses}
            variant="danger"
          />
          <ReviewSection
            title="Bottlenecks"
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            items={review.bottlenecks}
            variant="warning"
          />
          <ReviewSection
            title="Highest-Leverage Improvements"
            icon={<Zap className="w-4 h-4 text-brand" />}
            items={review.highest_leverage}
          />
        </div>
      )}

      {/* Next period priorities */}
      {review && review.next_period_priorities.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold">Next Month Priorities</h3>
          </div>
          <ol className="space-y-2">
            {review.next_period_priorities.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center shrink-0 font-semibold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
