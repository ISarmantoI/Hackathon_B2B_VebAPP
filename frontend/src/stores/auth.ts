import { defineStore } from 'pinia'

import * as authApi from '@/api/auth'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    initialized: false,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
    isAdmin: (state) => state.user?.role.role_name === 'Admin',
  },
  actions: {
    async initializeSession() {
      if (this.initialized) {
        return
      }

      this.loading = true
      try {
        const response = await authApi.me()
        this.user = response.user
      } catch {
        try {
          const refreshed = await authApi.refresh()
          this.user = refreshed.user
        } catch {
          this.user = null
        }
      } finally {
        this.initialized = true
        this.loading = false
      }
    },
    async login(login: string, password: string) {
      this.loading = true
      try {
        const response = await authApi.login({ login, password })
        this.user = response.user
        this.initialized = true
      } finally {
        this.loading = false
      }
    },
    async logout() {
      try {
        await authApi.logout()
      } finally {
        this.user = null
        this.initialized = true
      }
    },
  },
})
