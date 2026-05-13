'use client'

import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { DailySummary } from '@/types'

interface DisciplineChartProps {
  dateRange: { start: string; end: string }
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">
        {label ? format(parseISO(label), 'MMM d, EEE') : ''}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold">
          {p.name === 'discipline_score' ? 'Discipline' : 'Completion'}: {Math.round(p.value)}%
        </p>
      ))}
    </div>
  )
}

export function DisciplineChart({ dateRange }: DisciplineChartProps) {
  const { data, isLoading } = useQuery<DailySummary[]>({
    queryKey: ['daily-summaries', dateRange.start, dateRange.end],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics?type=daily&start=${dateRange.start}&end=${dateRange.end}`
      )
      if (!res.ok) throw new Error('Failed to fetch daily summaries')
      return res.json()
    },
  })

  const chartData = (data ?? []).map((d) => ({
    date: d.date,
    discipline_score: Math.round(d.discipline_score),
    completion_rate: Math.round(d.completion_rate),
    is_perfect: d.is_perfect_day,
  }))

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Discipline Trend</h3>
          <p className="text-xs text-muted-foreground">Daily score over the month</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand inline-block" />
            Discipline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Completion
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-56 bg-muted/30 rounded-lg animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="disciplineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--brand))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => format(parseISO(v), 'd')}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="completion_rate"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#completionGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
            <Area
              type="monotone"
              dataKey="discipline_score"
              stroke="hsl(var(--brand))"
              strokeWidth={2}
              fill="url(#disciplineGrad)"
              dot={(props) => {
                const { cx, cy, payload } = props
                if (!payload.is_perfect) return <g key={`dot-${payload.date}`} />
                return (
                  <circle
                    key={`dot-${payload.date}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="hsl(var(--brand))"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 5, fill: 'hsl(var(--brand))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
