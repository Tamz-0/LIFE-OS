'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { eachDayOfInterval, format, parseISO, startOfYear, getDay } from 'date-fns'
import type { HabitEntry } from '@/types'

interface HabitHeatmapProps {
  habitId?: string
  year?: number
}

export function HabitHeatmap({ habitId, year = new Date().getFullYear() }: HabitHeatmapProps) {
  const start = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd')
  const end = format(new Date(year, 11, 31), 'yyyy-MM-dd')

  const { data: entries = [] } = useQuery<HabitEntry[]>({
    queryKey: ['habit-entries-year', habitId, year],
    queryFn: async () => {
      const url = habitId
        ? `/api/habits/entries?start=${start}&end=${end}&habit_id=${habitId}`
        : `/api/habits/entries?start=${start}&end=${end}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })

  // Build completion map
  const completionMap = new Map<string, number>()
  for (const entry of entries) {
    const key = entry.habit_id ? `${entry.habit_id}:${entry.date}` : entry.date
    const val = entry.completed ? 1 : 0
    const prev = completionMap.get(entry.date) ?? 0
    completionMap.set(entry.date, Math.min(1, prev + val / Math.max(entries.length, 1)))
  }

  // Group by week
  const weeks: Array<Array<{ date: string; value: number } | null>> = []
  let currentWeek: Array<{ date: string; value: number } | null> = []

  // Pad start
  const firstDow = getDay(parseISO(start))
  for (let i = 0; i < firstDow; i++) currentWeek.push(null)

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const value = completionMap.get(dateStr) ?? -1 // -1 = no data
    currentWeek.push({ date: dateStr, value })
    if (getDay(day) === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="overflow-x-auto scrollbar-none">
      <div className="min-w-[680px]">
        {/* Month labels */}
        <div className="flex gap-1 mb-1 pl-6 text-[10px] text-muted-foreground">
          {months.map((m, i) => (
            <div key={m} className="flex-1 text-left">{m}</div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* DOW labels */}
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground w-5 shrink-0">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="h-3 flex items-center">{i % 2 === 1 ? d : ''}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="w-3 h-3" />

                const colorClass =
                  day.value < 0
                    ? 'bg-muted/40'
                    : day.value === 0
                    ? 'bg-muted'
                    : day.value < 0.4
                    ? 'bg-brand/30'
                    : day.value < 0.7
                    ? 'bg-brand/60'
                    : 'bg-brand'

                return (
                  <div
                    key={di}
                    title={`${day.date}: ${day.value < 0 ? 'No data' : `${Math.round(day.value * 100)}%`}`}
                    className={cn('w-3 h-3 rounded-[2px] cursor-default transition-colors hover:opacity-80', colorClass)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          {['bg-muted', 'bg-brand/30', 'bg-brand/60', 'bg-brand'].map((c, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-[2px]', c)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
