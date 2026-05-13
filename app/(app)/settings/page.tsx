'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppUI } from '@/stores/app'
import { useThemeStore } from '@/stores/app'
import { toast } from 'sonner'
import { Loader2, Palette, Clock, Database, Shield, Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Settings, ThemeAccent } from '@/types'

const ACCENTS: Array<{ id: ThemeAccent; label: string; color: string }> = [
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'violet', label: 'Violet', color: 'bg-violet-500' },
  { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', color: 'bg-rose-500' },
  { id: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
]

function SectionCard({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { setActiveTab } = useAppUI()
  const { theme, accent, setTheme, setAccent } = useThemeStore()
  const qc = useQueryClient()

  useEffect(() => { setActiveTab('settings') }, [setActiveTab])

  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const [timeout, setTimeout_] = useState(30)
  const [kpiWeights, setKpiWeights] = useState({
    habit_weight: 0.4,
    time_weight: 0.3,
    goal_weight: 0.2,
    anti_habit_penalty: 0.1,
  })
  const [disciplineWeights, setDisciplineWeights] = useState({
    critical_habit_weight: 3,
    high_habit_weight: 2,
    medium_habit_weight: 1.5,
    low_habit_weight: 1,
  })

  useEffect(() => {
    if (settings) {
      setTimeout_(settings.session_timeout_minutes)
      if (settings.kpi_weights) setKpiWeights(settings.kpi_weights as typeof kpiWeights)
      if (settings.discipline_score_weights) setDisciplineWeights(settings.discipline_score_weights as typeof disciplineWeights)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          accent_color: accent,
          session_timeout_minutes: timeout,
          kpi_weights: kpiWeights,
          discipline_score_weights: disciplineWeights,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  async function handleExportAll() {
    try {
      const [habits, goals, antiHabits] = await Promise.all([
        fetch('/api/habits').then((r) => r.json()),
        fetch('/api/goals').then((r) => r.json()),
        fetch('/api/anti-habits').then((r) => r.json()),
      ])
      const data = { habits, goals, antiHabits, exportedAt: new Date().toISOString() }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exported')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your LifeOS experience.</p>
      </div>

      {/* Appearance */}
      <SectionCard title="Appearance" icon={<Palette className="w-4 h-4" />}>
        {/* Theme */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Theme</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'flex-1 h-9 rounded-lg border text-sm capitalize transition-colors',
                  theme === t
                    ? 'border-brand bg-brand/10 text-brand font-medium'
                    : 'border-border hover:bg-accent text-muted-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Accent Color</label>
          <div className="flex gap-2 flex-wrap">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                title={a.label}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  a.color,
                  accent === a.id
                    ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110'
                    : 'opacity-70 hover:opacity-100'
                )}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Session */}
      <SectionCard title="Session & Security" icon={<Shield className="w-4 h-4" />}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Auto-lock after inactivity
          </label>
          <select
            value={timeout}
            onChange={(e) => setTimeout_(parseInt(e.target.value))}
            className="w-full h-9 px-3 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={0}>Never</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={480}>8 hours</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            Session is protected by HTTP-only cookie. Change APP_PASSWORD in your environment to update.
          </p>
        </div>
      </SectionCard>

      {/* KPI Weights */}
      <SectionCard title="KPI Weights" icon={<Database className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground">
          Configure how different inputs contribute to your overall scores.
        </p>
        <div className="space-y-3">
          {[
            { key: 'habit_weight', label: 'Habit completion weight' },
            { key: 'time_weight', label: 'Time tracking weight' },
            { key: 'goal_weight', label: 'Goal progress weight' },
            { key: 'anti_habit_penalty', label: 'Anti-habit penalty' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium">
                  {(kpiWeights[key as keyof typeof kpiWeights] * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={kpiWeights[key as keyof typeof kpiWeights]}
                onChange={(e) =>
                  setKpiWeights((w) => ({ ...w, [key]: parseFloat(e.target.value) }))
                }
                className="w-full accent-brand"
              />
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Discipline Score: Priority Weights</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'critical_habit_weight', label: 'Critical' },
              { key: 'high_habit_weight', label: 'High' },
              { key: 'medium_habit_weight', label: 'Medium' },
              { key: 'low_habit_weight', label: 'Low' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-1">{label}</span>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={disciplineWeights[key as keyof typeof disciplineWeights]}
                  onChange={(e) =>
                    setDisciplineWeights((w) => ({
                      ...w,
                      [key]: parseFloat(e.target.value) || 1,
                    }))
                  }
                  className="w-16 h-7 px-2 text-xs text-right bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Data */}
      <SectionCard title="Data & Backup" icon={<Download className="w-4 h-4" />}>
        <div className="space-y-3">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm hover:bg-accent transition-colors w-full"
          >
            <Download className="w-4 h-4" />
            Export All Data (JSON)
          </button>
          <p className="text-[11px] text-muted-foreground">
            Exports habits, goals, and anti-habits configuration. Historical entries are stored in your Supabase database.
          </p>
        </div>
      </SectionCard>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full h-10 bg-brand text-brand-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Settings
      </button>
    </div>
  )
}
