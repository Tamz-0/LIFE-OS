'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Target, Plus, TrendingUp } from 'lucide-react'
import type { Goal } from '@/types'
import { useModal } from '@/stores/app'
import { motion } from 'framer-motion'

export function GoalProgressList() {
  const { openModal } = useModal()
  const qc = useQueryClient()

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals?status=active')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const activeGoals = goals.filter((g) => g.status === 'active' && g.is_active).slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Active Goals</h3>
          <p className="text-xs text-muted-foreground">{activeGoals.length} in progress</p>
        </div>
        <button
          onClick={() => openModal('create-goal')}
          className="w-7 h-7 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : activeGoals.length === 0 ? (
        <div className="py-8 text-center">
          <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No active goals yet.</p>
          <button
            onClick={() => openModal('create-goal')}
            className="mt-2 text-xs text-brand hover:underline"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.map((goal) => {
            const pct = Math.min(100, (goal.current_value / goal.target_value) * 100)
            const remaining = goal.target_value - goal.current_value

            return (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{goal.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-brand rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </span>
                  {goal.deadline && (
                    <span>Due {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
