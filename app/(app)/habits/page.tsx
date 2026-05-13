'use client'

import { useEffect } from 'react'
import { MonthlyHabitGrid } from '@/components/habits/monthly-grid'
import { HabitModal } from '@/components/habits/habit-modal'
import { HabitHeatmap } from '@/components/habits/habit-heatmap'
import { useAppUI, useModal } from '@/stores/app'
import { Plus, LayoutGrid, Calendar } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function HabitsPage() {
  const { setActiveTab } = useAppUI()
  const { openModal } = useModal()
  const [view, setView] = useState<'grid' | 'heatmap'>('grid')

  useEffect(() => { setActiveTab('habits') }, [setActiveTab])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Habit Tracker</h2>
          <p className="text-sm text-muted-foreground">One click records reality.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition-colors text-muted-foreground',
                view === 'grid' ? 'bg-accent text-foreground' : 'hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('heatmap')}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition-colors text-muted-foreground',
                view === 'heatmap' ? 'bg-accent text-foreground' : 'hover:text-foreground'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => openModal('create-habit')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-brand-foreground text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New Habit
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <MonthlyHabitGrid />
      ) : (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Year Overview Heatmap</h3>
          <HabitHeatmap />
        </div>
      )}

      <HabitModal />
    </div>
  )
}
