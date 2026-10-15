// 通用工具函数

// ---------- 日期 ----------
export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

// Date -> YYYY-MM-DD
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function daysBetween(a: string, b: string): number {
  const da = parseDate(a).getTime()
  const db = parseDate(b).getTime()
  return Math.round((db - da) / 86400000)
}

// 本周期一
export function weekStart(date: Date, weekStartDay: 0 | 1 = 1): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=周日
  let diff = (day - weekStartDay + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// 相对描述：今天/明天/后天/昨天/X天后
export function relativeDate(s: string): string {
  const diff = daysBetween(todayStr(), s)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'
  if (diff > 2 && diff <= 7) return `${diff} 天后`
  if (diff < -1 && diff >= -7) return `${-diff} 天前`
  const d = parseDate(s)
  const now = new Date()
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// 星期几
export function weekday(s: string): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[parseDate(s).getDay()]
}

// 月份
export function monthStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function currentMonthStr(): string {
  return monthStr(new Date())
}

// ---------- 格式化 ----------
// 分 -> 元
export function fenToYuan(fen: number): string {
  return (fen / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

// 分钟 -> 时长描述
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

// ---------- 重复规则 ----------
import type { RepeatRule } from './types'

export function repeatRuleText(r: RepeatRule): string {
  const f = { daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年' }[r.freq]
  if (r.interval > 1) {
    const u = { daily: '天', weekly: '周', monthly: '个月', yearly: '年' }[r.freq]
    return `每 ${r.interval} ${u}`
  }
  if (r.freq === 'weekly' && r.byDay?.length) {
    const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return '每周 ' + r.byDay.map(d => names[d]).join('、')
  }
  if (r.freq === 'monthly' && r.byMonthDay?.length) {
    return '每月 ' + r.byMonthDay.join('、') + ' 号'
  }
  return f
}

// 计算某个日期是否命中重复规则（用于判断某天是否有重复任务）
export function matchesRepeat(r: RepeatRule, date: string, startDate: string): boolean {
  if (date < startDate) return false
  const start = parseDate(startDate)
  const target = parseDate(date)
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000)
  if (diffDays < 0) return false

  switch (r.freq) {
    case 'daily':
      return diffDays % r.interval === 0
    case 'weekly': {
      // byDay：目标日的星期几必须命中
      if (r.byDay?.length && !r.byDay.includes(target.getDay())) return false
      // 按周对齐（周序号），支持每 N 周
      const startWeek = Math.floor(weekStart(start, 1).getTime() / (7 * 86400000))
      const targetWeek = Math.floor(weekStart(target, 1).getTime() / (7 * 86400000))
      const weekDiff = targetWeek - startWeek
      return weekDiff >= 0 && weekDiff % r.interval === 0
    }
    case 'monthly': {
      const monthDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth())
      if (monthDiff % r.interval !== 0) return false
      if (r.byMonthDay?.length) return r.byMonthDay.includes(target.getDate())
      return target.getDate() === start.getDate()
    }
    case 'yearly': {
      const yearDiff = target.getFullYear() - start.getFullYear()
      if (yearDiff % r.interval !== 0) return false
      return target.getMonth() === start.getMonth() && target.getDate() === start.getDate()
    }
    default:
      return false
  }
}

// ---------- 连续天数计算（习惯） ----------
export function calcStreak(dates: string[]): { current: number; best: number } {
  if (dates.length === 0) return { current: 0, best: 0 }
  const set = new Set(dates)
  const sorted = Array.from(set).sort()
  let best = 0, run = 1
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1], sorted[i]) === 1) run++
    else { best = Math.max(best, run); run = 1 }
  }
  best = Math.max(best, run)

  // 当前连续：从今天（或昨天）往前数
  let current = 0
  let cursor = todayStr()
  if (!set.has(cursor)) cursor = addDays(cursor, -1)
  while (set.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  return { current, best }
}

// ---------- 颜色 ----------
const PALETTE = ['#3d5afe', '#0f9d58', '#b8860b', '#d85a30', '#7f77dd', '#1d9e75', '#e24b4a', '#185fa5', '#b04a4a', '#0b7285']

export function colorFor(n: number): string {
  return PALETTE[n % PALETTE.length]
}

// ---------- 下载 ----------
export function downloadFile(name: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadJson(name: string, obj: unknown) {
  downloadFile(name, JSON.stringify(obj, null, 2), 'application/json;charset=utf-8')
}

// 节流
export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
