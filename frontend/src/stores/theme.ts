import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'b2b-theme'

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'light' as ThemeMode,
    initialized: false,
  }),
  getters: {
    isDark: (state) => state.theme === 'dark',
  },
  actions: {
    initializeTheme() {
      if (this.initialized) return

      const saved = localStorage.getItem(STORAGE_KEY)
      this.theme = saved === 'dark' ? 'dark' : 'light'
      applyTheme(this.theme)
      this.initialized = true
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, this.theme)
      applyTheme(this.theme)
    },
  },
})
