// ============================================================
// LifeOS Deterministic Analytics Engine
// Root Cause Attribution, Keystone Habits, Failure Patterns,
// Recovery Speed, Goal ETA, Opportunity Cost
// All pure formula-based — zero AI/ML
// ============================================================

import type {
  Habit,
  HabitEntry,
  TimeEntry,
  TimeCategory,
  AntiHabitEntry,
  Goal,
  DailySummary,
  HabitCorrelation,
  FailurePattern,
  RootCauseAnalysis,
  CauseItem,
  OpportunityCost,
  GoalETA,
  RecoveryMetric,
  RecoveryEvent,
} from '@/types'
import {
  pearsonCorrelation,
  buildDailySummary,
  getDisciplineScore,
  isHabitApplicable,
  toDateStr,
} from '../kpi/engine'
import { eachDayOfInterval, parseISO, addDays, format } from 'date-fns'

// ============================================================
// Keystone Habit Ranking
// Rank habits by Pearson correlation with Discipline Score
// ============================================================

export function rankKeystoneHabits(
  habits: Habit[],
  habitEntries: HabitEntry[],
  dailySummaries: DailySummary[]
): HabitCorrelation[] {
  if (dailySummaries.length < 5) return []

  const results: HabitCorrelation[] = []

  for (const habit of habits.filter((h) => h.is_active)) {
    const paired: Array<{ completion: number; discipline: number; productivity: number }> = []

    for (const summary of dailySummaries) {
      if (!isHabitApplicable(habit, summary.date)) continue
      const entry = habitEntries.find(
        (e) => e.habit_id === habit.id && e.date === summary.date
      )
      const done =
        entry &&
        (habit.type === 'binary'
          ? entry.completed
          : (entry.value ?? 0) >= (habit.target_value ?? 1))

      paired.push({
        completion: done ? 1 : 0,
        discipline: summary.discipline_score / 100,
        productivity: summary.total_productive_hours / 8,
      })
    }

    if (paired.length < 5) continue

    const completions = paired.map((p) => p.completion)
    const disciplines = paired.map((p) => p.discipline)
    const productivities = paired.map((p) => p.productivity)

    const corrDiscipline = pearsonCorrelation(completions, disciplines)
    const corrProductivity = pearsonCorrelation(completions, productivities)

    // Weighted impact score: correlation × importance_weight
    const impactScore =
      (Math.abs(corrDiscipline) * 0.6 + Math.abs(corrProductivity) * 0.4) *
      habit.importance_weight

    results.push({
      habit_id: habit.id,
      habit_name: habit.name,
      correlation_with_discipline: parseFloat(corrDiscipline.toFixed(3)),
      correlation_with_productivity: parseFloat(corrProductivity.toFixed(3)),
      impact_score: parseFloat(impactScore.toFixed(3)),
      rank: 0,
    })
  }

  // Sort by impact descending, assign ranks
  results.sort((a, b) => b.impact_score - a.impact_score)
  results.forEach((r, i) => (r.rank = i + 1))

  return results
}

// ============================================================
// Failure Pattern Detection
// Find what conditions correlate with low-performance days
// ============================================================

export function detectFailurePatterns(
  dailySummaries: DailySummary[],
  habitEntries: HabitEntry[],
  habits: Habit[],
  threshold = 60 // below this discipline score = "bad day"
): FailurePattern[] {
  const patterns: FailurePattern[] = []
  const badDays = dailySummaries.filter((d) => d.discipline_score < threshold)
  const totalDays = dailySummaries.length

  if (badDays.length === 0 || totalDays < 7) return patterns

  // --- Pattern 1: Day of week ---
  const dowCounts = Array(7).fill(0)
  const dowTotal = Array(7).fill(0)
  const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (const day of dailySummaries) {
    const dow = parseISO(day.date).getDay()
    dowTotal[dow]++
    if (day.discipline_score < threshold) dowCounts[dow]++
  }

  for (let i = 0; i < 7; i++) {
    if (dowTotal[i] < 2) continue
    const rate = (dowCounts[i] / dowTotal[i]) * 100
    const globalRate = (badDays.length / totalDays) * 100
    if (rate > globalRate * 1.5 && rate > 40) {
      patterns.push({
        pattern_type: 'day_of_week',
        description: `${Math.round(rate)}% of ${dowNames[i]}s are below-threshold performance days`,
        occurrence_rate: parseFloat(rate.toFixed(1)),
        affected_kpi: 'Discipline Score',
        contributing_factors: [dowNames[i]],
      })
    }
  }

  // --- Pattern 2: Low sleep correlation ---
  const sleepHabit = habits.find(
    (h) => h.name.toLowerCase().includes('sleep') && h.type === 'numeric'
  )
  if (sleepHabit) {
    const lowSleepBadDays = badDays.filter((d) => {
      const entry = habitEntries.find(
        (e) => e.habit_id === sleepHabit.id && e.date === d.date
      )
      return entry && (entry.value ?? 0) < (sleepHabit.target_value ?? 7) * 0.85
    })

    const rate = (lowSleepBadDays.length / Math.max(badDays.length, 1)) * 100
    if (rate > 40) {
      patterns.push({
        pattern_type: 'low_sleep',
        description: `${Math.round(rate)}% of low-performance days had below-target sleep`,
        occurrence_rate: parseFloat(rate.toFixed(1)),
        affected_kpi: 'Discipline Score',
        contributing_factors: ['Sleep < target', 'Energy depletion'],
      })
    }
  }

  // --- Pattern 3: Multi-miss cascade ---
  let cascadeCount = 0
  for (let i = 1; i < dailySummaries.length; i++) {
    const prev = dailySummaries[i - 1]
    const curr = dailySummaries[i]
    if (prev.discipline_score < threshold && curr.discipline_score < threshold) {
      cascadeCount++
    }
  }

  const cascadeRate = (cascadeCount / Math.max(badDays.length, 1)) * 100
  if (cascadeRate > 30) {
    patterns.push({
      pattern_type: 'multi_miss',
      description: `${Math.round(cascadeRate)}% of low-performance days follow another low-performance day (cascade effect)`,
      occurrence_rate: parseFloat(cascadeRate.toFixed(1)),
      affected_kpi: 'Consistency Score',
      contributing_factors: ['Consecutive misses', 'Momentum loss'],
    })
  }

  return patterns.sort((a, b) => b.occurrence_rate - a.occurrence_rate)
}

// ============================================================
// Root Cause Attribution
// Correlate changes in inputs to changes in discipline score
// ============================================================

export function analyzeRootCauses(
  currentSummaries: DailySummary[],
  previousSummaries: DailySummary[],
  habits: Habit[],
  habitEntries: HabitEntry[]
): RootCauseAnalysis {
  const periodStart = currentSummaries[0]?.date ?? ''
  const periodEnd = currentSummaries[currentSummaries.length - 1]?.date ?? ''

  const currentAvgDiscipline =
    currentSummaries.reduce((s, d) => s + d.discipline_score, 0) /
    Math.max(currentSummaries.length, 1)
  const prevAvgDiscipline =
    previousSummaries.reduce((s, d) => s + d.discipline_score, 0) /
    Math.max(previousSummaries.length, 1)

  const disciplineChange = currentAvgDiscipline - prevAvgDiscipline

  const causes: CauseItem[] = []

  // Analyze each habit's completion rate change
  for (const habit of habits.filter((h) => h.is_active)) {
    const currentRate = computeCompletionRate(habit, habitEntries, periodStart, periodEnd)
    const prevPeriodEnd = previousSummaries[previousSummaries.length - 1]?.date ?? ''
    const prevPeriodStart = previousSummaries[0]?.date ?? ''
    const prevRate = computeCompletionRate(habit, habitEntries, prevPeriodStart, prevPeriodEnd)

    const change = currentRate - prevRate
    if (Math.abs(change) < 10) continue // Ignore minor fluctuations

    const impactWeight = habit.importance_weight / 10
    causes.push({
      factor: habit.name,
      direction: change > 0 ? 'increase' : 'decrease',
      magnitude: Math.abs(change),
      impact_on_kpi: 'Discipline Score',
      confidence: Math.min(0.9, impactWeight * Math.abs(change / 100)),
    })
  }

  // Sort by confidence * magnitude
  causes.sort((a, b) => b.confidence * b.magnitude - a.confidence * a.magnitude)

  const primary = causes.slice(0, 2)
  const secondary = causes.slice(2, 5)

  // Build recommendations
  const recommendations: string[] = []
  for (const cause of primary) {
    if (cause.direction === 'decrease') {
      recommendations.push(
        `Prioritize restoring "${cause.factor}" — it dropped ${Math.round(cause.magnitude)}% and is a high-impact habit.`
      )
    }
  }

  if (disciplineChange > 0) {
    recommendations.push('Overall trajectory is positive. Maintain current momentum.')
  } else if (disciplineChange < -10) {
    recommendations.push(
      'Significant decline detected. Focus on one high-priority habit at a time to rebuild consistency.'
    )
  }

  return {
    period_start: periodStart,
    period_end: periodEnd,
    primary_causes: primary,
    secondary_causes: secondary,
    recommendations,
  }
}

function computeCompletionRate(
  habit: Habit,
  entries: HabitEntry[],
  start: string,
  end: string
): number {
  if (!start || !end) return 0
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
  let applicable = 0
  let completed = 0

  for (const day of days) {
    const dateStr = toDateStr(day)
    if (!isHabitApplicable(habit, dateStr)) continue
    applicable++
    const entry = entries.find((e) => e.habit_id === habit.id && e.date === dateStr)
    if (
      entry &&
      (habit.type === 'binary'
        ? entry.completed
        : (entry.value ?? 0) >= (habit.target_value ?? 1))
    ) {
      completed++
    }
  }

  return applicable === 0 ? 0 : (completed / applicable) * 100
}

// ============================================================
// Opportunity Cost Engine
// ============================================================

export function calculateOpportunityCost(
  habits: Habit[],
  habitEntries: HabitEntry[],
  timeCategories: TimeCategory[],
  timeEntries: TimeEntry[],
  dateRange: { start: string; end: string }
): OpportunityCost[] {
  const results: OpportunityCost[] = []
  const days = eachDayOfInterval({
    start: parseISO(dateRange.start),
    end: parseISO(dateRange.end),
  })

  // Numeric habits: missed sessions
  for (const habit of habits.filter((h) => h.type === 'numeric' && h.is_active)) {
    let missed = 0
    let applicable = 0

    for (const day of days) {
      const dateStr = toDateStr(day)
      if (!isHabitApplicable(habit, dateStr)) continue
      applicable++
      const entry = habitEntries.find((e) => e.habit_id === habit.id && e.date === dateStr)
      const target = habit.target_value ?? 1
      const actual = entry?.value ?? 0
      if (actual < target) missed += target - actual
    }

    if (missed > 0 && applicable > 0) {
      results.push({
        category: habit.name,
        missed_sessions: Math.round(missed),
        avg_hours_per_session: 1,
        total_lost_hours: missed,
        potential_progress: `${Math.round(missed)} ${habit.unit ?? 'units'} of "${habit.name}" not achieved`,
      })
    }
  }

  // Time categories: difference between logged and potential
  for (const cat of timeCategories.filter((c) => c.is_productive && c.is_active)) {
    const entries = timeEntries.filter(
      (e) =>
        e.category_id === cat.id &&
        e.date >= dateRange.start &&
        e.date <= dateRange.end
    )
    const total = entries.reduce((s, e) => s + e.hours, 0)
    const potential = days.length * 2 // assume 2h/day potential
    const lost = Math.max(0, potential - total)

    if (lost > 5) {
      results.push({
        category: cat.name,
        missed_sessions: days.length - entries.length,
        avg_hours_per_session: 2,
        total_lost_hours: parseFloat(lost.toFixed(1)),
        potential_progress: `${lost.toFixed(0)} potential hours not logged for "${cat.name}"`,
      })
    }
  }

  return results.sort((a, b) => b.total_lost_hours - a.total_lost_hours)
}

// ============================================================
// Goal ETA Calculator
// ============================================================

export function calculateGoalETAs(
  goals: Goal[],
  asOfDate: string
): GoalETA[] {
  return goals
    .filter((g) => g.status === 'active' && g.is_active)
    .map((goal) => {
      const remaining = Math.max(0, goal.target_value - goal.current_value)

      // Estimate daily rate from start_date to today
      const daysElapsed = Math.max(
        1,
        Math.ceil(
          (parseISO(asOfDate).getTime() - parseISO(goal.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
      const avgRate = goal.current_value / daysElapsed // units per day

      const etaDays = avgRate > 0 ? Math.ceil(remaining / avgRate) : Infinity
      const etaDate =
        avgRate > 0
          ? format(addDays(parseISO(asOfDate), etaDays), 'yyyy-MM-dd')
          : 'Unknown'

      const onTrack = goal.deadline
        ? etaDate <= goal.deadline
        : true

      const confidence: 'high' | 'medium' | 'low' =
        daysElapsed >= 14 ? 'high' : daysElapsed >= 7 ? 'medium' : 'low'

      return {
        goal_id: goal.id,
        goal_title: goal.title,
        remaining_value: remaining,
        avg_completion_rate: parseFloat(avgRate.toFixed(2)),
        eta_days: isFinite(etaDays) ? etaDays : -1,
        eta_date: etaDate,
        confidence,
        on_track: onTrack,
      }
    })
}

// ============================================================
// Recovery Speed Metric
// ============================================================

export function calculateRecoverySpeed(
  disciplineScores: Array<{ date: string; score: number }>,
  dropThreshold = 70,
  baselineWindow = 7
): RecoveryMetric {
  const sorted = [...disciplineScores].sort((a, b) => a.date.localeCompare(b.date))
  const events: RecoveryEvent[] = []

  let i = 0
  while (i < sorted.length) {
    const { date, score } = sorted[i]

    // Look for a drop below threshold
    if (score < dropThreshold) {
      // Calculate rolling baseline from previous days
      const prevScores = sorted.slice(Math.max(0, i - baselineWindow), i)
      if (prevScores.length < 3) {
        i++
        continue
      }
      const baseline = prevScores.reduce((s, d) => s + d.score, 0) / prevScores.length

      // Find recovery point (return to baseline)
      let recovered = false
      for (let j = i + 1; j < sorted.length && j < i + 30; j++) {
        if (sorted[j].score >= baseline * 0.95) {
          events.push({
            drop_date: date,
            baseline_score: parseFloat(baseline.toFixed(1)),
            low_score: score,
            recovery_date: sorted[j].date,
            days_to_recover: j - i,
          })
          recovered = true
          i = j
          break
        }
      }

      if (!recovered) i++
    } else {
      i++
    }
  }

  if (events.length === 0) {
    return {
      avg_recovery_days: 0,
      fastest_recovery: 0,
      slowest_recovery: 0,
      recovery_events: [],
    }
  }

  const days = events.map((e) => e.days_to_recover)
  return {
    avg_recovery_days: parseFloat(
      (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1)
    ),
    fastest_recovery: Math.min(...days),
    slowest_recovery: Math.max(...days),
    recovery_events: events,
  }
}
