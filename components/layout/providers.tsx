'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useThemeStore } from '@/stores/app'
import { useEffect, useState } from 'react'

function ThemeSync() {
  const accent = useThemeStore((s) => s.accent)

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])

  return null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        {mounted && <ThemeSync />}
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                'group bg-card border border-border text-foreground shadow-lg rounded-lg text-sm',
              title: 'font-medium',
              description: 'text-muted-foreground',
              actionButton: 'bg-brand text-brand-foreground',
              cancelButton: 'bg-muted text-muted-foreground',
              error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
              success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
