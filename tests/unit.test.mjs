// 核心逻辑单元测试 — 用 esbuild 把 TS 源码转译为 JS 后，测真实代码
import { build } from 'esbuild'
import { readFileSync, existsSync } from 'node:fs'

// 用 esbuild 把 utils.ts 转译为可执行的 ESM
const outfile = './tests/utils.mjs'
await build({
  entryPoints: ['./src/utils.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  logLevel: 'silent'
})

const u = await import('./utils.mjs')
const {
  pad, toDateStr, todayStr, parseDate, addDays, daysBetween,
  weekStart, relativeDate, weekday, matchesRepeat, calcStreak,
  repeatRuleText, fenToYuan, yuanToFen, formatMinutes
} = u

let pass = 0, fail = 0
function assert(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  [' + extra + ']' : '')) }
  else { fail++; console.log('  FAIL  ' + name + '  ' + extra) }
}

console.log('=== 日期工具 ===')
assert('pad 补零', pad(3) === '03' && pad(12) === '12')
assert('toDateStr 格式', toDateStr(new Date(2026, 0, 5)) === '2026-01-05')
assert('addDays 跨月', addDays('2026-01-31', 1) === '2026-02-01')
assert('addDays 负数跨月', addDays('2026-03-01', -1) === '2026-02-28')
assert('addDays 闰年', addDays('2024-02-28', 1) === '2024-02-29')
assert('daysBetween', daysBetween('2026-01-01', '2026-01-11') === 10)
assert('weekStart 周一', weekStart(new Date(2026, 9, 15), 1).getDay() === 1)
assert('weekday 中文', weekday('2026-10-15') === '周四')
assert('parseDate', parseDate('2026-01-05').getMonth() === 0)

console.log('\n=== 相对日期 ===')
assert('今天', relativeDate(todayStr()) === '今天')
assert('明天', relativeDate(addDays(todayStr(), 1)) === '明天')
assert('后天', relativeDate(addDays(todayStr(), 2)) === '后天')
assert('昨天', relativeDate(addDays(todayStr(), -1)) === '昨天')

console.log('\n=== 重复规则 ===')
const daily = { freq: 'daily', interval: 1 }
assert('每天-次日', matchesRepeat(daily, '2026-10-16', '2026-10-15'))
assert('每天-远未来', matchesRepeat(daily, '2026-12-31', '2026-10-15'))
assert('每天-起始前不算', !matchesRepeat(daily, '2026-10-14', '2026-10-15'))

const e2 = { freq: 'daily', interval: 2 }
assert('每2天-第0天', matchesRepeat(e2, '2026-10-15', '2026-10-15'))
assert('每2天-第2天', matchesRepeat(e2, '2026-10-17', '2026-10-15'))
assert('每2天-第1天不算', !matchesRepeat(e2, '2026-10-16', '2026-10-15'))
assert('每2天-第4天', matchesRepeat(e2, '2026-10-19', '2026-10-15'))

const weekly = { freq: 'weekly', interval: 1, byDay: [1, 3, 5] }
assert('每周-周一', matchesRepeat(weekly, '2026-10-19', '2026-10-15'))
assert('每周-周五', matchesRepeat(weekly, '2026-10-23', '2026-10-15'))
assert('每周-周二不算', !matchesRepeat(weekly, '2026-10-20', '2026-10-15'))

const monthly = { freq: 'monthly', interval: 1, byMonthDay: [1, 15] }
assert('每月-15号', matchesRepeat(monthly, '2026-11-15', '2026-10-15'))
assert('每月-1号', matchesRepeat(monthly, '2026-11-01', '2026-10-15'))
assert('每月-10号不算', !matchesRepeat(monthly, '2026-11-10', '2026-10-15'))

const yearly = { freq: 'yearly', interval: 1 }
assert('每年-同日', matchesRepeat(yearly, '2027-10-15', '2026-10-15'))
assert('每年-不同日不算', !matchesRepeat(yearly, '2027-10-16', '2026-10-15'))

console.log('\n=== 连续天数 ===')
assert('空', JSON.stringify(calcStreak([])) === '{"current":0,"best":0}')
const t = todayStr()
assert('今天打卡 current>=1', calcStreak([t]).current >= 1)
const y = addDays(t, -1), y2 = addDays(t, -2)
assert('连续2天 current=2', calcStreak([y, y2]).current === 2)
const d1 = addDays(t, -10), d2 = addDays(t, -9), d3 = addDays(t, -8)
const d5 = addDays(t, -5), d6 = addDays(t, -4)
assert('最长连续段 best=3', calcStreak([d1, d2, d3, d5, d6]).best === 3)

console.log('\n=== 格式化 ===')
assert('fenToYuan', fenToYuan(12345) === '123.45')
assert('fenToYuan-整数', fenToYuan(100) === '1.00')
assert('yuanToFen', yuanToFen(123.45) === 12345)
assert('formatMinutes-分钟', formatMinutes(45) === '45 分钟')
assert('formatMinutes-整小时', formatMinutes(120) === '2 小时')
assert('formatMinutes-混合', formatMinutes(150) === '2 小时 30 分')

console.log('\n=== 重复规则文案 ===')
assert('每天', repeatRuleText({ freq: 'daily', interval: 1 }) === '每天')
assert('每2天', repeatRuleText({ freq: 'daily', interval: 2 }) === '每 2 天')
assert('每周一三五', repeatRuleText({ freq: 'weekly', interval: 1, byDay: [1, 3, 5] }) === '每周 周一、周三、周五')
assert('每月1,15号', repeatRuleText({ freq: 'monthly', interval: 1, byMonthDay: [1, 15] }) === '每月 1、15 号')

console.log('\n=================================')
console.log('通过 ' + pass + ' / ' + (pass + fail) + (fail ? '  ❌ 有失败' : '  ✅ 全部通过'))
process.exit(fail ? 1 : 0)
