import { create } from 'zustand'
import * as api from '@/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  initialized: boolean
  loading: boolean
  init: () => Promise<void>
  login: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  loading: false,

  async init() {
    if (get().initialized) return
    set({ loading: true })
    try {
      const r = await api.me()
      set({ user: r.user })
    } catch {
      try { const r = await api.refresh(); set({ user: r.user }) } catch { set({ user: null }) }
    } finally {
      set({ initialized: true, loading: false })
    }
  },

  async login(login, password) {
    set({ loading: true })
    try {
      const r = await api.login(login, password)
      set({ user: r.user, initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  async logout() {
    try { await api.logout() } finally { set({ user: null, initialized: true }) }
  },
}))
