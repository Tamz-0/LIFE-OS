'use client'

import { useAppUI } from '@/stores/app'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CheckSquare, Calendar, Target,
  BarChart3, FileText, Archive, Settings,
} from 'lucide-react'
import type { NavTab } from '@/types'
import Link from 'next/link'

export const NAV_LABELS: Record<NavTab, string> = {
  overview: 'Overview',
  habits: 'Habit Tracker',
  planning: 'Daily Planning',
  goals: 'Goals',
  analytics: 'Analytics',
  reports: 'Reports',
  history: 'History',
  settings: 'Settings',
}

const MOBILE_NAV = [
  { id: 'overview' as NavTab, icon: LayoutDashboard, href: '/' },
  { id: 'habits' as NavTab, icon: CheckSquare, href: '/habits' },
  { id: 'planning' as NavTab, icon: Calendar, href: '/planning' },
  { id: 'goals' as NavTab, icon: Target, href: '/goals' },
  { id: 'analytics' as NavTab, icon: BarChart3, href: '/analytics' },
]

export function MobileNav() {
  const { activeTab, setActiveTab } = useAppUI()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-center justify-around h-14">
        {MOBILE_NAV.map(({ id, icon: Icon, href }) => (
          <Link
            key={id}
            href={href}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-medium transition-colors',
              activeTab === id
                ? 'text-brand'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{NAV_LABELS[id]}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
