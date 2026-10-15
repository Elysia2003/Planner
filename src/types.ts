// 数据模型类型定义 — 整个应用的领域模型地基

export type ID = string

// 优先级：P0 最高
export type Priority = 0 | 1 | 2 | 3

// 任务状态
export type TaskStatus = 'todo' | 'doing' | 'done' | 'archived'

// ---------- 目标 ----------
export interface Goal {
  id: ID
  title: string
  desc: string
  // 周期：year / quarter / month / longterm
  period: 'year' | 'quarter' | 'month' | 'longterm'
  startDate: string        // YYYY-MM-DD
  endDate: string          // YYYY-MM-DD
  progress: number         // 0-100
  // 分层：parentId 为空表示顶层目标
  parentId: ID | null
  // 里程碑
  milestones: Milestone[]
  // 领域：事业/健康/家庭/财务/成长/社交/休闲
  domain: string
  // 愿景价值观（可选，仅顶层目标用）
  vision: string
  archived: boolean
  abandonedReason: string
  createdAt: number
  updatedAt: number
}

export interface Milestone {
  id: ID
  title: string
  date: string
  done: boolean
}

// ---------- 任务 ----------
export interface Task {
  id: ID
  title: string
  note: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null    // YYYY-MM-DD
  remindAt: string | null   // ISO datetime
  // 重复规则：null 不重复；否则 rrule 风格简化
  repeat: RepeatRule | null
  tags: string[]
  subtasks: Subtask[]
  parentId: ID | null       // 父子任务（子任务也可用 subtasks，二者取其一）
  goalId: ID | null         // 关联目标
  // 时间估算与实际耗时（分钟）
  estimateMin: number | null
  spentMin: number
  attachments: Attachment[]
  createdAt: number
  updatedAt: number
  completedAt: number | null
  deletedAt: number | null  // 软删除，进入回收站
}

export interface Subtask {
  id: ID
  title: string
  done: boolean
}

export interface Attachment {
  id: ID
  name: string
  type: string
  dataUrl: string   // 本地存储用 dataURL；大文件后续可换 Blob
  size: number
  createdAt: number
}

export interface RepeatRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number        // 每 N 天/周/月/年
  // 每周：0=周日..6=周六；每月：几号
  byDay?: number[]
  byMonthDay?: number[]
}

// ---------- 习惯 ----------
export interface Habit {
  id: ID
  title: string
  // 频率：每日 或 每周 N 次
  freq: 'daily' | 'weekly'
  weeklyTarget: number    // weekly 时每周目标次数
  // 弹性规则：允许每周漏的次数（不打断连续）
  allowMiss: number
  // 提醒时间 HH:mm 列表
  remindTimes: string[]
  group: string           // 身体/认知/社交/财务/其他
  color: string
  archived: boolean
  createdAt: number
  updatedAt: number
}

// 打卡记录：key 为 YYYY-MM-DD
export interface Checkin {
  id: ID
  habitId: ID
  date: string            // YYYY-MM-DD
  value: number           // 完成次数（用于喝水等可多次）
  note: string
  missedReason: string
  createdAt: number
}

// ---------- 健康 ----------
export interface HealthRecord {
  id: ID
  type: 'weight' | 'water' | 'sleep' | 'height' | 'bmi' | 'bodyfat' | 'steps' | 'visit'
  value: number
  unit: string
  date: string            // YYYY-MM-DD
  note: string
  createdAt: number
}

// 就诊记录
export interface MedicalVisit {
  id: ID
  date: string
  hospital: string
  doctor: string
  diagnosis: string
  prescription: string
  note: string
  createdAt: number
}

// ---------- 财务 ----------
export interface Transaction {
  id: ID
  type: 'income' | 'expense'
  amount: number          // 分，避免浮点误差
  category: string
  account: string
  note: string
  date: string            // YYYY-MM-DD
  savingGoalId: string | null  // 收入可指定计入某储蓄目标；null = 流动资金
  createdAt: number
}

export interface Budget {
  id: ID
  period: 'month' | 'year'
  month: string           // YYYY-MM
  category: string        // 空 = 总额预算
  amount: number          // 分
}

export interface Account {
  id: ID
  name: string
  type: 'cash' | 'card' | 'alipay' | 'wechat' | 'other'
  balance: number         // 分
}

export interface SavingGoal {
  id: ID
  title: string
  targetAmount: number    // 分
  savedAmount: number     // 分
  targetDate: string | null
  note: string
  createdAt: number
}

export interface Subscription {
  id: ID
  name: string
  amount: number          // 分
  cycle: 'monthly' | 'yearly' | 'weekly'
  nextChargeDate: string
  category: string
  note: string
  wantCancel: boolean
}

export interface Insurance {
  id: ID
  name: string
  type: string
  premium: number         // 分
  dueDate: string         // 续保日期
  beneficiary: string
  note: string
}

// ---------- 日程 ----------
export interface Event {
  id: ID
  title: string
  start: string           // ISO datetime
  end: string             // ISO datetime
  allDay: boolean
  location: string
  color: string
  note: string
  repeat: RepeatRule | null
  createdAt: number
  updatedAt: number
}

// ---------- 设置 ----------
export interface Settings {
  id: ID
  theme: 'light' | 'dark' | 'system'
  weekStart: 0 | 1        // 0=周日 1=周一
  currency: string
  language: 'zh' | 'en'
  homeModules: string[]   // 首页显示的模块顺序
  tags: string[]          // 自定义标签库
  categories: string[]    // 自定义支出分类
  incomeCategories: string[]  // 自定义收入分类
  createdAt: number
  updatedAt: number
}

// ---------- 全局导出格式 ----------
export interface BackupPayload {
  version: number
  exportedAt: number
  goals: Goal[]
  tasks: Task[]
  habits: Habit[]
  checkins: Checkin[]
  health: HealthRecord[]
  visits: MedicalVisit[]
  transactions: Transaction[]
  budgets: Budget[]
  accounts: Account[]
  savingGoals: SavingGoal[]
  subscriptions: Subscription[]
  insurances: Insurance[]
  events: Event[]
  settings: Settings | null
}
