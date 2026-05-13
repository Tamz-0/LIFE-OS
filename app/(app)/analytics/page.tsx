'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppUI } from '@/stores/app'
import { getCurrentMonthRange } from '@/lib/utils'
import type {
  HabitCorrelation, FailurePattern, OpportunityCost,
  RecoveryMetric, DailySummary, KPISnapshot,
} from '@/types'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { Brain, Shield, AlertTriangle, Clock, RefreshCw, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

function SectionCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-brand">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const { setActiveTab } = useAppUI()
  const { start, end } = getCurrentMonthRange()

  useEffect(() => { setActiveTab('analytics') }, [setActiveTab])

  const { data: kpis, isLoading: loadingKpis } = useQuery<KPISnapshot>({
    queryKey: ['kpis', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=kpi&start=${start}&end=${end}`)
      return res.json()
    },
  })

  const { data: keystones = [], isLoading: loadingKeystone } = useQuery<HabitCorrelation[]>({
    queryKey: ['keystones', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=keystone&start=${start}&end=${end}`)
      return res.json()
    },
  })

  const { data: patterns = [], isLoading: loadingPatterns } = useQuery<FailurePattern[]>({
    queryKey: ['patterns', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=patterns&start=${start}&end=${end}`)
      return res.json()
    },
  })

  const { data: costs = [], isLoading: loadingCosts } = useQuery<OpportunityCost[]>({
    queryKey: ['opportunity', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=opportunity&start=${start}&end=${end}`)
      return res.json()
    },
  })

  const { data: recovery } = useQuery<RecoveryMetric>({
    queryKey: ['recovery', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=recovery&start=${start}&end=${end}`)
      return res.json()
    },
  })

  const { data: daily = [] } = useQuery<DailySummary[]>({
    queryKey: ['daily-summaries', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=daily&start=${start}&end=${end}`)
      return res.json()
    },
  })

  // Radar chart data
  const radarData = kpis
    ? [
        { subject: 'Discipline', value: Math.round(kpis.discipline_score) },
        { subject: 'Focus', value: Math.round(kpis.focus_score) },
        { subject: 'Consistency', value: Math.round(kpis.consistency_score) },
        { subject: 'Self-Control', value: Math.round(kpis.self_control_score) },
        { subject: 'Goals', value: Math.round(kpis.goal_alignment_score) },
        { subject: 'Productivity', value: Math.round(kpis.productivity_score) },
      ]
    : []

  // Weekly bar chart
  const weeklyData = daily
    .filter((_, i) => i % 7 === 6 || i === daily.length - 1)
    .slice(-6)
    .map((d) => ({
      week: format(parseISO(d.date), 'MMM d'),
      score: Math.round(d.discipline_score),
    }))

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Deterministic insights — formulas only, no AI.</p>
      </div>

      {/* Performance Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Performance Profile" icon={<Brain className="w-4 h-4" />}>
          {loadingKpis ? (
            <div className="h-56 bg-muted rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--brand))"
                  fill="hsl(var(--brand))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Weekly trend */}
        <SectionCard title="Weekly Score Trend" icon={<TrendingUp className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {weeklyData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? 'hsl(var(--brand))' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Keystone Habits */}
      <SectionCard title="Keystone Habit Ranking" icon={<Brain className="w-4 h-4" />}>
        {loadingKeystone ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        ) : keystones.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Need at least 5 days of data to compute correlations.</p>
        ) : (
          <div className="space-y-3">
            {keystones.slice(0, 6).map((k) => (
              <div key={k.habit_id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">#{k.rank}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{k.habit_name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                      r={k.correlation_with_discipline.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${Math.abs(k.correlation_with_discipline) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Failure patterns */}
      <SectionCard title="Failure Pattern Detection" icon={<AlertTriangle className="w-4 h-4" />}>
        {loadingPatterns ? (
          <div className="h-20 bg-muted rounded animate-pulse" />
        ) : patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No significant failure patterns detected yet.</p>
        ) : (
          <div className="space-y-3">
            {patterns.map((p, i) => (
              <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{p.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <span className="text-xs font-bold text-amber-600 shrink-0">{p.occurrence_rate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.description}</p>
                {p.contributing_factors.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {p.contributing_factors.map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunity Cost */}
        <SectionCard title="Opportunity Cost Engine" icon={<Clock className="w-4 h-4" />}>
          {loadingCosts ? (
            <div className="h-24 bg-muted rounded animate-pulse" />
          ) : costs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No opportunity cost data yet.</p>
          ) : (
            <div className="space-y-3">
              {costs.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                    {Math.round(c.total_lost_hours)}h
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.category}</p>
                    <p className="text-xs text-muted-foreground">{c.potential_progress}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recovery Speed */}
        <SectionCard title="Recovery Speed Metric" icon={<RefreshCw className="w-4 h-4" />}>
          {!recovery ? (
            <p className="text-sm text-muted-foreground text-center py-4">Need more data to compute recovery patterns.</p>
          ) : recovery.recovery_events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No significant performance drops detected.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{recovery.avg_recovery_days}</p>
                  <p className="text-[10px] text-muted-foreground">Avg days</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{recovery.fastest_recovery}</p>
                  <p className="text-[10px] text-muted-foreground">Fastest</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="text-lg font-bold text-red-500">{recovery.slowest_recovery}</p>
                  <p className="text-[10px] text-muted-foreground">Slowest</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {recovery.recovery_events.length} recovery event{recovery.recovery_events.length !== 1 ? 's' : ''} this period.
              </p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
