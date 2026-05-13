// ============================================================
// LifeOS Strategic Review Engine
// Template-based deterministic report generation — zero AI
// ============================================================

import type {
  Habit,
  HabitEntry,
  Goal,
  KPISnapshot,
  HabitCorrelation,
  FailurePattern,
  StrategicReview,
  ReviewItem,
  DailySummary,
} from '@/types'
import { format, parseISO, getDaysInMonth } from 'date-fns'

// ============================================================
// Helpers
// ============================================================

function pct(n: number) {
  return `${Math.round(n)}%`
}

function scoreLabel(n: number): string {
  if (n >= 90) return 'Excellent'
  if (n >= 75) return 'Strong'
  if (n >= 60) return 'Moderate'
  if (n >= 45) return 'Weak'
  return 'Critical'
}

function trend(current: number, previous: number): string {
  const delta = current - previous
  if (Math.abs(delta) < 2) return 'stable'
  return delta > 0 ? `up ${Math.round(delta)}pts` : `down ${Math.abs(Math.round(delta))}pts`
}

// ============================================================
// Habit performance helpers
// ============================================================

interface HabitPerf {
  habit: Habit
  rate: number
  label: string
}

function computeHabitPerformances(
  habits: Habit[],
  entries: HabitEntry[],
  dateRange: { start: string; end: string }
): HabitPerf[] {
  const result: HabitPerf[] = []

  for (const habit of habits.filter((h) => h.is_active)) {
    const relevantEntries = entries.filter(
      (e) => e.habit_id === habit.id && e.date >= dateRange.start && e.date <= dateRange.end
    )

    if (relevantEntries.length === 0) continue

    const completed = relevantEntries.filter((e) =>
      habit.type === 'binary' ? e.completed : (e.value ?? 0) >= (habit.target_value ?? 1)
    ).length

    const rate = (completed / relevantEntries.length) * 100

    result.push({
      habit,
      rate,
      label: scoreLabel(rate),
    })
  }

  return result.sort((a, b) => b.rate - a.rate)
}

// ============================================================
// Executive Summary Template
// ============================================================

function buildExecutiveSummary(
  kpis: KPISnapshot,
  period: string,
  topHabit: HabitPerf | undefined,
  weakestHabit: HabitPerf | undefined,
  prevKpis?: KPISnapshot
): string {
  const disciplineLabel = scoreLabel(kpis.discipline_score)
  const trendStr = prevKpis
    ? ` (${trend(kpis.discipline_score, prevKpis.discipline_score)} vs prior period)`
    : ''

  let summary = `${period} performance was ${disciplineLabel.toLowerCase()} with a Discipline Score of ${pct(kpis.discipline_score)}${trendStr}. `

  summary += `Out of ${kpis.total_tracked_days} tracked days, you achieved ${kpis.perfect_days} perfect days and maintained a best streak of ${kpis.best_streak} consecutive days. `

  if (topHabit) {
    summary += `Your strongest habit was "${topHabit.habit.name}" at ${pct(topHabit.rate)} completion. `
  }

  if (weakestHabit) {
    summary += `Your biggest opportunity remains "${weakestHabit.habit.name}" at ${pct(weakestHabit.rate)} completion. `
  }

  summary += `Goal alignment stands at ${pct(kpis.goal_alignment_score)} and self-control at ${pct(kpis.self_control_score)}.`

  return summary
}

// ============================================================
// Strengths
// ============================================================

function buildStrengths(
  kpis: KPISnapshot,
  habitPerfs: HabitPerf[],
  keystones: HabitCorrelation[]
): ReviewItem[] {
  const strengths: ReviewItem[] = []
  const topHabits = habitPerfs.filter((h) => h.rate >= 80).slice(0, 3)

  for (const h of topHabits) {
    strengths.push({
      title: `Strong: ${h.habit.name}`,
      description: `Completed ${pct(h.rate)} of the time — a ${h.label.toLowerCase()} result that anchors your daily discipline.`,
      metric: 'Completion Rate',
      value: pct(h.rate),
    })
  }

  if (kpis.discipline_score >= 75) {
    strengths.push({
      title: 'High Discipline Score',
      description: `Your overall Discipline Score of ${pct(kpis.discipline_score)} places you in ${scoreLabel(kpis.discipline_score).toLowerCase()} territory.`,
      metric: 'Discipline Score',
      value: pct(kpis.discipline_score),
    })
  }

  if (kpis.best_streak >= 7) {
    strengths.push({
      title: `Best Streak: ${kpis.best_streak} Days`,
      description: `You maintained a streak of ${kpis.best_streak} consecutive high-performance days — strong evidence of sustainable habits.`,
      metric: 'Best Streak',
      value: `${kpis.best_streak} days`,
    })
  }

  if (kpis.promise_integrity_score >= 75) {
    strengths.push({
      title: 'High Promise Integrity',
      description: `You followed through on ${pct(kpis.promise_integrity_score)} of your critical and high-priority commitments.`,
      metric: 'Promise Integrity',
      value: pct(kpis.promise_integrity_score),
    })
  }

  if (keystones.length > 0) {
    const top = keystones[0]
    strengths.push({
      title: `Keystone Habit: ${top.habit_name}`,
      description: `"${top.habit_name}" has the strongest positive correlation (${top.correlation_with_discipline.toFixed(2)}) with your Discipline Score — it's your highest-leverage daily action.`,
      metric: 'Correlation',
      value: top.correlation_with_discipline.toFixed(2),
    })
  }

  return strengths.slice(0, 5)
}

// ============================================================
// Weaknesses
// ============================================================

function buildWeaknesses(
  kpis: KPISnapshot,
  habitPerfs: HabitPerf[],
  patterns: FailurePattern[]
): ReviewItem[] {
  const weaknesses: ReviewItem[] = []
  const weakHabits = habitPerfs.filter((h) => h.rate < 60).slice(0, 3)

  for (const h of weakHabits) {
    weaknesses.push({
      title: `Weak: ${h.habit.name}`,
      description: `Only ${pct(h.rate)} completion rate. At priority level "${h.habit.priority}", this gap has outsized negative impact on your Discipline Score.`,
      metric: 'Completion Rate',
      value: pct(h.rate),
    })
  }

  if (kpis.self_control_score < 70) {
    weaknesses.push({
      title: 'Self-Control Deficit',
      description: `Self-Control Score of ${pct(kpis.self_control_score)} indicates recurring anti-habit incidents reducing performance quality.`,
      metric: 'Self-Control Score',
      value: pct(kpis.self_control_score),
    })
  }

  if (kpis.focus_score < 60) {
    weaknesses.push({
      title: 'Insufficient Deep Work',
      description: `Focus Score of ${pct(kpis.focus_score)} suggests below-target deep work hours. High-leverage work requires uninterrupted blocks.`,
      metric: 'Focus Score',
      value: pct(kpis.focus_score),
    })
  }

  for (const pattern of patterns.slice(0, 2)) {
    weaknesses.push({
      title: `Pattern: ${pattern.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`,
      description: pattern.description,
      metric: 'Occurrence Rate',
      value: `${pattern.occurrence_rate}%`,
    })
  }

  return weaknesses.slice(0, 5)
}

// ============================================================
// Bottlenecks
// ============================================================

function buildBottlenecks(
  kpis: KPISnapshot,
  habitPerfs: HabitPerf[],
  dailySummaries: DailySummary[]
): ReviewItem[] {
  const bottlenecks: ReviewItem[] = []

  // Find the single habit that, if improved, would most boost score
  const criticalWeak = habitPerfs
    .filter((h) => h.rate < 70 && (h.habit.priority === 'critical' || h.habit.priority === 'high'))
    .slice(0, 1)

  for (const h of criticalWeak) {
    const gap = 100 - h.rate
    bottlenecks.push({
      title: `Primary Bottleneck: ${h.habit.name}`,
      description: `A ${pct(gap)} gap on a ${h.habit.priority}-priority habit is your single biggest drag on overall performance. Fixing this alone could meaningfully lift your Discipline Score.`,
      metric: 'Gap to 100%',
      value: pct(gap),
    })
  }

  if (kpis.consistency_score < kpis.discipline_score - 10) {
    bottlenecks.push({
      title: 'Consistency Gap',
      description: `Your Consistency Score (${pct(kpis.consistency_score)}) significantly lags your Discipline Score (${pct(kpis.discipline_score)}), indicating high day-to-day variance.`,
      metric: 'Consistency vs Discipline',
      value: `${pct(kpis.consistency_score)} vs ${pct(kpis.discipline_score)}`,
    })
  }

  if (kpis.momentum_score < 50) {
    bottlenecks.push({
      title: 'Declining Momentum',
      description: `Momentum Score of ${pct(kpis.momentum_score)} (below 50) signals that recent performance is trending downward compared to the prior period.`,
      metric: 'Momentum Score',
      value: pct(kpis.momentum_score),
    })
  }

  return bottlenecks.slice(0, 3)
}

// ============================================================
// Highest-Leverage Improvements
// ============================================================

function buildHighestLeverage(
  habitPerfs: HabitPerf[],
  keystones: HabitCorrelation[],
  kpis: KPISnapshot
): ReviewItem[] {
  const items: ReviewItem[] = []

  // Top keystone habit improvement
  if (keystones.length > 0) {
    const top = keystones[0]
    const perf = habitPerfs.find((h) => h.habit.id === top.habit_id)
    if (perf && perf.rate < 85) {
      items.push({
        title: `Optimize "${top.habit_name}"`,
        description: `With a correlation of ${top.correlation_with_discipline.toFixed(2)} with Discipline Score, improving "${top.habit_name}" from ${pct(perf.rate)} to 90%+ would have the highest ROI of any single change.`,
        metric: 'Impact Potential',
        value: 'Highest',
      })
    }
  }

  // Highest-weight weak habit
  const highWeightWeak = habitPerfs
    .filter((h) => h.rate < 70)
    .sort((a, b) => b.habit.importance_weight - a.habit.importance_weight)[0]

  if (highWeightWeak && (!keystones[0] || highWeightWeak.habit.id !== keystones[0]?.habit_id)) {
    items.push({
      title: `Lift "${highWeightWeak.habit.name}" (weight: ${highWeightWeak.habit.importance_weight}/10)`,
      description: `This habit has high importance weight but only ${pct(highWeightWeak.rate)} completion — closing this gap yields disproportionate score gains.`,
      metric: 'Importance Weight',
      value: `${highWeightWeak.habit.importance_weight}/10`,
    })
  }

  // Sleep as lever if weak
  const sleepPerf = habitPerfs.find((h) => h.habit.name.toLowerCase().includes('sleep'))
  if (sleepPerf && sleepPerf.rate < 75) {
    items.push({
      title: 'Prioritize Sleep Consistency',
      description: `Sleep completion at ${pct(sleepPerf.rate)} likely cascades into lower energy, focus, and discipline. A 1-hour improvement in average sleep duration often unlocks performance across multiple habits.`,
      metric: 'Sleep Rate',
      value: pct(sleepPerf.rate),
    })
  }

  if (kpis.focus_score < 65) {
    items.push({
      title: 'Protect Deep Work Blocks',
      description: `Focus Score of ${pct(kpis.focus_score)} can be directly improved by scheduling and defending 2-4 hour uninterrupted work blocks each morning.`,
      metric: 'Focus Score',
      value: pct(kpis.focus_score),
    })
  }

  return items.slice(0, 4)
}

// ============================================================
// Next Period Priorities
// ============================================================

function buildNextPriorities(
  habitPerfs: HabitPerf[],
  kpis: KPISnapshot,
  goals: Goal[]
): string[] {
  const priorities: string[] = []

  // Focus on top 3 weakest critical/high habits
  const weakCritical = habitPerfs
    .filter((h) => h.rate < 75 && (h.habit.priority === 'critical' || h.habit.priority === 'high'))
    .slice(0, 2)

  for (const h of weakCritical) {
    priorities.push(
      `Raise "${h.habit.name}" completion from ${pct(h.rate)} to at least 80%`
    )
  }

  if (kpis.self_control_score < 75) {
    priorities.push('Reduce anti-habit incidents by 50% through friction-addition strategies')
  }

  if (kpis.consistency_score < 70) {
    priorities.push(
      'Eliminate "zero days" — complete at least one critical habit every day without exception'
    )
  }

  const behindGoals = goals
    .filter((g) => g.status === 'active' && g.current_value / g.target_value < 0.5)
    .slice(0, 1)

  for (const goal of behindGoals) {
    const pctDone = Math.round((goal.current_value / goal.target_value) * 100)
    priorities.push(
      `Accelerate "${goal.title}" progress — currently at ${pctDone}% of target`
    )
  }

  if (priorities.length < 3) {
    priorities.push('Maintain current momentum and push for a new personal best streak')
  }

  return priorities.slice(0, 5)
}

// ============================================================
// Main: Generate Strategic Review
// ============================================================

export function generateStrategicReview(
  period: string,
  kpis: KPISnapshot,
  habits: Habit[],
  habitEntries: HabitEntry[],
  goals: Goal[],
  dailySummaries: DailySummary[],
  keystoneHabits: HabitCorrelation[],
  failurePatterns: FailurePattern[],
  dateRange: { start: string; end: string },
  prevKpis?: KPISnapshot
): StrategicReview {
  const habitPerfs = computeHabitPerformances(habits, habitEntries, dateRange)
  const topHabit = habitPerfs[0]
  const weakestHabit = habitPerfs[habitPerfs.length - 1]

  return {
    period,
    generated_at: new Date().toISOString(),
    executive_summary: buildExecutiveSummary(kpis, period, topHabit, weakestHabit, prevKpis),
    strengths: buildStrengths(kpis, habitPerfs, keystoneHabits),
    weaknesses: buildWeaknesses(kpis, habitPerfs, failurePatterns),
    bottlenecks: buildBottlenecks(kpis, habitPerfs, dailySummaries),
    highest_leverage: buildHighestLeverage(habitPerfs, keystoneHabits, kpis),
    next_period_priorities: buildNextPriorities(habitPerfs, kpis, goals),
    kpi_snapshot: kpis,
  }
}
