// ============================================================
// LifeOS KPI Calculation Engine
// Pure deterministic functions — no side effects, fully typed
// ============================================================

import type {
  Habit,
  HabitEntry,
  TimeEntry,
  TimeCategory,
  AntiHabitEntry,
  Goal,
  DailySummary,
  WeeklySummary,
  KPISnapshot,
  KPIWeights,
  DisciplineScoreConfig,
} from '@/types'
import {
  eachDayOfInterval,
  format,
  parseISO,
  isWeekend,
  getDay,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  isSameWeek,
} from 'date-fns'

// ============================================================
// Helpers
// ============================================================

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Returns true if a habit is applicable on a given date */
export function isHabitApplicable(habit: Habit, dateStr: string): boolean {
  if (!habit.is_active) return false
  if (dateStr < habit.start_date) return false
  if (habit.end_date && dateStr > habit.end_date) return false

  const d = parseISO(dateStr)
  const dow = getDay(d) // 0=Sun … 6=Sat

  switch (habit.frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return dow >= 1 && dow <= 5
    case 'weekends':
      return dow === 0 || dow === 6
    case 'custom':
      return (habit.custom_days ?? []).includes(dow)
    default:
      return true
  }
}

/** Clamp a value between min and max */
function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

/** Pearson correlation coefficient between two equal-length arrays — exported for use by analytics engine */
export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0

  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n

  let num = 0
  let denX = 0
  let denY = 0

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }

  const denom = Math.sqrt(denX * denY)
  return denom === 0 ? 0 : num / denom
}

// ============================================================
// Daily Completion Rate
// ============================================================

export function getDailyCompletionRate(
  habits: Habit[],
  entries: HabitEntry[],
  dateStr: string
): { completed: number; total: number; rate: number } {
  const applicable = habits.filter((h) => isHabitApplicable(h, dateStr))
  const total = applicable.length
  if (total === 0) return { completed: 0, total: 0, rate: 0 }

  const completed = applicable.filter((h) => {
    const entry = entries.find((e) => e.habit_id === h.id && e.date === dateStr)
    if (!entry) return false
    if (h.type === 'binary') return entry.completed
    return entry.value !== undefined && entry.value >= (h.target_value ?? 1)
  }).length

  return { completed, total, rate: (completed / total) * 100 }
}

// ============================================================
// Discipline Score (0-100)
// Weighted completion rate by habit priority
// ============================================================

export function getDisciplineScore(
  habits: Habit[],
  entries: HabitEntry[],
  dateStr: string,
  config: DisciplineScoreConfig
): number {
  const applicable = habits.filter((h) => isHabitApplicable(h, dateStr))
  if (applicable.length === 0) return 0

  const weightMap: Record<string, number> = {
    critical: config.critical_habit_weight,
    high: config.high_habit_weight,
    medium: config.medium_habit_weight,
    low: config.low_habit_weight,
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const habit of applicable) {
    const w = (weightMap[habit.priority] ?? 1) * habit.importance_weight
    const entry = entries.find((e) => e.habit_id === habit.id && e.date === dateStr)
    const done =
      entry &&
      (habit.type === 'binary'
        ? entry.completed
        : (entry.value ?? 0) >= (habit.target_value ?? 1))

    weightedSum += done ? w : 0
    totalWeight += w
  }

  return totalWeight === 0 ? 0 : clamp((weightedSum / totalWeight) * 100)
}

// ============================================================
// Productivity Score (0-100)
// Ratio of productive hours to total tracked hours
// ============================================================

export function getProductivityScore(
  timeEntries: TimeEntry[],
  categories: TimeCategory[],
  dateStr: string
): number {
  const dayEntries = timeEntries.filter((e) => e.date === dateStr)
  if (dayEntries.length === 0) return 0

  let productive = 0
  let total = 0

  for (const entry of dayEntries) {
    const cat = categories.find((c) => c.id === entry.category_id)
    total += entry.hours
    if (cat?.is_productive) productive += entry.hours
  }

  return total === 0 ? 0 : clamp((productive / total) * 100)
}

// ============================================================
// Focus Score (0-100)
// Based on deep work / coding / study hours relative to target
// Target: 4 hours deep work per day
// ============================================================

export function getFocusScore(
  timeEntries: TimeEntry[],
  categories: TimeCategory[],
  dateStr: string,
  targetDeepWorkHours = 4
): number {
  const deepWorkNames = ['deep work', 'coding', 'study', 'writing', 'reading']
  const dayEntries = timeEntries.filter((e) => e.date === dateStr)

  let deepHours = 0
  for (const entry of dayEntries) {
    const cat = categories.find((c) => c.id === entry.category_id)
    if (cat && deepWorkNames.some((n) => cat.name.toLowerCase().includes(n))) {
      deepHours += entry.hours
    }
  }

  return clamp((deepHours / targetDeepWorkHours) * 100)
}

// ============================================================
// Self-Control Score (0-100)
// Penalty for anti-habit incidents
// ============================================================

export function getSelfControlScore(
  antiHabitEntries: AntiHabitEntry[],
  dateStr: string
): number {
  const dayEntries = antiHabitEntries.filter((e) => e.date === dateStr)
  const totalIncidents = dayEntries.reduce((sum, e) => sum + e.incident_count, 0)
  // Each incident costs 15 points, floor at 0
  return clamp(100 - totalIncidents * 15)
}

// ============================================================
// Consistency Score (0-100)
// Rolling 7-day average discipline score
// ============================================================

export function getConsistencyScore(
  disciplineScores: Array<{ date: string; score: number }>,
  asOfDate: string,
  windowDays = 7
): number {
  const sorted = disciplineScores
    .filter((d) => d.date <= asOfDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, windowDays)

  if (sorted.length === 0) return 0
  const avg = sorted.reduce((s, d) => s + d.score, 0) / sorted.length
  return clamp(avg)
}

// ============================================================
// Promise Integrity Score (0-100)
// % of top-priority habits completed across tracked period
// ============================================================

export function getPromiseIntegrityScore(
  habits: Habit[],
  entries: HabitEntry[],
  dateRange: { start: string; end: string }
): number {
  const criticalHabits = habits.filter(
    (h) => h.priority === 'critical' || h.priority === 'high'
  )
  if (criticalHabits.length === 0) return 100

  const days = eachDayOfInterval({
    start: parseISO(dateRange.start),
    end: parseISO(dateRange.end),
  })

  let applicable = 0
  let completed = 0

  for (const day of days) {
    const dateStr = toDateStr(day)
    for (const habit of criticalHabits) {
      if (!isHabitApplicable(habit, dateStr)) continue
      applicable++
      const entry = entries.find((e) => e.habit_id === habit.id && e.date === dateStr)
      if (entry && (habit.type === 'binary' ? entry.completed : (entry.value ?? 0) >= (habit.target_value ?? 1))) {
        completed++
      }
    }
  }

  return applicable === 0 ? 100 : clamp((completed / applicable) * 100)
}

// ============================================================
// Goal Alignment Score (0-100)
// Average progress across all active goals
// ============================================================

export function getGoalAlignmentScore(goals: Goal[]): number {
  const active = goals.filter((g) => g.status === 'active' && g.is_active)
  if (active.length === 0) return 0

  const avgProgress =
    active.reduce((sum, g) => sum + clamp((g.current_value / g.target_value) * 100), 0) /
    active.length

  return clamp(avgProgress)
}

// ============================================================
// Momentum Score (0-100)
// Trend: compare last 7 days vs previous 7 days
// ============================================================

export function getMomentumScore(
  disciplineScores: Array<{ date: string; score: number }>,
  asOfDate: string
): number {
  const sorted = disciplineScores
    .filter((d) => d.date <= asOfDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  const recent = sorted.slice(0, 7)
  const previous = sorted.slice(7, 14)

  if (recent.length === 0) return 50
  if (previous.length === 0) return clamp(recent.reduce((s, d) => s + d.score, 0) / recent.length)

  const recentAvg = recent.reduce((s, d) => s + d.score, 0) / recent.length
  const prevAvg = previous.reduce((s, d) => s + d.score, 0) / previous.length

  // Score = 50 baseline + trend bonus
  const trend = ((recentAvg - prevAvg) / Math.max(prevAvg, 1)) * 50
  return clamp(50 + trend)
}

// ============================================================
// Perfect Days
// Days where discipline score >= 90
// ============================================================

export function getPerfectDays(
  disciplineScores: Array<{ date: string; score: number }>,
  threshold = 90
): number {
  return disciplineScores.filter((d) => d.score >= threshold).length
}

// ============================================================
// Best Streak (consecutive perfect days)
// ============================================================

export function getBestStreak(
  disciplineScores: Array<{ date: string; score: number }>,
  threshold = 80
): number {
  const sorted = [...disciplineScores].sort((a, b) => a.date.localeCompare(b.date))
  let best = 0
  let current = 0

  for (const d of sorted) {
    if (d.score >= threshold) {
      current++
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }
  return best
}

// ============================================================
// Current Streak
// ============================================================

export function getCurrentStreak(
  disciplineScores: Array<{ date: string; score: number }>,
  threshold = 80
): number {
  const sorted = [...disciplineScores].sort((a, b) => b.date.localeCompare(a.date))
  let current = 0
  for (const d of sorted) {
    if (d.score >= threshold) current++
    else break
  }
  return current
}

// ============================================================
// Daily Summary builder
// ============================================================

export function buildDailySummary(
  dateStr: string,
  habits: Habit[],
  habitEntries: HabitEntry[],
  timeEntries: TimeEntry[],
  timeCategories: TimeCategory[],
  antiHabitEntries: AntiHabitEntry[],
  config: DisciplineScoreConfig
): DailySummary {
  const { completed, total, rate } = getDailyCompletionRate(habits, habitEntries, dateStr)
  const disciplineScore = getDisciplineScore(habits, habitEntries, dateStr, config)

  const dayTimeEntries = timeEntries.filter((e) => e.date === dateStr)
  const totalHours = dayTimeEntries.reduce((s, e) => s + e.hours, 0)
  const productiveHours = dayTimeEntries
    .filter((e) => timeCategories.find((c) => c.id === e.category_id)?.is_productive)
    .reduce((s, e) => s + e.hours, 0)

  const incidents = antiHabitEntries
    .filter((e) => e.date === dateStr)
    .reduce((s, e) => s + e.incident_count, 0)

  return {
    date: dateStr,
    habits_completed: completed,
    habits_total: total,
    completion_rate: rate,
    total_productive_hours: productiveHours,
    total_hours: totalHours,
    anti_habit_incidents: incidents,
    discipline_score: disciplineScore,
    is_perfect_day: disciplineScore >= 90,
  }
}

// ============================================================
// Weekly Summary builder
// ============================================================

export function buildWeeklySummary(
  dailySummaries: DailySummary[],
  weekStart: string,
  weekEnd: string
): WeeklySummary {
  const days = dailySummaries.filter((d) => d.date >= weekStart && d.date <= weekEnd)

  if (days.length === 0) {
    return {
      week_start: weekStart,
      week_end: weekEnd,
      avg_completion_rate: 0,
      total_productive_hours: 0,
      total_hours: 0,
      perfect_days: 0,
      anti_habit_incidents: 0,
      avg_discipline_score: 0,
      best_day: weekStart,
      worst_day: weekStart,
    }
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  const bestDay = days.reduce((best, d) =>
    d.discipline_score > best.discipline_score ? d : best
  ).date

  const worstDay = days.reduce((worst, d) =>
    d.discipline_score < worst.discipline_score ? d : worst
  ).date

  return {
    week_start: weekStart,
    week_end: weekEnd,
    avg_completion_rate: avg(days.map((d) => d.completion_rate)),
    total_productive_hours: days.reduce((s, d) => s + d.total_productive_hours, 0),
    total_hours: days.reduce((s, d) => s + d.total_hours, 0),
    perfect_days: days.filter((d) => d.is_perfect_day).length,
    anti_habit_incidents: days.reduce((s, d) => s + d.anti_habit_incidents, 0),
    avg_discipline_score: avg(days.map((d) => d.discipline_score)),
    best_day: bestDay,
    worst_day: worstDay,
  }
}

// ============================================================
// Full KPI Snapshot
// ============================================================

export function buildKPISnapshot(
  habits: Habit[],
  habitEntries: HabitEntry[],
  timeEntries: TimeEntry[],
  timeCategories: TimeCategory[],
  antiHabitEntries: AntiHabitEntry[],
  goals: Goal[],
  dateRange: { start: string; end: string },
  config: DisciplineScoreConfig,
  weights: KPIWeights
): KPISnapshot {
  const days = eachDayOfInterval({
    start: parseISO(dateRange.start),
    end: parseISO(dateRange.end),
  })

  const disciplineScores = days.map((d) => {
    const dateStr = toDateStr(d)
    return {
      date: dateStr,
      score: getDisciplineScore(habits, habitEntries, dateStr, config),
    }
  })

  const lastDay = toDateStr(days[days.length - 1])

  const avgDiscipline =
    disciplineScores.length > 0
      ? disciplineScores.reduce((s, d) => s + d.score, 0) / disciplineScores.length
      : 0

  const { rate: completionPct } = getDailyCompletionRate(habits, habitEntries, lastDay)

  const productivityScores = days.map((d) =>
    getProductivityScore(timeEntries, timeCategories, toDateStr(d))
  )
  const avgProductivity =
    productivityScores.length > 0
      ? productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length
      : 0

  const focusScores = days.map((d) =>
    getFocusScore(timeEntries, timeCategories, toDateStr(d))
  )
  const avgFocus =
    focusScores.length > 0
      ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length
      : 0

  return {
    discipline_score: clamp(avgDiscipline),
    promise_integrity_score: getPromiseIntegrityScore(habits, habitEntries, dateRange),
    productivity_score: clamp(avgProductivity),
    focus_score: clamp(avgFocus),
    consistency_score: getConsistencyScore(disciplineScores, lastDay),
    self_control_score: getSelfControlScore(antiHabitEntries, lastDay),
    goal_alignment_score: getGoalAlignmentScore(goals),
    momentum_score: getMomentumScore(disciplineScores, lastDay),
    completion_percentage: completionPct,
    perfect_days: getPerfectDays(disciplineScores),
    best_streak: getBestStreak(disciplineScores),
    total_tracked_days: days.length,
  }
}
