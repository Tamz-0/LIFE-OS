import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkServerSession } from '@/lib/auth/session'
import { buildKPISnapshot, buildDailySummary } from '@/lib/kpi/engine'
import { rankKeystoneHabits, detectFailurePatterns } from '@/lib/analytics/engine'
import { generateStrategicReview } from '@/lib/reports/strategic-review'
import { eachDayOfInterval, parseISO, format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
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
  const type = searchParams.get('type') ?? 'monthly'
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  const start = startDate ?? format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const end = endDate ?? format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [habitsRes, entriesRes, timeEntriesRes, categoriesRes, _antiHabitsRes, antiEntriesRes, goalsRes, settingsRes] =
    await Promise.all([
      supabase.from('habits').select('*'),
      supabase.from('habit_entries').select('*').gte('date', start).lte('date', end),
      supabase.from('time_entries').select('*').gte('date', start).lte('date', end),
      supabase.from('time_categories').select('*'),
      supabase.from('anti_habits').select('*'),
      supabase.from('anti_habit_entries').select('*').gte('date', start).lte('date', end),
      supabase.from('goals').select('*'),
      supabase.from('settings').select('*').single(),
    ])

  const habits = habitsRes.data ?? []
  const habitEntries = entriesRes.data ?? []
  const timeEntries = timeEntriesRes.data ?? []
  const timeCategories = categoriesRes.data ?? []
  const antiHabitEntries = antiEntriesRes.data ?? []
  const goals = goalsRes.data ?? []
  const settings = settingsRes.data

  const disciplineConfig: DisciplineScoreConfig = settings?.discipline_score_weights ?? DEFAULT_DISCIPLINE_CONFIG
  const kpiWeights: KPIWeights = settings?.kpi_weights ?? DEFAULT_KPI_WEIGHTS
  const dateRange = { start, end }

  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
  const dailySummaries = days.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return buildDailySummary(dateStr, habits, habitEntries, timeEntries, timeCategories, antiHabitEntries, disciplineConfig)
  })

  const kpis = buildKPISnapshot(habits, habitEntries, timeEntries, timeCategories, antiHabitEntries, goals, dateRange, disciplineConfig, kpiWeights)
  const keystones = rankKeystoneHabits(habits, habitEntries, dailySummaries)
  const patterns = detectFailurePatterns(dailySummaries, habitEntries, habits)

  // Optionally compute previous period KPIs for trend comparison
  const prevEnd = format(parseISO(start), 'yyyy-MM-dd')
  const prevStart = format(subMonths(parseISO(start), 1), 'yyyy-MM-dd')
  const prevEntriesRes = await supabase.from('habit_entries').select('*').gte('date', prevStart).lte('date', prevEnd)
  const prevTimeRes = await supabase.from('time_entries').select('*').gte('date', prevStart).lte('date', prevEnd)
  const prevAntiRes = await supabase.from('anti_habit_entries').select('*').gte('date', prevStart).lte('date', prevEnd)

  const prevKpis = buildKPISnapshot(
    habits,
    prevEntriesRes.data ?? [],
    prevTimeRes.data ?? [],
    timeCategories,
    prevAntiRes.data ?? [],
    goals,
    { start: prevStart, end: prevEnd },
    disciplineConfig,
    kpiWeights
  )

  const periodLabel = type === 'monthly'
    ? format(parseISO(start), 'MMMM yyyy')
    : `${format(parseISO(start), 'MMM d')} – ${format(parseISO(end), 'MMM d, yyyy')}`

  const review = generateStrategicReview(
    periodLabel,
    kpis,
    habits,
    habitEntries,
    goals,
    dailySummaries,
    keystones,
    patterns,
    dateRange,
    prevKpis
  )

  return NextResponse.json({
    review,
    kpis,
    daily_summaries: dailySummaries,
    keystone_habits: keystones,
    failure_patterns: patterns,
  })
}