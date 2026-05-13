'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        toast.success('Welcome to LifeOS')
        router.push('/')
        router.refresh()
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] opacity-30" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/25">
            <span className="text-white font-bold text-xl tracking-tighter">OS</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">LifeOS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personal Performance Operating System
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Private access</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-10 px-3 pr-10 text-sm bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring transition-shadow placeholder:text-muted-foreground"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full h-10 bg-brand text-brand-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Enter LifeOS'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Privacy first. All data stored in your Supabase.
        </p>
      </motion.div>
    </div>
  )
}
