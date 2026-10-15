import { defineStore } from 'pinia'
import { db, uid, now } from '@/db'
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
      s.records.filter(r => r.type === 'sleep').sort((a, b) => a.date.localeCompare(b.date))
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
        await db.health.put(existing)
      } else {
        const r: HealthRecord = { id: uid(), type, value, unit, date, note, createdAt: now() }
        await db.health.add(r)
        this.records.push(r)
      }
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
      await db.visits.add(v)
      this.visits.push(v)
    }
  }
})
