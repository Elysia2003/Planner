import { defineStore } from 'pinia'
import { db, uid, now, toPlain } from '@/db'
import type { HealthRecord, MedicalVisit } from '@/types'

interface HealthState {
  records: HealthRecord[]
  visits: MedicalVisit[]
  loaded: boolean
}

export const useHealthStore = defineStore('health', {
  state: (): HealthState => ({ records: [], visits: [], loaded: false }),
  getters: {
    // 最新一条某类型记录
    latest: (s) => (type: string) =>
      s.records.filter(r => r.type === type).sort((a, b) => b.date.localeCompare(a.date))[0],
    // 体重序列（升序）
    weightSeries: (s) =>
      s.records.filter(r => r.type === 'weight').sort((a, b) => a.date.localeCompare(b.date)),
    sleepSeries: (s) =>
      s.records.filter(r => r.type === 'sleep').sort((a, b) => a.date.localeCompare(b.date)),
    // BMI = 体重(kg) / 身高(m)^2，用最新的体重和身高
    bmi: (s) => {
      const weight = s.records.filter(r => r.type === 'weight').sort((a, b) => b.date.localeCompare(a.date)).pop()
      const height = s.records.filter(r => r.type === 'height').sort((a, b) => b.date.localeCompare(a.date)).pop()
      if (!weight || !height || height.value <= 0) return null
      const h = height.value / 100
      return weight.value / (h * h)
    }
  },
  actions: {
    async load() {
      this.records = await db.health.toArray()
      this.visits = await db.visits.toArray()
      this.loaded = true
    },
    // 记录一次健康数据（同类型同日覆盖）
    async record(type: HealthRecord['type'], value: number, unit: string, date: string, note = '') {
      const existing = this.records.find(r => r.type === type && r.date === date)
      if (existing) {
        existing.value = value
        existing.unit = unit
        existing.note = note
        await db.health.put(toPlain(existing))
      } else {
        const r: HealthRecord = { id: uid(), type, value, unit, date, note, createdAt: now() }
        await db.health.add(toPlain(r))
        this.records.push(r)
      }
    },
    // 喝水 +1（当日累计）
    async addWater(date: string, amount = 1) {
      const existing = this.records.find(r => r.type === 'water' && r.date === date)
      if (existing) {
        existing.value += amount
        await db.health.put(toPlain(existing))
        return existing.value
      } else {
        const r: HealthRecord = { id: uid(), type: 'water', value: amount, unit: '杯', date, note: '', createdAt: now() }
        await db.health.add(toPlain(r))
        this.records.push(r)
        return amount
      }
    },
    // 手动设置当日喝水量（用于纠错）
    async setWater(date: string, value: number) {
      const v = Math.max(0, Math.round(value))
      const existing = this.records.find(r => r.type === 'water' && r.date === date)
      if (existing) {
        existing.value = v
        await db.health.put(toPlain(existing))
      } else {
        const r: HealthRecord = { id: uid(), type: 'water', value: v, unit: '杯', date, note: '', createdAt: now() }
        await db.health.add(toPlain(r))
        this.records.push(r)
      }
      return v
    },
    // 当日喝水总量
    todayWater(date: string): number {
      return this.records.find(r => r.type === 'water' && r.date === date)?.value || 0
    },
    async removeRecord(id: string) {
      await db.health.delete(id)
      this.records = this.records.filter(r => r.id !== id)
    },
    async addVisit(data: Partial<MedicalVisit>) {
      const v: MedicalVisit = {
        id: uid(), date: data.date || '', hospital: data.hospital || '',
        doctor: data.doctor || '', diagnosis: data.diagnosis || '',
        prescription: data.prescription || '', note: data.note || '', createdAt: now()
      }
      await db.visits.add(toPlain(v))
      this.visits.push(v)
    },
    async removeVisit(id: string) {
      await db.visits.delete(id)
      this.visits = this.visits.filter(v => v.id !== id)
    }
  }
})
