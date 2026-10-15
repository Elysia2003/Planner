import Dexie, { type Table } from 'dexie'
import type {
  Goal, Task, Habit, Checkin, HealthRecord, MedicalVisit,
  Transaction, Budget, Account, SavingGoal, Subscription, Insurance,
  Event, Settings, BackupPayload
} from './types'

// 本地优先数据库 — IndexedDB 封装
class PlannerDB extends Dexie {
  goals!: Table<Goal, string>
  tasks!: Table<Task, string>
  habits!: Table<Habit, string>
  checkins!: Table<Checkin, string>
  health!: Table<HealthRecord, string>
  visits!: Table<MedicalVisit, string>
  transactions!: Table<Transaction, string>
  budgets!: Table<Budget, string>
  accounts!: Table<Account, string>
  savingGoals!: Table<SavingGoal, string>
  subscriptions!: Table<Subscription, string>
  insurances!: Table<Insurance, string>
  events!: Table<Event, string>
  settings!: Table<Settings, string>

  constructor() {
    super('life-planner')
    this.version(1).stores({
      goals: 'id, parentId, period, domain, archived, endDate',
      tasks: 'id, status, priority, dueDate, goalId, parentId, deletedAt, completedAt',
      habits: 'id, group, archived',
      checkins: 'id, habitId, date, [habitId+date]',
      health: 'id, type, date, [type+date]',
      visits: 'id, date',
      transactions: 'id, type, category, account, date',
      budgets: 'id, period, month, category',
      accounts: 'id, type',
      savingGoals: 'id',
      subscriptions: 'id, nextChargeDate',
      insurances: 'id, dueDate',
      events: 'id, start, end',
      settings: 'id'
    })
  }
}

export const db = new PlannerDB()

// ---------- 通用工具 ----------
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export function now(): number {
  return Date.now()
}

// ---------- 备份 / 导出 ----------
export async function exportAll(): Promise<BackupPayload> {
  const [goals, tasks, habits, checkins, health, visits, transactions,
    budgets, accounts, savingGoals, subscriptions, insurances, events, settings] =
    await Promise.all([
      db.goals.toArray(), db.tasks.toArray(), db.habits.toArray(),
      db.checkins.toArray(), db.health.toArray(), db.visits.toArray(),
      db.transactions.toArray(), db.budgets.toArray(), db.accounts.toArray(),
      db.savingGoals.toArray(), db.subscriptions.toArray(),
      db.insurances.toArray(), db.events.toArray(), db.settings.get('app')
    ])
  return {
    version: 1,
    exportedAt: Date.now(),
    goals, tasks, habits, checkins, health, visits, transactions,
    budgets, accounts, savingGoals, subscriptions, insurances, events,
    settings: settings || null
  }
}

export async function importAll(payload: BackupPayload): Promise<void> {
  await db.transaction('rw',
    [db.goals, db.tasks, db.habits, db.checkins, db.health, db.visits,
      db.transactions, db.budgets, db.accounts, db.savingGoals,
      db.subscriptions, db.insurances, db.events, db.settings],
    async () => {
      await Promise.all([
        db.goals.clear(), db.tasks.clear(), db.habits.clear(),
        db.checkins.clear(), db.health.clear(), db.visits.clear(),
        db.transactions.clear(), db.budgets.clear(), db.accounts.clear(),
        db.savingGoals.clear(), db.subscriptions.clear(),
        db.insurances.clear(), db.events.clear(), db.settings.clear()
      ])
      await Promise.all([
        db.goals.bulkAdd(payload.goals || []),
        db.tasks.bulkAdd(payload.tasks || []),
        db.habits.bulkAdd(payload.habits || []),
        db.checkins.bulkAdd(payload.checkins || []),
        db.health.bulkAdd(payload.health || []),
        db.visits.bulkAdd(payload.visits || []),
        db.transactions.bulkAdd(payload.transactions || []),
        db.budgets.bulkAdd(payload.budgets || []),
        db.accounts.bulkAdd(payload.accounts || []),
        db.savingGoals.bulkAdd(payload.savingGoals || []),
        db.subscriptions.bulkAdd(payload.subscriptions || []),
        db.insurances.bulkAdd(payload.insurances || []),
        db.events.bulkAdd(payload.events || [])
      ])
      if (payload.settings) await db.settings.put(payload.settings)
    })
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    db.goals.clear(), db.tasks.clear(), db.habits.clear(), db.checkins.clear(),
    db.health.clear(), db.visits.clear(), db.transactions.clear(),
    db.budgets.clear(), db.accounts.clear(), db.savingGoals.clear(),
    db.subscriptions.clear(), db.insurances.clear(), db.events.clear(),
    db.settings.clear()
  ])
}

// ---------- 默认设置 ----------
export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  theme: 'light',
  weekStart: 1,
  currency: '¥',
  language: 'zh',
  homeModules: ['today', 'goals', 'habits', 'finance', 'health'],
  tags: ['工作', '生活', '学习', '健康', '财务', '重要', '紧急'],
  categories: ['餐饮', '交通', '居住', '购物', '娱乐', '医疗', '教育', '人情', '其他'],
  createdAt: Date.now(),
  updatedAt: Date.now()
}

export async function ensureSettings(): Promise<Settings> {
  const s = await db.settings.get('app')
  if (s) return s
  await db.settings.put({ ...DEFAULT_SETTINGS, id: 'app' })
  return (await db.settings.get('app'))!
}
