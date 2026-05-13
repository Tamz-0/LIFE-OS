'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppUI } from '@/stores/app'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { KPISnapshot } from '@/types'
import { Archive, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MonthHistory {
  year: number
  month: number
  kpis: KPISnapshot
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function KPIBadge({ value }: { value: number }) {
  const cls =
    value >= 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : value >= 75 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    : value >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-red-500/10 text-red-600 dark:text-red-400'

  return (
    <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums', cls)}>
      {Math.round(value)}
    </span>
  )
}

export default function HistoryPage() {
  const { setActiveTab } = useAppUI()
  useEffect(() => { setActiveTab('history') }, [setActiveTab])

  // Build last 12 months
  const now = new Date()
  const months: Array<{ year: number; month: number; label: string }> = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, 'MMMM yyyy'),
    })
  }

  const queries = months.map((m) => {
    const { start, end } = getMonthRange(m.year, m.month)
    return { ...m, start, end }
  })

  const { data: allData = {} } = useQuery<Record<string, KPISnapshot>>({
    queryKey: ['history-all'],
    queryFn: async () => {
      const results: Record<string, KPISnapshot> = {}
      await Promise.all(
        queries.map(async (q) => {
          const res = await fetch(`/api/analytics?type=kpi&start=${q.start}&end=${q.end}`)
          if (res.ok) {
            results[`${q.year}-${q.month}`] = await res.json()
          }
        })
      )
      return results
    },
    staleTime: 1000 * 60 * 10,
  })

  // Find best month
  const entries = Object.entries(allData)
  const bestMonth = entries.reduce<string | null>((best, [key, kpis]) => {
    if (!best) return key
    return kpis.discipline_score > (allData[best]?.discipline_score ?? 0) ? key : best
  }, null)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h2 className="text-xl font-semibold">Historical Archive</h2>
        <p className="text-sm text-muted-foreground">Year-to-date performance · Last 12 months</p>
      </div>

      {/* Best month callout */}
      {bestMonth && allData[bestMonth] && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Best Month</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {months.find((m) => `${m.year}-${m.month}` === bestMonth)?.label} —
            Discipline Score: <strong>{Math.round(allData[bestMonth].discipline_score)}%</strong> ·
            Perfect Days: <strong>{allData[bestMonth].perfect_days}</strong> ·
            Best Streak: <strong>{allData[bestMonth].best_streak} days</strong>
          </p>
        </div>
      )}

      {/* Month table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Discipline</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Focus</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Consistency</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Self-Control</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Perfect Days</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Streak</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Trend</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const key = `${m.year}-${m.month}`
                const kpis = allData[key]
                const prevKey = months[i + 1] ? `${months[i + 1].year}-${months[i + 1].month}` : null
                const prevKpis = prevKey ? allData[prevKey] : null
                const delta = kpis && prevKpis ? kpis.discipline_score - prevKpis.discipline_score : null
                const isBest = key === bestMonth

                return (
                  <tr key={key} className={cn(
                    'border-b border-border/50 hover:bg-muted/20 transition-colors',
                    isBest && 'bg-emerald-500/5'
                  )}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {isBest && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                        {m.label}
                      </div>
                    </td>
                    <td className="text-center px-3 py-3">
                      {kpis ? <KPIBadge value={kpis.discipline_score} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-3 py-3">
                      {kpis ? <KPIBadge value={kpis.focus_score} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-3 py-3">
                      {kpis ? <KPIBadge value={kpis.consistency_score} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-3 py-3">
                      {kpis ? <KPIBadge value={kpis.self_control_score} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-3 py-3 tabular-nums font-semibold">
                      {kpis?.perfect_days ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-3 py-3 tabular-nums font-semibold">
                      {kpis ? `${kpis.best_streak}d` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-3 py-3">
                      {delta === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : delta > 2 ? (
                        <span className="flex items-center justify-center gap-1 text-emerald-500">
                          <TrendingUp className="w-3 h-3" /> +{Math.round(delta)}
                        </span>
                      ) : delta < -2 ? (
                        <span className="flex items-center justify-center gap-1 text-red-500">
                          <TrendingDown className="w-3 h-3" /> {Math.round(delta)}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Minus className="w-3 h-3" /> 0
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
