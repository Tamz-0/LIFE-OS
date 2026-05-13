import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatScore(score: number): string {
  return `${Math.round(score)}`
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-500'
  if (score >= 75) return 'text-blue-500'
  if (score >= 60) return 'text-amber-500'
  if (score >= 45) return 'text-orange-500'
  return 'text-red-500'
}

export function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (score >= 75) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  if (score >= 60) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  if (score >= 45) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
  return 'bg-red-500/10 text-red-600 dark:text-red-400'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 60) return 'Moderate'
  if (score >= 45) return 'Weak'
  return 'Critical'
}

export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1)
  const end = endOfMonth(start)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getDaysArray(year: number, month: number): number[] {
  return Array.from({ length: getDaysInMonth(new Date(year, month - 1)) }, (_, i) => i + 1)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function generateId(): string {
  return crypto.randomUUID()
}

export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-blue-500 bg-blue-500/10',
  low: 'text-slate-500 bg-slate-500/10',
}

export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`
}
