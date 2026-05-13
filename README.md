# LifeOS Mark I

> **One click records reality. Everything else is calculated automatically.**

A production-grade, privacy-focused personal performance operating system built with Next.js 15, Supabase, and a fully deterministic analytics engine. Zero AI. Zero machine learning. Pure formula-based intelligence.

---

## What Is LifeOS?

LifeOS is a personal command center that combines:

- **Habit Tracker** — Monthly grid with one-click entry, priority weighting, binary/numeric habits
- **Daily Planning** — Top 3 priorities, time allocation by category
- **Goal Management** — Progress bars, milestone tracking, ETA calculator
- **Anti-Habit Tracking** — Incident counting, trend analysis
- **KPI Dashboard** — 8 computed scores: Discipline, Promise Integrity, Productivity, Focus, Consistency, Self-Control, Goal Alignment, Momentum
- **Deterministic Analytics Engine** — Keystone habit ranking, failure pattern detection, root cause attribution, opportunity cost, recovery speed metric
- **Strategic Review Reports** — Template-based monthly/weekly executive summaries
- **Historical Archive** — 12-month comparison table with trend indicators
- **Cross-Device Sync** — Supabase Realtime, offline caching, PWA installable

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom design tokens |
| UI Components | Radix UI primitives |
| Charts | Recharts |
| Animation | Framer Motion |
| State (UI) | Zustand |
| State (Server) | TanStack Query |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL) |
| Auth | Shared password gate, HTTP-only session cookie |
| Testing (Unit) | Vitest |
| Testing (E2E) | Playwright |
| Deployment | Vercel |

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd lifeos
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:

```bash
# Copy and paste the contents of:
supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, triggers, and seeds default data.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
APP_PASSWORD=your-chosen-password
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get your Supabase URL and anon key from **Project Settings → API**.

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
# Enter your APP_PASSWORD to log in
```

---

## Deployment (Vercel)

### One-click deploy

```bash
npm install -g vercel
vercel
```

### Environment variables on Vercel

In your Vercel project dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `APP_PASSWORD` | Your chosen secret password |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

---

## Running Tests

### Unit tests (Vitest)

```bash
npm test
# or with watch mode:
npm run test:watch
```

Covers:
- KPI calculation engine (discipline score, completion rate, streaks, momentum, productivity, focus, self-control)
- Analytics engine (goal ETA, recovery speed, failure patterns, opportunity cost)
- Strategic review report generation (template output validation)

### End-to-end tests (Playwright)

```bash
# Requires the app running at localhost:3000
npm run test:e2e
```

Covers:
- Authentication flow (correct/incorrect password, redirect)
- Habit creation, toggling
- Daily planning save
- Command palette navigation
- All major page renders

---

## Project Structure

```
lifeos/
├── app/
│   ├── (app)/                    # Protected app shell
│   │   ├── layout.tsx            # Sidebar + topbar layout
│   │   ├── page.tsx              # Overview / dashboard
│   │   ├── habits/page.tsx       # Monthly habit grid
│   │   ├── planning/page.tsx     # Daily planning
│   │   ├── goals/page.tsx        # Goal management
│   │   ├── analytics/page.tsx    # Analytics engine UI
│   │   ├── reports/page.tsx      # Strategic review reports
│   │   ├── history/page.tsx      # Historical archive
│   │   └── settings/page.tsx     # App settings
│   ├── api/                      # Next.js API routes
│   │   ├── auth/login/           # Password authentication
│   │   ├── auth/logout/          # Session logout
│   │   ├── habits/               # Habits CRUD + entries
│   │   ├── goals/                # Goals CRUD
│   │   ├── time-entries/         # Time tracking
│   │   ├── anti-habits/          # Anti-habits + entries
│   │   ├── plans/                # Daily plans
│   │   ├── analytics/            # KPI + analytics computation
│   │   ├── reports/              # Report generation
│   │   └── settings/             # Settings CRUD
│   ├── login/page.tsx            # Auth gate
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Design tokens + global styles
├── components/
│   ├── layout/                   # Sidebar, topbar, mobile nav, command palette
│   ├── habits/                   # Monthly grid, today habits, heatmap, modals
│   ├── goals/                    # Goal progress, cards
│   ├── analytics/                # Discipline chart, radar chart
│   └── ui/                       # KPI cards, primitives
├── lib/
│   ├── kpi/engine.ts             # Pure KPI calculation functions
│   ├── analytics/engine.ts       # Deterministic analytics engine
│   ├── reports/strategic-review.ts # Template-based report generator
│   ├── auth/session.ts           # Session management
│   ├── supabase/                 # Client + server Supabase instances
│   └── utils.ts                  # Utility functions
├── stores/
│   └── app.ts                    # Zustand stores (UI, theme, modals)
├── types/
│   └── index.ts                  # All TypeScript types
├── supabase/
│   └── migrations/               # SQL migration scripts
└── tests/
    ├── unit/                     # Vitest unit tests
    └── e2e/                      # Playwright E2E tests
```

---

## Core Principles

### 1. No AI, No Excuses

Every insight, summary, and score in LifeOS is computed using:
- **Pearson correlation coefficients** (keystone habit ranking)
- **Statistical threshold analysis** (failure pattern detection)
- **Weighted arithmetic formulas** (discipline score)
- **Linear ETA projection** (goal completion estimates)
- **Template string interpolation** (strategic review language)

There is no OpenAI, no Claude, no Anthropic, no LLM of any kind.

### 2. KPI Formulas

**Discipline Score** = Weighted sum of habit completions, where weight = `priority_multiplier × importance_weight`

**Productivity Score** = `(productive_hours / total_hours) × 100`

**Focus Score** = `(deep_work_hours / target_4h) × 100`

**Self-Control Score** = `max(0, 100 - incidents × 15)`

**Consistency Score** = Rolling 7-day average discipline score

**Momentum Score** = `50 + ((recent_7d_avg - prev_7d_avg) / prev_avg) × 50`

**Promise Integrity** = `(completed_critical_high / applicable_critical_high) × 100`

**Goal Alignment** = Average progress across all active goals

### 3. Privacy First

- All data lives in **your** Supabase instance
- No third-party analytics
- No telemetry
- HTTP-only session cookie (not accessible to JavaScript)
- Password never leaves the server

---

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the full normalized schema including:

- `habits` + `habit_entries`
- `goals` + `milestones`
- `time_categories` + `time_entries`
- `anti_habits` + `anti_habit_entries`
- `daily_plans`
- `monthly_snapshots`
- `settings`

All entities include `start_date`, `end_date`, `is_active`, and `archived_at` for time-aware analytics. Archiving never deletes historical entries.

---

## Adding Custom Time Categories

By default LifeOS seeds: Study, Coding, Deep Work, Reading, Exercise, Writing, Entertainment, Social Media, Sleep, Learning.

Add your own in **Settings → (coming: Time Categories)** or directly via Supabase:

```sql
INSERT INTO time_categories (name, color, is_productive, sort_order)
VALUES ('Language Learning', '#8b5cf6', true, 11);
```

---

## PWA Installation

LifeOS is installable as a PWA:

1. Open in Chrome/Safari on mobile
2. Tap **Share → Add to Home Screen**
3. On desktop: address bar install icon

---

## License

MIT — use it, fork it, build on it.
