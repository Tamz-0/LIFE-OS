'use client'

import { useAppUI } from '@/stores/app'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CheckSquare, Calendar, Target, BarChart3,
  FileText, Archive, Settings, ChevronLeft, ChevronRight,
  LogOut, Zap, Command,
} from 'lucide-react'
import type { NavTab } from '@/types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; href: string }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/' },
  { id: 'habits', label: 'Habits', icon: CheckSquare, href: '/habits' },
  { id: 'planning', label: 'Planning', icon: Calendar, href: '/planning' },
  { id: 'goals', label: 'Goals', icon: Target, href: '/goals' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  { id: 'history', label: 'History', icon: Archive, href: '/history' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
]

export function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen, setCommandPaletteOpen } = useAppUI()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 220 : 60 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col h-full border-r border-border bg-surface overflow-hidden shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="ml-2.5 text-sm font-semibold tracking-tight whitespace-nowrap"
              >
                LifeOS
              </motion.span>
            )}
          </AnimatePresence>
          <div className="flex-1" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Command palette shortcut */}
        <div className="px-2 py-2 border-b border-border">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={cn(
              'w-full flex items-center gap-2 h-8 px-2 rounded-md text-xs text-muted-foreground',
              'hover:bg-accent hover:text-foreground transition-colors',
              !sidebarOpen && 'justify-center'
            )}
          >
            <Command className="w-3.5 h-3.5 shrink-0" />
            {sidebarOpen && (
              <span className="flex-1 text-left">Search...</span>
            )}
            {sidebarOpen && (
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'nav-item',
                  isActive && 'nav-item-active',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 py-3 border-t border-border">
          <button
            onClick={handleLogout}
            className={cn(
              'nav-item w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
              !sidebarOpen && 'justify-center px-2'
            )}
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>
    </>
  )
}
