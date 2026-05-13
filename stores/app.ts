import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { NavTab, DateRange, ThemeAccent } from '@/types'
import { today, getCurrentMonthRange } from '@/lib/utils'

// ============================================================
// App UI Store
// ============================================================

interface AppUIState {
  activeTab: NavTab
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  selectedDate: string
  selectedMonth: { year: number; month: number }
  dateRange: DateRange
  setActiveTab: (tab: NavTab) => void
  setSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedDate: (date: string) => void
  setSelectedMonth: (year: number, month: number) => void
  setDateRange: (range: DateRange) => void
}

export const useAppUI = create<AppUIState>()(
  subscribeWithSelector((set) => {
    const now = new Date()
    return {
      activeTab: 'overview',
      sidebarOpen: true,
      commandPaletteOpen: false,
      selectedDate: today(),
      selectedMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
      dateRange: getCurrentMonthRange(),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedMonth: (year, month) => set({ selectedMonth: { year, month } }),
      setDateRange: (range) => set({ dateRange: range }),
    }
  })
)

// ============================================================
// Theme Store (persisted)
// ============================================================

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  accent: ThemeAccent
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setAccent: (accent: ThemeAccent) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'blue',
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: 'lifeos-theme' }
  )
)

// ============================================================
// Modal / Dialog Store
// ============================================================

type ModalType =
  | 'create-habit'
  | 'edit-habit'
  | 'create-goal'
  | 'edit-goal'
  | 'create-anti-habit'
  | 'edit-anti-habit'
  | 'create-time-category'
  | 'edit-time-category'
  | 'create-milestone'
  | 'edit-milestone'
  | 'confirm-delete'
  | null

interface ModalState {
  activeModal: ModalType
  modalData: Record<string, unknown>
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void
  closeModal: () => void
}

export const useModal = create<ModalState>()((set) => ({
  activeModal: null,
  modalData: {},
  openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),
}))

// ============================================================
// Notification Store
// ============================================================

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (n: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useNotifications = create<NotificationState>()((set) => ({
  notifications: [],
  addNotification: (n) =>
    set((state) => ({
      notifications: [...state.notifications, { ...n, id: crypto.randomUUID() }],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
