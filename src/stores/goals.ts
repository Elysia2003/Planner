import { defineStore } from 'pinia'
import { db, ensureSettings, uid, now } from '@/db'
import type { Goal, Milestone } from '@/types'

interface GoalState {
  goals: Goal[]
  loaded: boolean
}

export const useGoalStore = defineStore('goals', {
  state: (): GoalState => ({ goals: [], loaded: false }),
  getters: {
    // 顶层目标（无父级）
    topGoals: (s) => s.goals.filter(g => !g.parentId && !g.archived),
    // 某目标的子目标
    childrenOf: (s) => (id: string) => s.goals.filter(g => g.parentId === id && !g.archived),
    // 归档目标
    archived: (s) => s.goals.filter(g => g.archived),
    // 活跃目标
    active: (s) => s.goals.filter(g => !g.archived)
  },
  actions: {
    async load() {
      this.goals = await db.goals.toArray()
      this.loaded = true
    },
    async create(data: Partial<Goal>): Promise<Goal> {
      const g: Goal = {
        id: uid(),
        title: data.title || '新目标',
        desc: data.desc || '',
        period: data.period || 'year',
        startDate: data.startDate || new Date().toISOString().slice(0, 10),
        endDate: data.endDate || new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10),
        progress: data.progress ?? 0,
        parentId: data.parentId || null,
        milestones: data.milestones || [],
        domain: data.domain || '成长',
        vision: data.vision || '',
        archived: false,
        abandonedReason: '',
        createdAt: now(),
        updatedAt: now()
      }
      await db.goals.add(g)
      this.goals.push(g)
      return g
    },
    async update(id: string, patch: Partial<Goal>) {
      const g = this.goals.find(x => x.id === id)
      if (!g) return
      Object.assign(g, patch, { updatedAt: now() })
      await db.goals.put(g)
    },
    async remove(id: string) {
      await db.goals.delete(id)
      this.goals = this.goals.filter(g => g.id !== id)
    },
    async setProgress(id: string, progress: number) {
      const g = this.goals.find(x => x.id === id)
      if (!g) return
      g.progress = Math.max(0, Math.min(100, progress))
      g.updatedAt = now()
      await db.goals.put(g)
    },
    async addMilestone(goalId: string, title: string, date: string) {
      const g = this.goals.find(x => x.id === goalId)
      if (!g) return
      const m: Milestone = { id: uid(), title, date, done: false }
      g.milestones.push(m)
      g.updatedAt = now()
      await db.goals.put(g)
    },
    async toggleMilestone(goalId: string, milestoneId: string) {
      const g = this.goals.find(x => x.id === goalId)
      if (!g) return
      const m = g.milestones.find(x => x.id === milestoneId)
      if (m) { m.done = !m.done; g.updatedAt = now(); await db.goals.put(g) }
    },
    async archive(id: string, reason = '') {
      await this.update(id, { archived: true, abandonedReason: reason })
    },
    async unarchive(id: string) {
      await this.update(id, { archived: false, abandonedReason: '' })
    }
  }
})

export { ensureSettings }
