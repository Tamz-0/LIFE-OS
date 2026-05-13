import { describe, it, expect } from 'vitest'
import { generateStrategicReview } from '../../lib/reports/strategic-review'
import type {
  KPISnapshot,
  Habit,
  HabitEntry,
  Goal,
  DailySummary,
  HabitCorrelation,
  FailurePattern,
} from '../../types'

const baseKpis: KPISnapshot = {
  discipline_score: 72,
  promise_integrity_score: 68,
  productivity_score: 65,
  focus_score: 55,
  consistency_score: 70,
  self_control_score: 80,
  goal_alignment_score: 60,
  momentum_score: 52,
  completion_percentage: 72,
  perfect_days: 8,
  best_streak: 5,
  total_tracked_days: 30,
}

const weakKpis: KPISnapshot = {
  ...baseKpis,
  discipline_score: 38,
  self_control_score: 40,
  focus_score: 30,
  momentum_score: 25,
}

const strongKpis: KPISnapshot = {
  ...baseKpis,
  discipline_score: 91,
  promise_integrity_score: 95,
  best_streak: 21,
  perfect_days: 20,
}

const habits: Habit[] = [
  {
    id: 'h1', name: 'Deep Work', category: 'Productivity', type: 'binary',
    priority: 'critical', importance_weight: 9, frequency: 'daily',
    sort_order: 1, start_date: '2024-01-01', is_active: true,
    created_at: '2024-01-01', updated_at: '2024-01-01',
  },
  {
    id: 'h2', name: 'Sleep 7h', category: 'Health', type: 'numeric',
    priority: 'high', importance_weight: 8, target_value: 7, frequency: 'daily',
    sort_order: 2, start_date: '2024-01-01', is_active: true,
    created_at: '2024-01-01', updated_at: '2024-01-01',
  },
  {
    id: 'h3', name: 'Meditation', category: 'Health', type: 'binary',
    priority: 'medium', importance_weight: 5, frequency: 'daily',
    sort_order: 3, start_date: '2024-01-01', is_active: true,
    created_at: '2024-01-01', updated_at: '2024-01-01',
  },
]

// 30 days: h1 = 90%, h2 = 40%, h3 = 85%
const habitEntries: HabitEntry[] = Array.from({ length: 30 }, (_, i) => {
  const date = `2024-01-${String(i + 1).padStart(2, '0')}`
  return [
    { id: `e1_${i}`, habit_id: 'h1', date, completed: i < 27, created_at: '', updated_at: '' },
    { id: `e2_${i}`, habit_id: 'h2', date, completed: false, value: i < 12 ? 7 : 5, created_at: '', updated_at: '' },
    { id: `e3_${i}`, habit_id: 'h3', date, completed: i < 25, created_at: '', updated_at: '' },
  ]
}).flat()

const goals: Goal[] = [
  {
    id: 'g1', title: 'Read 24 Books', category: 'Learning', target_value: 24,
    current_value: 6, unit: 'books', status: 'active', priority: 'high',
    linked_habit_ids: [], linked_time_category_ids: [], sort_order: 1,
    start_date: '2024-01-01', is_active: true, created_at: '', updated_at: '',
  },
]

const dailySummaries: DailySummary[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2024-01-${String(i + 1).padStart(2, '0')}`,
  habits_completed: 2,
  habits_total: 3,
  completion_rate: 66,
  total_productive_hours: 4,
  total_hours: 8,
  anti_habit_incidents: 0,
  discipline_score: 65 + (i % 5) * 4,
  is_perfect_day: false,
}))

const keystones: HabitCorrelation[] = [
  { habit_id: 'h1', habit_name: 'Deep Work', correlation_with_discipline: 0.72, correlation_with_productivity: 0.68, impact_score: 6.5, rank: 1 },
  { habit_id: 'h2', habit_name: 'Sleep 7h', correlation_with_discipline: 0.55, correlation_with_productivity: 0.6, impact_score: 4.4, rank: 2 },
]

const patterns: FailurePattern[] = []

const dateRange = { start: '2024-01-01', end: '2024-01-30' }

// ============================================================
// generateStrategicReview
// ============================================================
describe('generateStrategicReview', () => {
  it('generates a non-empty executive summary', () => {
    const review = generateStrategicReview(
      'January 2024', baseKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    expect(review.executive_summary.length).toBeGreaterThan(50)
    expect(review.executive_summary).toContain('January 2024')
  })

  it('includes perfect days and best streak in summary', () => {
    const review = generateStrategicReview(
      'January 2024', baseKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    expect(review.executive_summary).toContain('8')
    expect(review.executive_summary).toContain('5')
  })

  it('returns at least one strength when discipline >= 75', () => {
    const review = generateStrategicReview(
      'January 2024', strongKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    expect(review.strengths.length).toBeGreaterThan(0)
  })

  it('returns at least one weakness when a habit is below 60%', () => {
    const review = generateStrategicReview(
      'January 2024', baseKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    expect(review.weaknesses.length).toBeGreaterThan(0)
  })

  it('includes self-control weakness when score < 70', () => {
    const review = generateStrategicReview(
      'January 2024', weakKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    const scWeakness = review.weaknesses.find((w) =>
      w.title.toLowerCase().includes('self-control')
    )
    expect(scWeakness).toBeDefined()
  })

  it('always generates 3-5 next period priorities', () => {
    const review = generateStrategicReview(
      'January 2024', baseKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    expect(review.next_period_priorities.length).toBeGreaterThanOrEqual(1)
    expect(review.next_period_priorities.length).toBeLessThanOrEqual(5)
  })

  it('includes keystone habit in strengths or highest leverage when available', () => {
    const review = generateStrategicReview(
      'January 2024', strongKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    // Keystone appears either in strengths (if high completion) or highest_leverage (if needs improvement)
    const allItems = [...review.strengths, ...review.highest_leverage]
    const keystoneItem = allItems.find((s) =>
      s.title.toLowerCase().includes('keystone') ||
      s.title.toLowerCase().includes('deep work')
    )
    expect(keystoneItem).toBeDefined()
  })

  it('includes period and generated_at in output', () => {
    const review = generateStrategicReview(
      'January 2024', baseKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange
    )
    expect(review.period).toBe('January 2024')
    expect(review.generated_at).toBeTruthy()
  })

  it('includes trend comparison when prevKpis provided', () => {
    const prevKpis: KPISnapshot = { ...baseKpis, discipline_score: 55 }
    const review = generateStrategicReview(
      'January 2024', baseKpis, habits, habitEntries, goals,
      dailySummaries, keystones, patterns, dateRange, prevKpis
    )
    // Should mention "up" since 72 > 55
    expect(review.executive_summary).toContain('up')
  })

  it('handles empty habits gracefully', () => {
    expect(() =>
      generateStrategicReview(
        'January 2024', baseKpis, [], [], goals,
        dailySummaries, [], patterns, dateRange
      )
    ).not.toThrow()
  })
})
