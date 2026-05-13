'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppUI, useModal } from '@/stores/app'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn, PRIORITY_COLORS } from '@/lib/utils'
import {
  Plus, X, Loader2, Target, CheckCircle2, Pause,
  MoreHorizontal, Edit2, Archive, TrendingUp,
} from 'lucide-react'
import type { Goal, GoalETA } from '@/types'
import { format, parseISO } from 'date-fns'

const goalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  target_value: z.number().min(0.01),
  current_value: z.number().min(0),
  unit: z.string().min(1),
  deadline: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  start_date: z.string(),
})

type GoalForm = z.infer<typeof goalSchema>

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: (g: Goal) => void; onDelete: (id: string) => void }) {
  const pct = Math.min(100, (goal.current_value / goal.target_value) * 100)
  const qc = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const updateValueMutation = useMutation({
    mutationFn: async (newValue: number) => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_value: newValue }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => toast.error('Failed to update'),
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">{goal.title}</h3>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', PRIORITY_COLORS[goal.priority])}>
              {goal.priority}
            </span>
          </div>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[130px] py-1 text-xs">
              <button
                onClick={() => { onEdit(goal); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { onDelete(goal.id); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent text-destructive transition-colors"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {goal.current_value} / {goal.target_value} {goal.unit}
          </span>
          <span className="font-semibold tabular-nums">{Math.round(pct)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Quick increment */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="1"
          defaultValue={goal.current_value}
          onBlur={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val !== goal.current_value) {
              updateValueMutation.mutate(val)
            }
          }}
          className="flex-1 h-7 px-2 text-xs bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
          placeholder="Update progress..."
        />
        {goal.deadline && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            Due {format(parseISO(goal.deadline), 'MMM d')}
          </span>
        )}
        {updateValueMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      {/* Category badge */}
      <div className="text-[10px] text-muted-foreground">{goal.category}</div>
    </motion.div>
  )
}

function GoalModal({ isOpen, onClose, editGoal }: { isOpen: boolean; onClose: () => void; editGoal?: Goal }) {
  const qc = useQueryClient()
  const isEdit = !!editGoal

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { category: 'General', priority: 'medium', unit: 'units', target_value: 100, current_value: 0, start_date: new Date().toISOString().slice(0, 10) },
  })

  useEffect(() => {
    if (editGoal) {
      reset({
        title: editGoal.title,
        description: editGoal.description ?? '',
        category: editGoal.category,
        target_value: editGoal.target_value,
        current_value: editGoal.current_value,
        unit: editGoal.unit,
        deadline: editGoal.deadline ?? '',
        priority: editGoal.priority,
        start_date: editGoal.start_date,
      })
    } else {
      reset({ category: 'General', priority: 'medium', unit: 'units', target_value: 100, current_value: 0, start_date: new Date().toISOString().slice(0, 10) })
    }
  }, [editGoal, reset])

  const mutation = useMutation({
    mutationFn: async (data: GoalForm) => {
      const url = isEdit ? `/api/goals/${editGoal!.id}` : '/api/goals'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast.success(isEdit ? 'Goal updated' : 'Goal created')
      onClose()
    },
    onError: () => toast.error('Failed to save goal'),
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">{isEdit ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Title *</label>
                <input {...register('title')} placeholder="e.g. Read 24 Books" className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Target</label>
                  <input {...register('target_value', { valueAsNumber: true })} type="number" min="0" step="any" className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Unit</label>
                  <input {...register('unit')} placeholder="books, problems..." className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Current Progress</label>
                  <input {...register('current_value', { valueAsNumber: true })} type="number" min="0" step="any" className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priority</label>
                  <select {...register('priority')} className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <input {...register('category')} className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Deadline</label>
                  <input {...register('deadline')} type="date" className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </form>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button onClick={onClose} className="px-4 h-8 rounded-lg text-sm border border-border hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleSubmit((d) => mutation.mutate(d))} disabled={mutation.isPending}
                className="px-4 h-8 rounded-lg text-sm bg-brand text-brand-foreground hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
                {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                {isEdit ? 'Save' : 'Create Goal'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function GoalsPage() {
  const { setActiveTab } = useAppUI()
  const [modalOpen, setModalOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | undefined>()
  const qc = useQueryClient()

  useEffect(() => { setActiveTab('goals') }, [setActiveTab])

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: etas = [] } = useQuery<GoalETA[]>({
    queryKey: ['goal-etas'],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=eta&end=${new Date().toISOString().slice(0, 10)}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived_at: new Date().toISOString(), is_active: false, status: 'abandoned' }),
      })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal archived') },
  })

  const active = goals.filter((g) => g.status === 'active' && g.is_active)
  const completed = goals.filter((g) => g.status === 'completed')

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Goals</h2>
          <p className="text-sm text-muted-foreground">{active.length} active · {completed.length} completed</p>
        </div>
        <button
          onClick={() => { setEditGoal(undefined); setModalOpen(true) }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-brand-foreground text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> New Goal
        </button>
      </div>

      {/* ETA cards */}
      {etas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {etas.slice(0, 3).map((eta) => (
            <div key={eta.goal_id} className={cn(
              'p-3 rounded-lg border text-xs',
              eta.on_track ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
            )}>
              <p className="font-medium truncate">{eta.goal_title}</p>
              <p className="text-muted-foreground mt-1">
                {eta.eta_days > 0
                  ? `ETA: ${eta.eta_days} days (${eta.eta_date})`
                  : 'Insufficient data for ETA'}
              </p>
              <p className="text-muted-foreground">
                {eta.avg_completion_rate.toFixed(2)} {''}/day · {eta.confidence} confidence
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Active goals grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : active.length === 0 ? (
        <div className="py-20 text-center">
          <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No active goals yet.</p>
          <button onClick={() => setModalOpen(true)} className="mt-2 text-sm text-brand hover:underline">Create your first goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => { setEditGoal(g); setModalOpen(true) }}
              onDelete={(id) => archiveMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <GoalModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditGoal(undefined) }}
        editGoal={editGoal}
      />
    </div>
  )
}
