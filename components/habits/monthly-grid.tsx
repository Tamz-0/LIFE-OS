'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useRef } from 'react'
import { cn, getDaysArray, today, PRIORITY_COLORS } from '@/lib/utils'
import { format, parseISO, getDaysInMonth } from 'date-fns'
import type { Habit, HabitEntry } from '@/types'
import { isHabitApplicable } from '@/lib/kpi/engine'
import { ChevronLeft, ChevronRight, Edit2, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { useAppUI, useModal } from '@/stores/app'

export function MonthlyHabitGrid() {
  const { selectedMonth, setSelectedMonth } = useAppUI()
  const { openModal } = useModal()
  const qc = useQueryClient()
  const { year, month } = selectedMonth
  const todayStr = today()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const { data: habits = [], isLoading: loadingHabits } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await fetch('/api/habits')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: entries = [], isLoading: loadingEntries } = useQuery<HabitEntry[]>({
    queryKey: ['habit-entries', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/habits/entries?start=${startDate}&end=${endDate}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({
      habitId,
      dateStr,
      currentEntry,
      habit,
    }: {
      habitId: string
      dateStr: string
      currentEntry?: HabitEntry
      habit: Habit
    }) => {
      const newCompleted = !currentEntry?.completed
      const res = await fetch('/api/habits/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: habitId,
          date: dateStr,
          completed: newCompleted,
          value: newCompleted ? (habit.target_value ?? 1) : 0,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onMutate: async ({ habitId, dateStr, currentEntry }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['habit-entries', startDate, endDate] })
      const previous = qc.getQueryData<HabitEntry[]>(['habit-entries', startDate, endDate])

      qc.setQueryData<HabitEntry[]>(['habit-entries', startDate, endDate], (old = []) => {
        const idx = old.findIndex((e) => e.habit_id === habitId && e.date === dateStr)
        const newEntry: HabitEntry = {
          id: currentEntry?.id ?? crypto.randomUUID(),
          habit_id: habitId,
          date: dateStr,
          completed: !currentEntry?.completed,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (idx >= 0) {
          const updated = [...old]
          updated[idx] = newEntry
          return updated
        }
        return [...old, newEntry]
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['habit-entries', startDate, endDate], context.previous)
      }
      toast.error('Failed to update')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['habit-entries'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
    },
  })

  const days = getDaysArray(year, month)
  const activeHabits = habits.filter((h) => h.is_active && !h.archived_at)

  function prevMonth() {
    if (month === 1) setSelectedMonth(year - 1, 12)
    else setSelectedMonth(year, month - 1)
  }

  function nextMonth() {
    const now = new Date()
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) setSelectedMonth(year + 1, 1)
    else setSelectedMonth(year, month + 1)
  }

  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1

  // Per-row completion rate
  function getHabitRate(habit: Habit): number {
    const applicable = days.filter((d) => {
      const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return isHabitApplicable(habit, ds)
    })
    const completed = applicable.filter((d) => {
      const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return entries.find((e) => e.habit_id === habit.id && e.date === ds)?.completed
    })
    return applicable.length === 0 ? 0 : (completed.length / applicable.length) * 100
  }

  const loading = loadingHabits || loadingEntries

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold min-w-[120px] text-center">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </h3>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Click a cell to toggle</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {/* Sticky habit name col */}
              <th className="text-left px-4 py-2 font-medium text-muted-foreground bg-card sticky left-0 z-10 min-w-[160px] border-r border-border">
                Habit
              </th>
              {days.map((d) => {
                const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const isToday = ds === todayStr
                return (
                  <th
                    key={d}
                    className={cn(
                      'text-center px-1 py-2 font-medium w-9 min-w-[36px]',
                      isToday ? 'text-brand' : 'text-muted-foreground'
                    )}
                  >
                    {d}
                  </th>
                )
              })}
              <th className="text-right px-4 py-2 font-medium text-muted-foreground sticky right-0 bg-card z-10 min-w-[56px] border-l border-border">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-2 sticky left-0 bg-card border-r border-border">
                      <div className="h-4 bg-muted rounded animate-pulse w-28" />
                    </td>
                    {days.map((d) => (
                      <td key={d} className="px-1 py-2">
                        <div className="w-7 h-7 bg-muted rounded-sm animate-pulse mx-auto" />
                      </td>
                    ))}
                    <td className="px-4 py-2 sticky right-0 bg-card border-l border-border" />
                  </tr>
                ))
              : activeHabits.map((habit) => {
                  const rate = getHabitRate(habit)
                  return (
                    <tr
                      key={habit.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                    >
                      {/* Habit name — sticky */}
                      <td className="px-4 py-1.5 sticky left-0 bg-card group-hover:bg-muted/20 border-r border-border z-10 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[120px]">{habit.name}</span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
                            PRIORITY_COLORS[habit.priority]
                          )}>
                            {habit.priority[0].toUpperCase()}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-auto">
                            <button
                              onClick={() => openModal('edit-habit', { habit })}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map((d) => {
                        const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                        const applicable = isHabitApplicable(habit, ds)
                        const entry = entries.find((e) => e.habit_id === habit.id && e.date === ds)
                        const done = entry?.completed ?? false
                        const isToday = ds === todayStr
                        const isFuture = ds > todayStr

                        return (
                          <td key={d} className="px-1 py-1.5">
                            <button
                              onClick={() =>
                                applicable &&
                                !isFuture &&
                                toggleMutation.mutate({
                                  habitId: habit.id,
                                  dateStr: ds,
                                  currentEntry: entry,
                                  habit,
                                })
                              }
                              disabled={!applicable || isFuture}
                              className={cn(
                                'habit-cell mx-auto',
                                !applicable || isFuture
                                  ? 'habit-cell-na'
                                  : done
                                  ? 'habit-cell-done'
                                  : 'habit-cell-empty',
                                isToday && 'habit-cell-today'
                              )}
                              title={ds}
                            />
                          </td>
                        )
                      })}

                      {/* Rate — sticky right */}
                      <td className="px-4 py-1.5 text-right sticky right-0 bg-card group-hover:bg-muted/20 border-l border-border transition-colors">
                        <span
                          className={cn(
                            'text-[11px] font-semibold tabular-nums',
                            rate >= 80
                              ? 'text-emerald-500'
                              : rate >= 60
                              ? 'text-amber-500'
                              : 'text-red-500'
                          )}
                        >
                          {Math.round(rate)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>

        {!loading && activeHabits.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No active habits. Add your first habit to get started.
          </div>
        )}
      </div>
    </div>
  )
}
