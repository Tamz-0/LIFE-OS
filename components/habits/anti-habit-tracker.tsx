'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { today } from '@/lib/utils'
import { Minus, Plus, ShieldAlert } from 'lucide-react'
import type { AntiHabit, AntiHabitEntry } from '@/types'
import { toast } from 'sonner'
import { useModal } from '@/stores/app'

export function AntiHabitTracker() {
  const qc = useQueryClient()
  const todayStr = today()
  const { openModal } = useModal()

  const { data: antiHabits = [], isLoading: loadingAH } = useQuery<AntiHabit[]>({
    queryKey: ['anti-habits'],
    queryFn: async () => {
      const res = await fetch('/api/anti-habits')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: entries = [], isLoading: loadingEntries } = useQuery<AntiHabitEntry[]>({
    queryKey: ['anti-habit-entries', todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/anti-habits/entries?start=${todayStr}&end=${todayStr}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ antiHabitId, delta }: { antiHabitId: string; delta: 1 | -1 }) => {
      const existing = entries.find((e) => e.anti_habit_id === antiHabitId)
      const newCount = Math.max(0, (existing?.incident_count ?? 0) + delta)

      const res = await fetch('/api/anti-habits/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anti_habit_id: antiHabitId,
          date: todayStr,
          incident_count: newCount,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anti-habit-entries'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
    },
    onError: () => toast.error('Failed to update'),
  })

  const totalIncidents = entries.reduce((s, e) => s + e.incident_count, 0)
  const loading = loadingAH || loadingEntries

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Anti-Habits Today</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? '—' : `${totalIncidents} total incident${totalIncidents !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => openModal('create-anti-habit')}
          className="w-7 h-7 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : antiHabits.length === 0 ? (
        <div className="py-8 text-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No anti-habits tracked yet.</p>
          <button
            onClick={() => openModal('create-anti-habit')}
            className="mt-2 text-xs text-brand hover:underline"
          >
            Add one
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {antiHabits.filter((ah) => ah.is_active).map((ah) => {
            const entry = entries.find((e) => e.anti_habit_id === ah.id)
            const count = entry?.incident_count ?? 0

            return (
              <div
                key={ah.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ah.name}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateMutation.mutate({ antiHabitId: ah.id, delta: -1 })}
                    disabled={count === 0}
                    className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <span className={`text-sm font-bold tabular-nums w-5 text-center ${count > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {count}
                  </span>

                  <button
                    onClick={() => updateMutation.mutate({ antiHabitId: ah.id, delta: 1 })}
                    className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
