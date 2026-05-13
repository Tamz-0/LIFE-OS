import { describe, it, expect } from 'vitest'
import {
  isHabitApplicable,
  getDailyCompletionRate,
  getDisciplineScore,
  getProductivityScore,
  getSelfControlScore,
  getConsistencyScore,
  getBestStreak,
  getCurrentStreak,
  getPerfectDays,
  getMomentumScore,
  pearsonCorrelation,
  buildDailySummary,
} from '../../lib/kpi/engine'
import type { Habit, HabitEntry, TimeEntry, TimeCategory, AntiHabitEntry, DisciplineScoreConfig } from '../../types'

const baseConfig: DisciplineScoreConfig = {
  critical_habit_weight: 3,
  high_habit_weight: 2,
  medium_habit_weight: 1.5,
  low_habit_weight: 1,
}

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Test Habit',
  category: 'Test',
  type: 'binary',
  priority: 'medium',
  importance_weight: 5,
  frequency: 'daily',
  sort_order: 1,
  start_date: '2024-01-01',
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
})

const makeEntry = (overrides: Partial<HabitEntry> = {}): HabitEntry => ({
  id: 'e1',
  habit_id: 'h1',
  date: '2024-01-15',
  completed: true,
  created_at: '2024-01-15',
  updated_at: '2024-01-15',
  ...overrides,
})

// ============================================================
// isHabitApplicable
// ============================================================
describe('isHabitApplicable', () => {
  it('returns true for daily habit within date range', () => {
    const h = makeHabit({ start_date: '2024-01-01', frequency: 'daily' })
    expect(isHabitApplicable(h, '2024-01-15')).toBe(true)
  })

  it('returns false for inactive habit', () => {
    const h = makeHabit({ is_active: false })
    expect(isHabitApplicable(h, '2024-01-15')).toBe(false)
  })

  it('returns false for date before start_date', () => {
    const h = makeHabit({ start_date: '2024-02-01' })
    expect(isHabitApplicable(h, '2024-01-15')).toBe(false)
  })

  it('returns false for date after end_date', () => {
    const h = makeHabit({ end_date: '2024-01-10' })
    expect(isHabitApplicable(h, '2024-01-15')).toBe(false)
  })

  it('returns false for weekday habit on weekend', () => {
    const h = makeHabit({ frequency: 'weekdays' })
    expect(isHabitApplicable(h, '2024-01-13')).toBe(false) // Saturday
  })

  it('returns true for weekday habit on weekday', () => {
    const h = makeHabit({ frequency: 'weekdays' })
    expect(isHabitApplicable(h, '2024-01-15')).toBe(true) // Monday
  })

  it('returns true for weekend habit on weekend', () => {
    const h = makeHabit({ frequency: 'weekends' })
    expect(isHabitApplicable(h, '2024-01-13')).toBe(true) // Saturday
  })

  it('respects custom days', () => {
    const h = makeHabit({ frequency: 'custom', custom_days: [1, 3] }) // Mon, Wed
    expect(isHabitApplicable(h, '2024-01-15')).toBe(true) // Monday
    expect(isHabitApplicable(h, '2024-01-16')).toBe(false) // Tuesday
    expect(isHabitApplicable(h, '2024-01-17')).toBe(true) // Wednesday
  })
})

// ============================================================
// getDailyCompletionRate
// ============================================================
describe('getDailyCompletionRate', () => {
  it('returns 0 when no applicable habits', () => {
    const result = getDailyCompletionRate([], [], '2024-01-15')
    expect(result).toEqual({ completed: 0, total: 0, rate: 0 })
  })

  it('computes correct rate with mixed completions', () => {
    const habits = [
      makeHabit({ id: 'h1' }),
      makeHabit({ id: 'h2', name: 'Habit 2' }),
    ]
    const entries = [
      makeEntry({ habit_id: 'h1', date: '2024-01-15', completed: true }),
      makeEntry({ id: 'e2', habit_id: 'h2', date: '2024-01-15', completed: false }),
    ]
    const result = getDailyCompletionRate(habits, entries, '2024-01-15')
    expect(result.completed).toBe(1)
    expect(result.total).toBe(2)
    expect(result.rate).toBe(50)
  })

  it('counts 100% when all complete', () => {
    const habits = [makeHabit()]
    const entries = [makeEntry({ completed: true })]
    const result = getDailyCompletionRate(habits, entries, '2024-01-15')
    expect(result.rate).toBe(100)
  })

  it('handles numeric habits with target', () => {
    const habits = [makeHabit({ type: 'numeric', target_value: 7 })]
    const entries = [makeEntry({ completed: false, value: 7 })]
    const result = getDailyCompletionRate(habits, entries, '2024-01-15')
    expect(result.completed).toBe(1)
  })
})

// ============================================================
// getDisciplineScore
// ============================================================
describe('getDisciplineScore', () => {
  it('returns 0 with no applicable habits', () => {
    expect(getDisciplineScore([], [], '2024-01-15', baseConfig)).toBe(0)
  })

  it('returns 100 when all critical habits done', () => {
    const habits = [makeHabit({ priority: 'critical' })]
    const entries = [makeEntry({ completed: true })]
    expect(getDisciplineScore(habits, entries, '2024-01-15', baseConfig)).toBe(100)
  })

  it('returns 0 when nothing completed', () => {
    const habits = [makeHabit()]
    expect(getDisciplineScore(habits, [], '2024-01-15', baseConfig)).toBe(0)
  })

  it('weights critical habits more than low habits', () => {
    const habits = [
      makeHabit({ id: 'h1', priority: 'critical', importance_weight: 5 }),
      makeHabit({ id: 'h2', name: 'Low', priority: 'low', importance_weight: 5 }),
    ]
    const criticalOnly = [makeEntry({ habit_id: 'h1', completed: true })]
    const lowOnly = [makeEntry({ id: 'e2', habit_id: 'h2', completed: true })]
    const critScore = getDisciplineScore(habits, criticalOnly, '2024-01-15', baseConfig)
    const lowScore = getDisciplineScore(habits, lowOnly, '2024-01-15', baseConfig)
    expect(critScore).toBeGreaterThan(lowScore)
  })
})

// ============================================================
// getProductivityScore
// ============================================================
describe('getProductivityScore', () => {
  it('returns 0 with no entries', () => {
    expect(getProductivityScore([], [], '2024-01-15')).toBe(0)
  })

  it('returns 100 when all hours are productive', () => {
    const cats: TimeCategory[] = [{ id: 'c1', name: 'Study', color: '#6366f1', is_productive: true, sort_order: 1, start_date: '2024-01-01', is_active: true, created_at: '', updated_at: '' }]
    const entries: TimeEntry[] = [{ id: 'e1', category_id: 'c1', date: '2024-01-15', hours: 4, created_at: '', updated_at: '' }]
    expect(getProductivityScore(entries, cats, '2024-01-15')).toBe(100)
  })

  it('returns 50 when half productive', () => {
    const cats: TimeCategory[] = [
      { id: 'c1', name: 'Study', color: '#6366f1', is_productive: true, sort_order: 1, start_date: '2024-01-01', is_active: true, created_at: '', updated_at: '' },
      { id: 'c2', name: 'Social Media', color: '#ef4444', is_productive: false, sort_order: 2, start_date: '2024-01-01', is_active: true, created_at: '', updated_at: '' },
    ]
    const entries: TimeEntry[] = [
      { id: 'e1', category_id: 'c1', date: '2024-01-15', hours: 4, created_at: '', updated_at: '' },
      { id: 'e2', category_id: 'c2', date: '2024-01-15', hours: 4, created_at: '', updated_at: '' },
    ]
    expect(getProductivityScore(entries, cats, '2024-01-15')).toBe(50)
  })
})

// ============================================================
// getSelfControlScore
// ============================================================
describe('getSelfControlScore', () => {
  it('returns 100 with no incidents', () => {
    expect(getSelfControlScore([], '2024-01-15')).toBe(100)
  })

  it('deducts 15 per incident', () => {
    const entries: AntiHabitEntry[] = [
      { id: 'ae1', anti_habit_id: 'ah1', date: '2024-01-15', incident_count: 2, created_at: '', updated_at: '' },
    ]
    expect(getSelfControlScore(entries, '2024-01-15')).toBe(70)
  })

  it('floors at 0', () => {
    const entries: AntiHabitEntry[] = [
      { id: 'ae1', anti_habit_id: 'ah1', date: '2024-01-15', incident_count: 10, created_at: '', updated_at: '' },
    ]
    expect(getSelfControlScore(entries, '2024-01-15')).toBe(0)
  })
})

// ============================================================
// getBestStreak / getCurrentStreak / getPerfectDays
// ============================================================
describe('streak and perfect day calculations', () => {
  const scores = [
    { date: '2024-01-01', score: 85 },
    { date: '2024-01-02', score: 90 },
    { date: '2024-01-03', score: 75 },
    { date: '2024-01-04', score: 40 },
    { date: '2024-01-05', score: 85 },
    { date: '2024-01-06', score: 88 },
    { date: '2024-01-07', score: 92 },
  ]

  it('computes best streak correctly', () => {
    expect(getBestStreak(scores, 80)).toBe(3) // Jan 5,6,7
  })

  it('computes current streak correctly', () => {
    expect(getCurrentStreak(scores, 80)).toBe(3)
  })

  it('counts perfect days with threshold 90', () => {
    expect(getPerfectDays(scores, 90)).toBe(2) // 90 and 92
  })

  it('returns 0 streak when last day is below threshold', () => {
    const s = [
      { date: '2024-01-01', score: 85 },
      { date: '2024-01-02', score: 40 },
    ]
    expect(getCurrentStreak(s, 80)).toBe(0)
  })
})

// ============================================================
// getMomentumScore
// ============================================================
describe('getMomentumScore', () => {
  it('returns 50 with insufficient data', () => {
    expect(getMomentumScore([], '2024-01-15')).toBe(50)
  })

  it('returns above 50 when recent days outperform previous', () => {
    const scores = [
      // previous 7 days (older)
      { date: '2024-01-01', score: 50 },
      { date: '2024-01-02', score: 50 },
      { date: '2024-01-03', score: 50 },
      { date: '2024-01-04', score: 50 },
      { date: '2024-01-05', score: 50 },
      { date: '2024-01-06', score: 50 },
      { date: '2024-01-07', score: 50 },
      // recent 7 days
      { date: '2024-01-08', score: 80 },
      { date: '2024-01-09', score: 80 },
      { date: '2024-01-10', score: 80 },
      { date: '2024-01-11', score: 80 },
      { date: '2024-01-12', score: 80 },
      { date: '2024-01-13', score: 80 },
      { date: '2024-01-14', score: 80 },
    ]
    const momentum = getMomentumScore(scores, '2024-01-14')
    expect(momentum).toBeGreaterThan(50)
  })
})

// ============================================================
// pearsonCorrelation
// ============================================================
describe('pearsonCorrelation', () => {
  it('returns 1 for perfectly correlated arrays', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [2, 4, 6, 8, 10]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(1, 5)
  })

  it('returns -1 for perfectly negatively correlated arrays', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [10, 8, 6, 4, 2]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(-1, 5)
  })

  it('returns 0 for identical arrays (no variance)', () => {
    expect(pearsonCorrelation([5, 5, 5], [5, 5, 5])).toBe(0)
  })

  it('returns 0 for arrays shorter than 2', () => {
    expect(pearsonCorrelation([1], [1])).toBe(0)
    expect(pearsonCorrelation([], [])).toBe(0)
  })
})

// ============================================================
// getConsistencyScore
// ============================================================
describe('getConsistencyScore', () => {
  it('returns average of last 7 days', () => {
    const scores = [
      { date: '2024-01-01', score: 80 },
      { date: '2024-01-02', score: 60 },
      { date: '2024-01-03', score: 70 },
    ]
    const result = getConsistencyScore(scores, '2024-01-03', 7)
    expect(result).toBeCloseTo((80 + 60 + 70) / 3, 1)
  })

  it('returns 0 with no data', () => {
    expect(getConsistencyScore([], '2024-01-15', 7)).toBe(0)
  })
})
