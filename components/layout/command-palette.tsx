'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppUI } from '@/stores/app'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Calendar, Target, BarChart3,
  FileText, Archive, Settings, X, Search,
} from 'lucide-react'
import type { NavTab } from '@/types'

const COMMANDS = [
  { id: 'overview', label: 'Go to Overview', icon: LayoutDashboard, href: '/', tab: 'overview' as NavTab },
  { id: 'habits', label: 'Go to Habit Tracker', icon: CheckSquare, href: '/habits', tab: 'habits' as NavTab },
  { id: 'planning', label: 'Go to Daily Planning', icon: Calendar, href: '/planning', tab: 'planning' as NavTab },
  { id: 'goals', label: 'Go to Goals', icon: Target, href: '/goals', tab: 'goals' as NavTab },
  { id: 'analytics', label: 'Go to Analytics', icon: BarChart3, href: '/analytics', tab: 'analytics' as NavTab },
  { id: 'reports', label: 'Go to Reports', icon: FileText, href: '/reports', tab: 'reports' as NavTab },
  { id: 'history', label: 'Go to History', icon: Archive, href: '/history', tab: 'history' as NavTab },
  { id: 'settings', label: 'Go to Settings', icon: Settings, href: '/settings', tab: 'settings' as NavTab },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveTab } = useAppUI()
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen])

  function handleSelect(cmd: typeof COMMANDS[0]) {
    setActiveTab(cmd.tab)
    router.push(cmd.href)
    setCommandPaletteOpen(false)
  }

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <Command>
              <div className="flex items-center border-b border-border px-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Command.Input
                  placeholder="Search commands..."
                  className="command-input flex-1"
                  autoFocus
                />
                <button
                  onClick={() => setCommandPaletteOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {COMMANDS.map((cmd) => {
                    const Icon = cmd.icon
                    return (
                      <Command.Item
                        key={cmd.id}
                        onSelect={() => handleSelect(cmd)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {cmd.label}
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              </Command.List>

              <div className="border-t border-border px-3 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span><kbd className="bg-muted px-1.5 rounded font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="bg-muted px-1.5 rounded font-mono">↵</kbd> select</span>
                <span><kbd className="bg-muted px-1.5 rounded font-mono">esc</kbd> close</span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
