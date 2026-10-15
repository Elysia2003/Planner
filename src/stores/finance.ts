import { defineStore } from 'pinia'
import { db, uid, now, toPlain } from '@/db'
import { currentMonthStr } from '@/utils'
import type { Transaction, Budget, Account, SavingGoal, Subscription, Insurance } from '@/types'

interface FinanceState {
  transactions: Transaction[]
  budgets: Budget[]
  accounts: Account[]
  savingGoals: SavingGoal[]
  subscriptions: Subscription[]
  insurances: Insurance[]
  loaded: boolean
}

export const useFinanceStore = defineStore('finance', {
  state: (): FinanceState => ({
    transactions: [], budgets: [], accounts: [], savingGoals: [], subscriptions: [], insurances: [], loaded: false
  }),
  getters: {
    // 本月支出（分）
    monthExpense: (s) => {
      const m = currentMonthStr()
      return s.transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(m))
        .reduce((sum, t) => sum + t.amount, 0)
    },
    // 本月收入（分）
    monthIncome: (s) => {
      const m = currentMonthStr()
      return s.transactions
        .filter(t => t.type === 'income' && t.date.startsWith(m))
        .reduce((sum, t) => sum + t.amount, 0)
    },
    // 分类支出汇总（本月）
    categoryBreakdown: (s) => {
      const m = currentMonthStr()
      const map = new Map<string, number>()
      s.transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(m))
        .forEach(t => map.set(t.category, (map.get(t.category) || 0) + t.amount))
      return Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
    },
    // 总预算（本月）
    monthBudget: (s) => {
      const m = currentMonthStr()
      const b = s.budgets.find(x => x.month === m && x.period === 'month' && !x.category)
      return b?.amount || 0
    },
    // 储蓄总额（所有储蓄目标已存金额）
    totalSaved: (s) => s.savingGoals.reduce((sum, g) => sum + g.savedAmount, 0),
    // 流动资金 = 未计入储蓄的收入 - 全部支出
    liquidAmount: (s) => {
      const income = s.transactions
        .filter(t => t.type === 'income' && !t.savingGoalId)
        .reduce((sum, t) => sum + t.amount, 0)
      const expense = s.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      return income - expense
    },
    // 即将到期的订阅（未来30天）
    upcomingSubscriptions: (s) => {
      const now = new Date()
      const limit = new Date(now.getTime() + 30 * 86400000)
      return s.subscriptions
        .filter(x => x.nextChargeDate <= limit.toISOString().slice(0, 10))
        .sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate))
    }
  },
  actions: {
    async load() {
      this.transactions = await db.transactions.toArray()
      this.budgets = await db.budgets.toArray()
      this.accounts = await db.accounts.toArray()
      this.savingGoals = await db.savingGoals.toArray()
      this.subscriptions = await db.subscriptions.toArray()
      this.insurances = await db.insurances.toArray()
      this.loaded = true
    },
    async addTransaction(data: Partial<Transaction>): Promise<Transaction> {
      const t: Transaction = {
        id: uid(), type: data.type || 'expense', amount: data.amount ?? 0,
        category: data.category || '其他', account: data.account || '现金',
        note: data.note || '', date: data.date || new Date().toISOString().slice(0, 10),
        savingGoalId: data.savingGoalId || null,
        createdAt: now()
      }
      await db.transactions.add(toPlain(t))
      this.transactions.push(t)
      // 收入计入储蓄目标：更新该目标的已存金额
      if (t.type === 'income' && t.savingGoalId) {
        const goal = this.savingGoals.find(g => g.id === t.savingGoalId)
        if (goal) {
          goal.savedAmount += t.amount
          await db.savingGoals.put(toPlain(goal))
        }
      }
      return t
    },
    async updateTransaction(id: string, patch: Partial<Transaction>) {
      const t = this.transactions.find(x => x.id === id)
      if (!t) return
      Object.assign(t, patch)
      await db.transactions.put(toPlain(t))
    },
    async removeTransaction(id: string) {
      await db.transactions.delete(id)
      this.transactions = this.transactions.filter(t => t.id !== id)
    },
    async setBudget(month: string, category: string, amount: number) {
      const existing = this.budgets.find(b => b.month === month && b.category === category)
      if (existing) {
        existing.amount = amount
        await db.budgets.put(toPlain(existing))
      } else {
        const b: Budget = { id: uid(), period: 'month', month, category, amount }
        await db.budgets.add(toPlain(b))
        this.budgets.push(b)
      }
    },
    async addAccount(data: Partial<Account>) {
      const a: Account = { id: uid(), name: data.name || '账户', type: data.type || 'other', balance: data.balance ?? 0 }
      await db.accounts.add(toPlain(a))
      this.accounts.push(a)
    },
    async addSavingGoal(data: Partial<SavingGoal>) {
      const g: SavingGoal = { id: uid(), title: data.title || '储蓄目标', targetAmount: data.targetAmount ?? 0, savedAmount: data.savedAmount ?? 0, targetDate: data.targetDate || null, note: data.note || '', createdAt: now() }
      await db.savingGoals.add(toPlain(g))
      this.savingGoals.push(g)
    },
    async updateSavingGoal(id: string, patch: Partial<SavingGoal>) {
      const g = this.savingGoals.find(x => x.id === id)
      if (!g) return
      Object.assign(g, patch)
      await db.savingGoals.put(toPlain(g))
    },
    async addSubscription(data: Partial<Subscription>) {
      const s: Subscription = { id: uid(), name: data.name || '订阅', amount: data.amount ?? 0, cycle: data.cycle || 'monthly', nextChargeDate: data.nextChargeDate || '', category: data.category || '其他', note: data.note || '', wantCancel: false }
      await db.subscriptions.add(toPlain(s))
      this.subscriptions.push(s)
    },
    async addInsurance(data: Partial<Insurance>) {
      const i: Insurance = { id: uid(), name: data.name || '保险', type: data.type || '', premium: data.premium ?? 0, dueDate: data.dueDate || '', beneficiary: data.beneficiary || '', note: data.note || '' }
      await db.insurances.add(toPlain(i))
      this.insurances.push(i)
    }
  }
})
