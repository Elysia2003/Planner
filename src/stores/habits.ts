import { defineStore } from 'pinia'
import { db, uid, now } from '@/db'
import { todayStr, calcStreak, colorFor } from '@/utils'
import type { Habit, Checkin } from '@/types'

interface HabitState {
  habits: Habit[]
  checkins: Checkin[]
  loaded: boolean
}

export const useHabitStore = defineStore('habits', {
  state: (): HabitState => ({ habits: [], checkins: [], loaded: false }),
  getters: {
    active: (s) => s.habits.filter(h => !h.archived),
    // 某习惯的打卡日期集合
    datesOf: (s) => (habitId: string) =>
      s.checkins.filter(c => c.habitId === habitId).map(c => c.date)
  },
  actions: {
    async load() {
      this.habits = await db.habits.toArray()
      this.checkins = await db.checkins.toArray()
      this.loaded = true
    },
    async create(data: Partial<Habit>): Promise<Habit> {
      const h: Habit = {
        id: uid(),
        title: data.title || '新习惯',
        freq: data.freq || 'daily',
        weeklyTarget: data.weeklyTarget ?? 7,
        allowMiss: data.allowMiss ?? 0,
        remindTimes: data.remindTimes || [],
        group: data.group || '其他',
        color: data.color || colorFor(this.habits.length),
        archived: false,
        createdAt: now(),
        updatedAt: now()
      }
      await db.habits.add(h)
      this.habits.push(h)
      return h
    },
    async update(id: string, patch: Partial<Habit>) {
      const h = this.habits.find(x => x.id === id)
      if (!h) return
      Object.assign(h, patch, { updatedAt: now() })
      await db.habits.put(h)
    },
    async remove(id: string) {
      await db.habits.delete(id)
      this.habits = this.habits.filter(h => h.id !== id)
      await db.checkins.where('habitId').equals(id).delete()
      this.checkins = this.checkins.filter(c => c.habitId !== id)
    },
    // 打卡 / 取消打卡
    async toggleCheckin(habitId: string, date: string, note = '') {
      const existing = this.checkins.find(c => c.habitId === habitId && c.date === date)
      if (existing) {
        await db.checkins.delete(existing.id)
        this.checkins = this.checkins.filter(c => c.id !== existing.id)
      } else {
        const c: Checkin = { id: uid(), habitId, date, value: 1, note, missedReason: '', createdAt: now() }
        await db.checkins.add(c)
        this.checkins.push(c)
      }
    },
    async recordMiss(habitId: string, date: string, reason: string) {
      const existing = this.checkins.find(c => c.habitId === habitId && c.date === date)
      if (existing) {
        existing.missedReason = reason
        await db.checkins.put(existing)
      } else {
        const c: Checkin = { id: uid(), habitId, date, value: 0, note: '', missedReason: reason, createdAt: now() }
        await db.checkins.add(c)
        this.checkins.push(c)
      }
    },
    streak(habitId: string) {
      return calcStreak(this.datesOf(habitId))
    },
    // 本周完成次数
    weekCount(habitId: string): number {
      let count = 0
      for (const c of this.checkins) {
        if (c.habitId !== habitId || c.value <= 0) continue
        // 本周（周一为起点）
        const d = new Date(c.date)
        const now = new Date()
        const start = new Date(now)
        const day = (now.getDay() + 6) % 7 // 周一=0
        start.setDate(now.getDate() - day)
        if (d >= start) count += c.value
      }
      return count
    },
    // 今天是否已打卡
    checkedToday(habitId: string): boolean {
      return this.checkins.some(c => c.habitId === habitId && c.date === todayStr() && c.value > 0)
    }
  }
})
