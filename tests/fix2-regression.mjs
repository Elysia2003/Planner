// 回归测试：三个 bug 的修复验证（用真实 store 逻辑 + fake-indexeddb）
import 'fake-indexeddb/auto'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '../src/db.ts'
import { useHabitStore } from '../src/stores/habits.ts'
import { useFinanceStore } from '../src/stores/finance.ts'

setActivePinia(createPinia())

const habits = useHabitStore()
const finance = useFinanceStore()

let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  [' + extra + ']' : '')) }
  else { fail++; console.log('  FAIL  ' + name + '  ' + extra) }
}

async function main() {
  await db.open()
  await habits.load()
  await finance.load()

  // ===== 问题1：习惯未完成原因 =====
  console.log('\n=== 问题1：习惯未完成原因 ===')
  const h = await habits.create({ title: '测试习惯', freq: 'daily' })

  // 1a. 记录未完成原因
  await habits.recordMiss(h.id, '2026-10-15', '加班太晚')
  const missReason = habits.missReasonOf(h.id, '2026-10-15')
  check('记录原因后能读回', missReason === '加班太晚', missReason)

  // 1b. 未完成当天不被算作已打卡（datesOf 只返回 value>0）
  const dates = habits.datesOf(h.id)
  check('未完成当天不算入打卡日期', dates.indexOf('2026-10-15') === -1, 'dates=' + JSON.stringify(dates))

  // 1c. streak 不把未完成算进连续
  const streak = habits.streak(h.id)
  check('连续天数不受未完成影响', streak.current === 0, 'current=' + streak.current)

  // 1d. 已有打卡记录时记录原因，应改为未完成
  await habits.toggleCheckin(h.id, '2026-10-16')  // 打卡
  // 用 datesOf 验证 10-16 已打卡
  check('10-16 打卡后计入 datesOf', habits.datesOf(h.id).includes('2026-10-16'))

  // 1e. 误打卡后记录未完成原因，value 应归 0
  await habits.recordMiss(h.id, '2026-10-16', '其实没做')
  check('记录原因后 10-16 从未打卡列表中移除', !habits.datesOf(h.id).includes('2026-10-16'))
  check('原因持久化', habits.missReasonOf(h.id, '2026-10-16') === '其实没做')

  // ===== 问题2：财务收支标签 + 收入计储蓄 =====
  console.log('\n=== 问题2：财务收支标签 + 收入计储蓄 ===')
  const goal = { title: '旅行基金', targetAmount: 1000000, savedAmount: 0 }
  await finance.addSavingGoal(goal)
  const gid = finance.savingGoals.find(s => s.title === '旅行基金').id

  // 2a. 收入计入储蓄
  await finance.addTransaction({ type: 'income', amount: 500000, category: '工资', savingGoalId: gid, date: '2026-10-01' })
  const gAfter = finance.savingGoals.find(s => s.id === gid)
  check('收入计入储蓄目标 savedAmount 增加', gAfter.savedAmount === 500000, 'savedAmount=' + gAfter.savedAmount)

  // 2b. 收入不计入储蓄 → 流动资金
  await finance.addTransaction({ type: 'income', amount: 300000, category: '工资', savingGoalId: null, date: '2026-10-02' })
  // 2c. 一笔支出
  await finance.addTransaction({ type: 'expense', amount: 100000, category: '餐饮', date: '2026-10-03' })

  // 流动资金 = 未计入储蓄的收入(300000) - 支出(100000) = 200000
  check('流动资金计算正确', finance.liquidAmount === 200000, 'liquid=' + finance.liquidAmount)
  // 储蓄总额 = 500000
  check('储蓄总额计算正确', finance.totalSaved === 500000, 'saved=' + finance.totalSaved)

  // 2d. 收入分类区分（settings 有 incomeCategories）
  const { ensureSettings } = await import('../src/db.ts')
  const s = await ensureSettings()
  check('收入分类已配置', s.incomeCategories.length > 0, s.incomeCategories.join(','))
  check('收入分类与支出分类不同', JSON.stringify(s.incomeCategories) !== JSON.stringify(s.categories))

  // ===== 问题3：统计纵轴（fenToYuan 转换正确） =====
  console.log('\n=== 问题3：统计纵轴金额转换 ===')
  const { fenToYuan } = await import('../src/utils.ts')
  check('fenToYuan(500000) = 5000.00', fenToYuan(500000) === '5,000.00' || fenToYuan(500000).replace(/,/g, '') === '5000.00', fenToYuan(500000))
  check('fenToYuan(12345) = 123.45', fenToYuan(12345) === '123.45')

  db.close()
  console.log('\n=================================')
  console.log('通过 ' + pass + ' / ' + (pass + fail) + (fail ? '  ❌ 有失败' : '  ✅ 全部通过'))
  process.exit(fail ? 1 : 0)
}

main().catch(e => { console.error('测试崩溃:', e); process.exit(1) })
