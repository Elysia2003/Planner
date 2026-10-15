import { defineStore } from 'pinia'
import { db, ensureSettings } from '@/db'
import type { Settings } from '@/types'

interface SettingsState {
  settings: Settings | null
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({ settings: null }),
  getters: {
    theme: (s) => s.settings?.theme || 'light',
    isDark: (s) => s.settings?.theme === 'dark',
    tags: (s) => s.settings?.tags || [],
    categories: (s) => s.settings?.categories || [],
    currency: (s) => s.settings?.currency || '¥',
    homeModules: (s) => s.settings?.homeModules || []
  },
  actions: {
    async load() {
      this.settings = await ensureSettings()
      this.applyTheme()
    },
    async update(patch: Partial<Settings>) {
      if (!this.settings) return
      Object.assign(this.settings, patch, { updatedAt: Date.now() })
      await db.settings.put(this.settings)
      if (patch.theme) this.applyTheme()
    },
    async setTheme(theme: Settings['theme']) {
      await this.update({ theme })
    },
    applyTheme() {
      const theme = this.settings?.theme || 'light'
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    },
    async addTag(tag: string) {
      if (!this.settings || this.settings.tags.includes(tag)) return
      await this.update({ tags: [...this.settings.tags, tag] })
    },
    async addCategory(cat: string) {
      if (!this.settings || this.settings.categories.includes(cat)) return
      await this.update({ categories: [...this.settings.categories, cat] })
    },
    async reorderHomeModules(modules: string[]) {
      await this.update({ homeModules: modules })
    }
  }
})
