import { describe, it, expect } from 'vitest'
import {
  calculateGoalETAs,
  calculateOpportunityCost,
  calculateRecoverySpeed,
  detectFailurePatterns,
} from '../../lib/analytics/engine'
import type { Goal, DailySummary, AntiHabitEntry, Habit, HabitEntry, TimeCategory, TimeEntry } from '../../types'

// ============================================================
// calculateGoalETAs
// ============================================================
describe('calculateGoalETAs', () => {
  const baseGoal: Goal = {
    id: 'g1',
    title: 'Read 24 Books',
    category: 'Learning',
    target_value: 24,
    current_value: 12,
    unit: 'books',
    status: 'active',
    priority: 'high',
    linked_habit_ids: [],
    linked_time_category_ids: [],
    sort_order: 1,
    start_date: '2024-01-01',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  it('computes ETA based on average rate', () => {
    const goal = { ...baseGoal, current_value: 12 }
    const asOfDate = '2024-07-01' // ~182 days from start
    const etas = calculateGoalETAs([goal], asOfDate)
    expect(etas).toHaveLength(1)
    expect(etas[0].remaining_value).toBe(12)
    expect(etas[0].eta_days).toBeGreaterThan(0)
    expect(etas[0].avg_completion_rate).toBeGreaterThan(0)
  })

  it('returns -1 eta_days when rate is 0', () => {
    const goal = { ...baseGoal, current_value: 0, start_date: '2024-07-01' }
    const etas = calculateGoalETAs([goal], '2024-07-01')
    expect(etas[0].eta_days).toBe(-1)
  })

  it('marks on_track=true when ETA before deadline', () => {
    const goal = {
      ...baseGoal,
      current_value: 22,
      start_date: '2024-01-01',
      deadline: '2030-12-31',
    }
    const etas = calculateGoalETAs([goal], '2024-07-01')
    expect(etas[0].on_track).toBe(true)
  })

  it('marks on_track=false when ETA after deadline', () => {
    const goal = {
      ...baseGoal,
      current_value: 1,
      start_date: '2024-01-01',
      deadline: '2024-02-01', // very soon
    }
    const etas = calculateGoalETAs([goal], '2024-07-01')
    expect(etas[0].on_track).toBe(false)
  })

  it('filters out non-active goals', () => {
    const goal = { ...baseGoal, status: 'completed' as const }
    const etas = calculateGoalETAs([goal], '2024-07-01')
    expect(etas).toHaveLength(0)
  })

  it('confidence is low when less than 7 days elapsed', () => {
    const goal = { ...baseGoal, start_date: '2024-07-01', current_value: 1 }
    const etas = calculateGoalETAs([goal], '2024-07-04')
    expect(etas[0].confidence).toBe('low')
  })

  it('confidence is medium between 7 and 14 days', () => {
    const goal = { ...baseGoal, start_date: '2024-07-01', current_value: 5 }
    const etas = calculateGoalETAs([goal], '2024-07-10')
    expect(etas[0].confidence).toBe('medium')
  })

  it('confidence is high after 14+ days', () => {
    const goal = { ...baseGoal, start_date: '2024-01-01', current_value: 12 }
    const etas = calculateGoalETAs([goal], '2024-07-01')
    expect(etas[0].confidence).toBe('high')
  })
})

// ============================================================
// calculateRecoverySpeed
// ============================================================
describe('calculateRecoverySpeed', () => {
  it('returns zero metric when no drops', () => {
    const scores = [
      { date: '2024-01-01', score: 85 },
      { date: '2024-01-02', score: 87 },
      { date: '2024-01-03', score: 90 },
    ]
    const result = calculateRecoverySpeed(scores, 70)
    expect(result.recovery_events).toHaveLength(0)
    expect(result.avg_recovery_days).toBe(0)
  })

  it('detects a drop and recovery event', () => {
    const scores = [
      { date: '2024-01-01', score: 85 },
      { date: '2024-01-02', score: 86 },
      { date: '2024-01-03', score: 84 },
      { date: '2024-01-04', score: 55 }, // drop below 70
      { date: '2024-01-05', score: 83 }, // recovery
    ]
    const result = calculateRecoverySpeed(scores, 70, 3)
    expect(result.recovery_events.length).toBeGreaterThan(0)
    if (result.recovery_events.length > 0) {
      expect(result.recovery_events[0].days_to_recover).toBe(1)
    }
  })

  it('computes avg correctly over multiple events', () => {
    const scores = Array.from({ length: 20 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      score: i % 5 === 3 ? 50 : 85,
    }))
    const result = calculateRecoverySpeed(scores, 70, 3)
    if (result.recovery_events.length > 1) {
      const manual =
        result.recovery_events.reduce((s, e) => s + e.days_to_recover, 0) /
        result.recovery_events.length
      expect(result.avg_recovery_days).toBeCloseTo(manual, 1)
    }
  })
})

// ============================================================
// detectFailurePatterns
// ============================================================
describe('detectFailurePatterns', () => {
  function makeSummary(date: string, score: number): DailySummary {
    return {
      date,
      habits_completed: score >= 60 ? 5 : 2,
      habits_total: 5,
      completion_rate: score,
      total_productive_hours: score >= 60 ? 4 : 1,
      total_hours: 8,
      anti_habit_incidents: score < 60 ? 3 : 0,
      discipline_score: score,
      is_perfect_day: score >= 90,
    }
  }

  it('returns empty array with insufficient data', () => {
    const summaries = [makeSummary('2024-01-01', 50)]
    const patterns = detectFailurePatterns(summaries, [], [], 60)
    expect(patterns).toHaveLength(0)
  })

  it('detects multi-miss cascade pattern', () => {
    const summaries = [
      makeSummary('2024-01-01', 85),
      makeSummary('2024-01-02', 45), // bad
      makeSummary('2024-01-03', 40), // cascade
      makeSummary('2024-01-04', 85),
      makeSummary('2024-01-05', 42), // bad
      makeSummary('2024-01-06', 38), // cascade
      makeSummary('2024-01-07', 85),
      makeSummary('2024-01-08', 80),
      makeSummary('2024-01-09', 75),
    ]
    const patterns = detectFailurePatterns(summaries, [], [], 60)
    const cascades = patterns.filter((p) => p.pattern_type === 'multi_miss')
    expect(cascades.length).toBeGreaterThan(0)
  })

  it('sorts patterns by occurrence rate descending', () => {
    const summaries = Array.from({ length: 14 }, (_, i) => {
      const dow = (i % 7)
      return makeSummary(
        `2024-01-${String(i + 1).padStart(2, '0')}`,
        dow === 0 ? 35 : 85 // Always bad on Sundays
      )
    })
    const patterns = detectFailurePatterns(summaries, [], [], 60)
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i - 1].occurrence_rate).toBeGreaterThanOrEqual(patterns[i].occurrence_rate)
    }
  })
})

// ============================================================
// calculateOpportunityCost
// ============================================================
describe('calculateOpportunityCost', () => {
  it('returns empty array with no habits or categories', () => {
    const result = calculateOpportunityCost([], [], [], [], {
      start: '2024-01-01',
      end: '2024-01-31',
    })
    expect(result).toHaveLength(0)
  })

  it('detects lost hours for numeric habit', () => {
    const habit: Habit = {
      id: 'h1',
      name: 'Study',
      category: 'Learning',
      type: 'numeric',
      priority: 'high',
      importance_weight: 8,
      target_value: 2,
      unit: 'hours',
      frequency: 'daily',
      sort_order: 1,
      start_date: '2024-01-01',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    // Only logged 1 hour each day (target=2), so 1 hour missed/day × 7 days = 7 hours
    const entries: HabitEntry[] = Array.from({ length: 7 }, (_, i) => ({
      id: `e${i}`,
      habit_id: 'h1',
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      completed: false,
      value: 1,
      created_at: '',
      updated_at: '',
    }))

    const result = calculateOpportunityCost(
      [habit],
      entries,
      [],
      [],
      { start: '2024-01-01', end: '2024-01-07' }
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].total_lost_hours).toBe(7)
  })
})
