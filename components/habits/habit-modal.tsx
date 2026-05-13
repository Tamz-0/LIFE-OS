'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useModal } from '@/stores/app'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Habit } from '@/types'
import { today } from '@/lib/utils'

const habitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(['binary', 'numeric']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  importance_weight: z.number().min(1).max(10),
  target_value: z.number().optional(),
  unit: z.string().optional(),
  frequency: z.enum(['daily', 'weekdays', 'weekends', 'custom']),
  start_date: z.string(),
})

type HabitForm = z.infer<typeof habitSchema>

export function HabitModal() {
  const { activeModal, modalData, closeModal } = useModal()
  const qc = useQueryClient()
  const isOpen = activeModal === 'create-habit' || activeModal === 'edit-habit'
  const isEdit = activeModal === 'edit-habit'
  const editHabit = modalData.habit as Habit | undefined

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<HabitForm>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
      category: 'General',
      type: 'binary',
      priority: 'medium',
      importance_weight: 5,
      frequency: 'daily',
      start_date: today(),
    },
  })

  const habitType = watch('type')

  useEffect(() => {
    if (isEdit && editHabit) {
      reset({
        name: editHabit.name,
        description: editHabit.description ?? '',
        category: editHabit.category,
        type: editHabit.type,
        priority: editHabit.priority,
        importance_weight: editHabit.importance_weight,
        target_value: editHabit.target_value,
        unit: editHabit.unit ?? '',
        frequency: editHabit.frequency,
        start_date: editHabit.start_date,
      })
    } else if (!isEdit) {
      reset({ name: '', category: 'General', type: 'binary', priority: 'medium', importance_weight: 5, frequency: 'daily', start_date: today() })
    }
  }, [isEdit, editHabit, reset])

  const mutation = useMutation({
    mutationFn: async (data: HabitForm) => {
      const url = isEdit ? `/api/habits/${editHabit!.id}` : '/api/habits'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save habit')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success(isEdit ? 'Habit updated' : 'Habit created')
      closeModal()
    },
    onError: () => toast.error('Failed to save habit'),
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/habits/${editHabit!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived_at: new Date().toISOString(), is_active: false }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success('Habit archived')
      closeModal()
    },
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">{isEdit ? 'Edit Habit' : 'New Habit'}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Name *</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Morning Exercise"
                  className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow placeholder:text-muted-foreground"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Category + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <input
                    {...register('category')}
                    placeholder="General"
                    className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Type + Frequency row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Type</label>
                  <select
                    {...register('type')}
                    className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  >
                    <option value="binary">Binary (done/not done)</option>
                    <option value="numeric">Numeric (tracked value)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Frequency</label>
                  <select
                    {...register('frequency')}
                    className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Numeric fields */}
              {habitType === 'numeric' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Target Value</label>
                    <input
                      {...register('target_value', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 7"
                      className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Unit</label>
                    <input
                      {...register('unit')}
                      placeholder="hours, pages, km..."
                      className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    />
                  </div>
                </div>
              )}

              {/* Importance weight */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Importance Weight: {watch('importance_weight')}/10
                </label>
                <input
                  {...register('importance_weight', { valueAsNumber: true })}
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low impact</span>
                  <span>High impact</span>
                </div>
              </div>

              {/* Start date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Start Date</label>
                <input
                  {...register('start_date')}
                  type="date"
                  className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border gap-3">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Archive habit
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 h-8 rounded-lg text-sm border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit((d) => mutation.mutate(d))}
                  disabled={mutation.isPending}
                  className="px-4 h-8 rounded-lg text-sm bg-brand text-brand-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isEdit ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
