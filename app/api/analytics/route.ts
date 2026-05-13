import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkServerSession } from '@/lib/auth/session'
import { buildKPISnapshot, buildDailySummary } from '@/lib/kpi/engine'
import {
  rankKeystoneHabits,
  detectFailurePatterns,
  calculateOpportunityCost,
  calculateGoalETAs,
  calculateRecoverySpeed,
  analyzeRootCauses,
} from '@/lib/analytics/engine'
import { eachDayOfInterval, parseISO, format, subDays } from 'date-fns'
import type { DisciplineScoreConfig, KPIWeights } from '@/types'

const DEFAULT_DISCIPLINE_CONFIG: DisciplineScoreConfig = {
  critical_habit_weight: 3,
  high_habit_weight: 2,
  medium_habit_weight: 1.5,
  low_habit_weight: 1,
}

const DEFAULT_KPI_WEIGHTS: KPIWeights = {
  habit_weight: 0.4,
  time_weight: 0.3,
  goal_weight: 0.2,
  anti_habit_penalty: 0.1,
}

export async function GET(request: NextRequest) {
  if (!(await checkServerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') ?? format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const endDate = searchParams.get('end') ?? format(new Date(), 'yyyy-MM-dd')
  const type = searchParams.get('type') ?? 'kpi'

  // Fetch all data in parallel
  const [habitsRes, entriesRes, timeEntriesRes, categoriesRes, antiHabitsRes, antiEntriesRes, goalsRes, settingsRes] =
    await Promise.all([
      supabase.from('habits').select('*').is('archived_at', null),
      supabase.from('habit_entries').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('time_entries').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('time_categories').select('*').is('archived_at', null),
      supabase.from('anti_habits').select('*').is('archived_at', null),
      supabase.from('anti_habit_entries').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('goals').select('*').is('archived_at', null),
      supabase.from('settings').select('*').single(),
    ])

  const habits = habitsRes.data ?? []
  const habitEntries = entriesRes.data ?? []
  const timeEntries = timeEntriesRes.data ?? []
  const timeCategories = categoriesRes.data ?? []
  const antiHabitEntries = antiEntriesRes.data ?? []
  const goals = goalsRes.data ?? []
  const settings = settingsRes.data

  const disciplineConfig: DisciplineScoreConfig =
    settings?.discipline_score_weights ?? DEFAULT_DISCIPLINE_CONFIG
  const kpiWeights: KPIWeights = settings?.kpi_weights ?? DEFAULT_KPI_WEIGHTS

  const dateRange = { start: startDate, end: endDate }

  if (type === 'kpi') {
    const kpis = buildKPISnapshot(
      habits,
      habitEntries,
      timeEntries,
      timeCategories,
      antiHabitEntries,
      goals,
      dateRange,
      disciplineConfig,
      kpiWeights
    )
    return NextResponse.json(kpis)
  }

  if (type === 'daily') {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    })

    const dailySummaries = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd')
      return buildDailySummary(
        dateStr,
        habits,
        habitEntries,
        timeEntries,
        timeCategories,
        antiHabitEntries,
        disciplineConfig
      )
    })

    return NextResponse.json(dailySummaries)
  }

  if (type === 'keystone') {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    })

    const dailySummaries = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd')
      return buildDailySummary(
        dateStr,
        habits,
        habitEntries,
        timeEntries,
        timeCategories,
        antiHabitEntries,
        disciplineConfig
      )
    })

    const keystones = rankKeystoneHabits(habits, habitEntries, dailySummaries)
    return NextResponse.json(keystones)
  }

  if (type === 'patterns') {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    })

    const dailySummaries = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd')
      return buildDailySummary(
        dateStr,
        habits,
        habitEntries,
        timeEntries,
        timeCategories,
        antiHabitEntries,
        disciplineConfig
      )
    })

    const patterns = detectFailurePatterns(dailySummaries, habitEntries, habits)
    return NextResponse.json(patterns)
  }

  if (type === 'opportunity') {
    const costs = calculateOpportunityCost(
      habits,
      habitEntries,
      timeCategories,
      timeEntries,
      dateRange
    )
    return NextResponse.json(costs)
  }

  if (type === 'eta') {
    const etas = calculateGoalETAs(goals, endDate)
    return NextResponse.json(etas)
  }

  if (type === 'recovery') {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    })

    const disciplineScores = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd')
      const summary = buildDailySummary(
        dateStr,
        habits,
        habitEntries,
        timeEntries,
        timeCategories,
        antiHabitEntries,
        disciplineConfig
      )
      return { date: dateStr, score: summary.discipline_score }
    })

    const recovery = calculateRecoverySpeed(disciplineScores)
    return NextResponse.json(recovery)
  }

  return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
}
