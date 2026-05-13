import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { CommandPalette } from '@/components/layout/command-palette'
import { TopBar } from '@/components/layout/topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Command palette */}
      <CommandPalette />
    </div>
  )
}
