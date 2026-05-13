'use client'

import { useAppUI } from '@/stores/app'
import { NAV_LABELS } from '@/components/layout/mobile-nav'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { format, parseISO } from 'date-fns'

export function TopBar() {
  const { activeTab } = useAppUI()
  const { theme, setTheme } = useTheme()

  const title = NAV_LABELS[activeTab] ?? 'LifeOS'

  function cycleTheme() {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className="h-14 border-b border-border flex items-center px-4 sm:px-6 gap-4 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold truncate">{title}</h1>
        <p className="text-xs text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      <button
        onClick={cycleTheme}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Toggle theme"
      >
        <ThemeIcon className="w-4 h-4" />
      </button>
    </header>
  )
}
