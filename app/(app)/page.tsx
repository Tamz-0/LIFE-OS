'use client'

import { useQuery } from '@tanstack/react-query'
import { KPICard, MiniKPICard } from '@/components/ui/kpi-card'
import { DisciplineChart } from '@/components/analytics/discipline-chart'
import { HabitHeatmap } from '@/components/habits/habit-heatmap'
import { GoalProgressList } from '@/components/goals/goal-progress-list'
import { TodayHabits } from '@/components/habits/today-habits'
import { AntiHabitTracker } from '@/components/habits/anti-habit-tracker'
import { getCurrentMonthRange, today } from '@/lib/utils'
import {
  Flame, Trophy, Star, Zap, Target, Brain,
  Shield, TrendingUp, CheckCircle2, Calendar,
} from 'lucide-react'
import type { KPISnapshot } from '@/types'

export default function OverviewPage() {
  const { start, end } = getCurrentMonthRange()

  const { data: kpis, isLoading } = useQuery<KPISnapshot>({
    queryKey: ['kpis', start, end],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?type=kpi&start=${start}&end=${end}`)
      if (!res.ok) throw new Error('Failed to fetch KPIs')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold">Good morning</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s your performance snapshot for this month.
        </p>
      </div>

      {/* Primary KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KPICard
          title="Discipline Score"
          value={kpis?.discipline_score ?? 0}
          description="Weighted habit performance"
          icon={<Zap className="w-4 h-4" />}
          loading={isLoading}
          highlight
        />
        <KPICard
          title="Promise Integrity"
          value={kpis?.promise_integrity_score ?? 0}
          description="Critical & high habit follow-through"
          icon={<Shield className="w-4 h-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Productivity"
          value={kpis?.productivity_score ?? 0}
          description="Productive vs total hours"
          icon={<Brain className="w-4 h-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Focus Score"
          value={kpis?.focus_score ?? 0}
          description="Deep work hours ratio"
          icon={<Target className="w-4 h-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Consistency"
          value={kpis?.consistency_score ?? 0}
          description="7-day rolling average"
          icon={<TrendingUp className="w-4 h-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Self-Control"
          value={kpis?.self_control_score ?? 0}
          description="Anti-habit resistance"
          icon={<Shield className="w-4 h-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Goal Alignment"
          value={kpis?.goal_alignment_score ?? 0}
          description="Average goal progress"
          icon={<Target className="w-4 h-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Momentum"
          value={kpis?.momentum_score ?? 0}
          description="Recent vs prior 7 days"
          icon={<TrendingUp className="w-4 h-4" />}
          loading={isLoading}
        />
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKPICard
          title="Completion Today"
          value={kpis?.completion_percentage ?? 0}
          suffix="%"
          icon={<CheckCircle2 className="w-4 h-4" />}
          loading={isLoading}
        />
        <MiniKPICard
          title="Perfect Days"
          value={kpis?.perfect_days ?? 0}
          icon={<Star className="w-4 h-4" />}
          loading={isLoading}
        />
        <MiniKPICard
          title="Best Streak"
          value={kpis?.best_streak ?? 0}
          suffix=" days"
          icon={<Flame className="w-4 h-4" />}
          loading={isLoading}
        />
        <MiniKPICard
          title="Days Tracked"
          value={kpis?.total_tracked_days ?? 0}
          icon={<Calendar className="w-4 h-4" />}
          loading={isLoading}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discipline trend chart */}
        <div className="lg:col-span-2">
          <DisciplineChart dateRange={{ start, end }} />
        </div>

        {/* Today's habits */}
        <div>
          <TodayHabits />
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalProgressList />
        <AntiHabitTracker />
      </div>
    </div>
  )
}
