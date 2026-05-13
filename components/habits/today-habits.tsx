'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { today, cn, PRIORITY_COLORS } from '@/lib/utils'
import { CheckCircle2, Circle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Habit, HabitEntry } from '@/types'
import { isHabitApplicable } from '@/lib/kpi/engine'
import { useModal } from '@/stores/app'
import { motion, AnimatePresence } from 'framer-motion'

export function TodayHabits() {
  const qc = useQueryClient()
  const todayStr = today()
  const { openModal } = useModal()

  const { data: habits = [], isLoading: loadingHabits } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await fetch('/api/habits')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: entries = [], isLoading: loadingEntries } = useQuery<HabitEntry[]>({
    queryKey: ['habit-entries', todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/habits/entries?start=${todayStr}&end=${todayStr}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (habit: Habit) => {
      const existing = entries.find((e) => e.habit_id === habit.id)
      const newCompleted = !existing?.completed

      const res = await fetch('/api/habits/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: habit.id,
          date: todayStr,
          completed: newCompleted,
          value: newCompleted ? (habit.target_value ?? 1) : 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habit-entries'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
    },
    onError: () => toast.error('Failed to update habit'),
  })

  const todayHabits = habits.filter((h) => isHabitApplicable(h, todayStr))
  const completedCount = todayHabits.filter((h) => {
    const entry = entries.find((e) => e.habit_id === h.id)
    return entry?.completed
  }).length

  const loading = loadingHabits || loadingEntries

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Today&apos;s Habits</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? '—' : `${completedCount} / ${todayHabits.length} done`}
          </p>
        </div>
        <button
          onClick={() => openModal('create-habit')}
          className="w-7 h-7 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {!loading && todayHabits.length > 0 && (
        <div className="h-1 bg-muted rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / todayHabits.length) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : todayHabits.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No habits for today.{' '}
          <button
            onClick={() => openModal('create-habit')}
            className="text-brand hover:underline"
          >
            Add one
          </button>
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-none">
          <AnimatePresence initial={false}>
            {todayHabits.map((habit) => {
              const entry = entries.find((e) => e.habit_id === habit.id)
              const done = entry?.completed ?? false

              return (
                <motion.button
                  key={habit.id}
                  layout
                  onClick={() => toggleMutation.mutate(habit)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                    'hover:bg-accent active:scale-[0.98]',
                    done && 'opacity-60'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.div
                        key="checked"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="unchecked"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span className={cn('text-sm flex-1 truncate', done && 'line-through')}>
                    {habit.name}
                  </span>

                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                    PRIORITY_COLORS[habit.priority]
                  )}>
                    {habit.priority}
                  </span>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
