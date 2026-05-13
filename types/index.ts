// ============================================================
// LifeOS Core Types
// ============================================================

export type UUID = string

export type HabitType = 'binary' | 'numeric'
export type FrequencyType = 'daily' | 'weekdays' | 'weekends' | 'custom'
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned'
export type ThemeAccent = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'

// ============================================================
// Habit Types
// ============================================================

export interface Habit {
  id: UUID
  name: string
  description?: string
  category: string
  type: HabitType
  priority: PriorityLevel
  importance_weight: number // 1-10
  target_value?: number // for numeric habits
  unit?: string // e.g. "hours", "pages", "km"
  frequency: FrequencyType
  custom_days?: number[] // 0=Sun, 1=Mon... for custom frequency
  sort_order: number
  color?: string
  icon?: string
  start_date: string // ISO date
  end_date?: string | null
  is_active: boolean
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export interface HabitEntry {
  id: UUID
  habit_id: UUID
  date: string // ISO date YYYY-MM-DD
  completed: boolean
  value?: number // for numeric habits
  note?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Goal Types
// ============================================================

export interface Goal {
  id: UUID
  title: string
  description?: string
  category: string
  target_value: number
  current_value: number
  unit: string
  deadline?: string | null
  status: GoalStatus
  priority: PriorityLevel
  linked_habit_ids: UUID[]
  linked_time_category_ids: UUID[]
  sort_order: number
  start_date: string
  end_date?: string | null
  is_active: boolean
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: UUID
  goal_id: UUID
  title: string
  target_value: number
  is_completed: boolean
  completed_at?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================
// Time Tracking Types
// ============================================================

export interface TimeCategory {
  id: UUID
  name: string
  color: string
  icon?: string
  is_productive: boolean // used in productivity score
  sort_order: number
  start_date: string
  end_date?: string | null
  is_active: boolean
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: UUID
  category_id: UUID
  date: string // ISO date
  hours: number
  note?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Anti-Habit Types
// ============================================================

export interface AntiHabit {
  id: UUID
  name: string
  description?: string
  category: string
  sort_order: number
  start_date: string
  end_date?: string | null
  is_active: boolean
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export interface AntiHabitEntry {
  id: UUID
  anti_habit_id: UUID
  date: string
  incident_count: number
  note?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Planning Types
// ============================================================

export interface DailyPlan {
  id: UUID
  date: string // ISO date
  objective?: string
  priority_1?: string
  priority_2?: string
  priority_3?: string
  planned_time_entries: PlannedTimeEntry[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface PlannedTimeEntry {
  category_id: UUID
  hours: number
}

// ============================================================
// Settings Types
// ============================================================

export interface Settings {
  id: UUID
  theme: 'light' | 'dark' | 'system'
  accent_color: ThemeAccent
  session_timeout_minutes: number // 0 = never
  kpi_weights: KPIWeights
  discipline_score_weights: DisciplineScoreConfig
  created_at: string
  updated_at: string
}

export interface KPIWeights {
  habit_weight: number
  time_weight: number
  goal_weight: number
  anti_habit_penalty: number
}

export interface DisciplineScoreConfig {
  critical_habit_weight: number
  high_habit_weight: number
  medium_habit_weight: number
  low_habit_weight: number
}

// ============================================================
// Monthly Snapshot Types
// ============================================================

export interface MonthlySnapshot {
  id: UUID
  year: number
  month: number // 1-12
  kpis: KPISnapshot
  habit_data: HabitMonthData[]
  time_data: TimeMonthData[]
  anti_habit_data: AntiHabitMonthData[]
  created_at: string
}

export interface KPISnapshot {
  discipline_score: number
  promise_integrity_score: number
  productivity_score: number
  focus_score: number
  consistency_score: number
  self_control_score: number
  goal_alignment_score: number
  momentum_score: number
  completion_percentage: number
  perfect_days: number
  best_streak: number
  total_tracked_days: number
}

export interface HabitMonthData {
  habit_id: UUID
  habit_name: string
  completions: number
  total_applicable: number
  completion_rate: number
}

export interface TimeMonthData {
  category_id: UUID
  category_name: string
  total_hours: number
}

export interface AntiHabitMonthData {
  anti_habit_id: UUID
  anti_habit_name: string
  total_incidents: number
  days_with_incidents: number
}

// ============================================================
// Analytics Types
// ============================================================

export interface DailySummary {
  date: string
  habits_completed: number
  habits_total: number
  completion_rate: number
  total_productive_hours: number
  total_hours: number
  anti_habit_incidents: number
  discipline_score: number
  is_perfect_day: boolean
}

export interface WeeklySummary {
  week_start: string
  week_end: string
  avg_completion_rate: number
  total_productive_hours: number
  total_hours: number
  perfect_days: number
  anti_habit_incidents: number
  avg_discipline_score: number
  best_day: string
  worst_day: string
}

export interface HabitCorrelation {
  habit_id: UUID
  habit_name: string
  correlation_with_discipline: number
  correlation_with_productivity: number
  impact_score: number // weighted composite
  rank: number
}

export interface FailurePattern {
  pattern_type: 'day_of_week' | 'low_sleep' | 'high_social_media' | 'multi_miss'
  description: string
  occurrence_rate: number // percentage
  affected_kpi: string
  contributing_factors: string[]
}

export interface RootCauseAnalysis {
  period_start: string
  period_end: string
  primary_causes: CauseItem[]
  secondary_causes: CauseItem[]
  recommendations: string[]
}

export interface CauseItem {
  factor: string
  direction: 'increase' | 'decrease'
  magnitude: number // percentage change
  impact_on_kpi: string
  confidence: number // 0-1
}

export interface OpportunityCost {
  category: string
  missed_sessions: number
  avg_hours_per_session: number
  total_lost_hours: number
  potential_progress?: string
}

export interface GoalETA {
  goal_id: UUID
  goal_title: string
  remaining_value: number
  avg_completion_rate: number // per day
  eta_days: number
  eta_date: string
  confidence: 'high' | 'medium' | 'low'
  on_track: boolean
}

export interface RecoveryMetric {
  avg_recovery_days: number
  fastest_recovery: number
  slowest_recovery: number
  recovery_events: RecoveryEvent[]
}

export interface RecoveryEvent {
  drop_date: string
  baseline_score: number
  low_score: number
  recovery_date: string
  days_to_recover: number
}

// ============================================================
// Report Types
// ============================================================

export interface StrategicReview {
  period: string
  generated_at: string
  executive_summary: string
  strengths: ReviewItem[]
  weaknesses: ReviewItem[]
  bottlenecks: ReviewItem[]
  highest_leverage: ReviewItem[]
  next_period_priorities: string[]
  kpi_snapshot: KPISnapshot
}

export interface ReviewItem {
  title: string
  description: string
  metric?: string
  value?: number | string
}

// ============================================================
// UI State Types
// ============================================================

export type NavTab =
  | 'overview'
  | 'habits'
  | 'planning'
  | 'goals'
  | 'analytics'
  | 'reports'
  | 'history'
  | 'settings'

export interface DateRange {
  start: string
  end: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
}
