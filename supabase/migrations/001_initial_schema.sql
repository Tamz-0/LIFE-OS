-- ============================================================
-- LifeOS Database Migrations
-- Run in order in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Settings table (single row per installation)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  accent_color TEXT NOT NULL DEFAULT 'blue',
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  kpi_weights JSONB NOT NULL DEFAULT '{"habit_weight": 0.4, "time_weight": 0.3, "goal_weight": 0.2, "anti_habit_penalty": 0.1}',
  discipline_score_weights JSONB NOT NULL DEFAULT '{"critical_habit_weight": 3, "high_habit_weight": 2, "medium_habit_weight": 1.5, "low_habit_weight": 1}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Habits table
-- ============================================================
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  type TEXT NOT NULL DEFAULT 'binary' CHECK (type IN ('binary', 'numeric')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  importance_weight NUMERIC(4,1) NOT NULL DEFAULT 5.0 CHECK (importance_weight BETWEEN 1 AND 10),
  target_value NUMERIC(10,2),
  unit TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom')),
  custom_days INTEGER[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_habits_is_active ON habits(is_active);
CREATE INDEX idx_habits_start_date ON habits(start_date);

-- ============================================================
-- Habit entries table
-- ============================================================
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  value NUMERIC(10,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_entries_habit_id ON habit_entries(habit_id);
CREATE INDEX idx_habit_entries_date ON habit_entries(date);
CREATE INDEX idx_habit_entries_habit_date ON habit_entries(habit_id, date);

-- ============================================================
-- Goals table
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  target_value NUMERIC(12,2) NOT NULL DEFAULT 100,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  linked_habit_ids UUID[] DEFAULT '{}',
  linked_time_category_ids UUID[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_is_active ON goals(is_active);

-- ============================================================
-- Milestones table
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC(12,2) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_goal_id ON milestones(goal_id);

-- ============================================================
-- Time categories table
-- ============================================================
CREATE TABLE IF NOT EXISTS time_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  is_productive BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Time entries table
-- ============================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES time_categories(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, date)
);

CREATE INDEX idx_time_entries_category_id ON time_entries(category_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);

-- ============================================================
-- Anti-habits table
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Anti-habit entries table
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_habit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anti_habit_id UUID NOT NULL REFERENCES anti_habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  incident_count INTEGER NOT NULL DEFAULT 0 CHECK (incident_count >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(anti_habit_id, date)
);

CREATE INDEX idx_anti_habit_entries_anti_habit_id ON anti_habit_entries(anti_habit_id);
CREATE INDEX idx_anti_habit_entries_date ON anti_habit_entries(date);

-- ============================================================
-- Daily plans table
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  objective TEXT,
  priority_1 TEXT,
  priority_2 TEXT,
  priority_3 TEXT,
  planned_time_entries JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_plans_date ON daily_plans(date);

-- ============================================================
-- Monthly snapshots table
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  kpis JSONB NOT NULL DEFAULT '{}',
  habit_data JSONB NOT NULL DEFAULT '[]',
  time_data JSONB NOT NULL DEFAULT '[]',
  anti_habit_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, month)
);

CREATE INDEX idx_monthly_snapshots_year_month ON monthly_snapshots(year, month);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['settings','habits','habit_entries','goals','milestones','time_categories','time_entries','anti_habits','anti_habit_entries','daily_plans']
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================
-- Enable Row Level Security (optional - single user app)
-- Disable for simplicity, enable with auth if needed
-- ============================================================
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Seed Data
-- ============================================================

-- Default settings
INSERT INTO settings (theme, accent_color, session_timeout_minutes)
VALUES ('system', 'blue', 30)
ON CONFLICT DO NOTHING;

-- Default time categories
INSERT INTO time_categories (name, color, icon, is_productive, sort_order) VALUES
  ('Study', '#6366f1', '📚', true, 1),
  ('Coding', '#8b5cf6', '💻', true, 2),
  ('Deep Work', '#0ea5e9', '🎯', true, 3),
  ('Reading', '#10b981', '📖', true, 4),
  ('Exercise', '#f59e0b', '🏋️', true, 5),
  ('Writing', '#ec4899', '✍️', true, 6),
  ('Entertainment', '#f97316', '🎮', false, 7),
  ('Social Media', '#ef4444', '📱', false, 8),
  ('Sleep', '#64748b', '😴', false, 9),
  ('Learning', '#06b6d4', '🧠', true, 10)
ON CONFLICT DO NOTHING;

-- Sample habits
INSERT INTO habits (name, category, type, priority, importance_weight, sort_order) VALUES
  ('Morning Routine', 'Health', 'binary', 'high', 8, 1),
  ('Exercise', 'Health', 'binary', 'critical', 9, 2),
  ('Deep Work Block', 'Productivity', 'numeric', 'critical', 10, 3),
  ('Reading', 'Learning', 'numeric', 'high', 7, 4),
  ('Meditation', 'Health', 'binary', 'medium', 6, 5),
  ('No Social Media Before 10am', 'Focus', 'binary', 'high', 8, 6),
  ('Sleep 7+ Hours', 'Health', 'numeric', 'critical', 9, 7),
  ('Journaling', 'Reflection', 'binary', 'medium', 5, 8)
ON CONFLICT DO NOTHING;

-- Sample anti-habits
INSERT INTO anti_habits (name, category, sort_order) VALUES
  ('Social Media Doom Scrolling', 'Focus', 1),
  ('Junk Food', 'Health', 2),
  ('Procrastination', 'Productivity', 3),
  ('Skipped Workout', 'Health', 4)
ON CONFLICT DO NOTHING;

-- Sample goal
INSERT INTO goals (title, category, target_value, current_value, unit, priority) VALUES
  ('Read 24 Books This Year', 'Learning', 24, 0, 'books', 'high'),
  ('Complete 100 LeetCode Problems', 'Skills', 100, 0, 'problems', 'critical'),
  ('Build 3 Side Projects', 'Career', 3, 0, 'projects', 'high')
ON CONFLICT DO NOTHING;
