'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppUI } from '@/stores/app'
import { today, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { DailyPlan, TimeCategory } from '@/types'
import { format, addDays, subDays, parseISO } from 'date-fns'

export default function PlanningPage() {
  const { setActiveTab } = useAppUI()
  const [selectedDate, setSelectedDate] = useState(today())
  const qc = useQueryClient()

  useEffect(() => { setActiveTab('planning') }, [setActiveTab])

  const { data: plan } = useQuery<DailyPlan | null>({
    queryKey: ['plan', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/plans?date=${selectedDate}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: categories = [] } = useQuery<TimeCategory[]>({
    queryKey: ['time-categories'],
    queryFn: async () => {
      const res = await fetch('/api/time-entries/categories')
      return res.json()
    },
  })

  const [form, setForm] = useState({
    objective: '',
    priority_1: '',
    priority_2: '',
    priority_3: '',
    notes: '',
  })

  const [timeAlloc, setTimeAlloc] = useState<Record<string, number>>({})

  useEffect(() => {
    if (plan) {
      setForm({
        objective: plan.objective ?? '',
        priority_1: plan.priority_1 ?? '',
        priority_2: plan.priority_2 ?? '',
        priority_3: plan.priority_3 ?? '',
        notes: plan.notes ?? '',
      })
      const alloc: Record<string, number> = {}
      for (const entry of plan.planned_time_entries ?? []) {
        alloc[entry.category_id] = entry.hours
      }
      setTimeAlloc(alloc)
    } else {
      setForm({ objective: '', priority_1: '', priority_2: '', priority_3: '', notes: '' })
      setTimeAlloc({})
    }
  }, [plan, selectedDate])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const planned_time_entries = Object.entries(timeAlloc)
        .filter(([, hours]) => hours > 0)
        .map(([category_id, hours]) => ({ category_id, hours }))

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...form, planned_time_entries }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', selectedDate] })
      toast.success('Plan saved')
    },
    onError: () => toast.error('Failed to save'),
  })

  const totalPlanned = Object.values(timeAlloc).reduce((s, h) => s + h, 0)
  const isToday = selectedDate === today()

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-2xl">
      {/* Date navigation */}
      <div className="flex items-center gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold">Daily Planning</h2>
          <p className="text-sm text-muted-foreground">Set your top 3, protect your time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            className="w-7 h-7 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(today())}
            className={`text-xs px-3 h-7 rounded-lg border transition-colors ${isToday ? 'border-brand text-brand' : 'border-border hover:bg-accent text-muted-foreground'}`}
          >
            {formatDate(selectedDate, 'MMM d')}
          </button>
          <button
            onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            className="w-7 h-7 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily objective */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Daily Objective</h3>
        <textarea
          value={form.objective}
          onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
          placeholder="What is the one thing that makes today a win?"
          className="w-full h-20 px-3 py-2 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Top 3 priorities */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Top 3 Priorities</h3>
        <p className="text-xs text-muted-foreground">Maximum 3. If everything is a priority, nothing is.</p>
        <div className="space-y-2">
          {(['priority_1', 'priority_2', 'priority_3'] as const).map((key, i) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={`Priority ${i + 1}...`}
                className="flex-1 h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Time allocation */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Planned Hours by Category</h3>
          <span className="text-xs text-muted-foreground">{totalPlanned.toFixed(1)}h planned</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: cat.color }}
              />
              <span className="text-xs flex-1 truncate">{cat.name}</span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={timeAlloc[cat.id] ?? 0}
                onChange={(e) =>
                  setTimeAlloc((a) => ({ ...a, [cat.id]: parseFloat(e.target.value) || 0 }))
                }
                className="w-16 h-7 px-2 text-xs text-right bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Notes</h3>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional context for today..."
          className="w-full h-24 px-3 py-2 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full h-10 bg-brand text-brand-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Plan for {formatDate(selectedDate, 'MMM d')}
      </button>
    </div>
  )
}
