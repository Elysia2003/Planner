// 回归测试：任务3（财务删除/健康调整与BMI/移除收集箱）
import 'fake-indexeddb/auto'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '../src/db.ts'
import { useFinanceStore } from '../src/stores/finance.ts'
import { useHealthStore } from '../src/stores/health.ts'
import { useTaskStore } from '../src/stores/tasks.ts'

setActivePinia(createPinia())
const finance = useFinanceStore()
const health = useHealthStore()
const tasks = useTaskStore()

let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  [' + extra + ']' : '')) }
  else { fail++; console.log('  FAIL  ' + name + '  ' + extra) }
}

async function main() {
  await db.open()
  await finance.load(); await health.load(); await tasks.load()

  console.log('\n=== 任务1：财务删除 ===')
  await finance.addSavingGoal({ title: '目标A', targetAmount: 100000 })
  await finance.addSavingGoal({ title: '目标B', targetAmount: 200000 })
  const gid = finance.savingGoals.find(s => s.title === '目标A').id
  await finance.removeSavingGoal(gid)
  check('储蓄目标删除后移除', !finance.savingGoals.some(s => s.id === gid), '剩余 ' + finance.savingGoals.length)
  const dbGoal = await db.savingGoals.get(gid)
  check('储蓄目标从数据库删除', !dbGoal)

  await finance.addSubscription({ name: '订阅A', amount: 1000, nextChargeDate: '2026-11-01' })
  const sid = finance.subscriptions.find(s => s.name === '订阅A').id
  await finance.removeSubscription(sid)
  check('订阅删除后移除', !finance.subscriptions.some(s => s.id === sid))
  const dbSub = await db.subscriptions.get(sid)
  check('订阅从数据库删除', !dbSub)

  console.log('\n=== 任务2：健康喝水调整 + 就诊删除 + BMI ===')
  // 喝水 +1 和 -1
  await health.addWater('2026-10-15', 1)
  await health.addWater('2026-10-15', 1)
  check('喝两杯后 todayWater=2', health.todayWater('2026-10-15') === 2, String(health.todayWater('2026-10-15')))
  await health.addWater('2026-10-15', -1)
  check('减一杯后 todayWater=1', health.todayWater('2026-10-15') === 1, String(health.todayWater('2026-10-15')))
  // 手动设置
  await health.setWater('2026-10-15', 8)
  check('手动设置喝水=8', health.todayWater('2026-10-15') === 8, String(health.todayWater('2026-10-15')))
  // 手动设置为负数应归 0
  await health.setWater('2026-10-15', -3)
  check('负数归 0', health.todayWater('2026-10-15') === 0, String(health.todayWater('2026-10-15')))

  // 就诊删除
  await health.addVisit({ date: '2026-10-01', hospital: '医院A', diagnosis: '感冒' })
  const vid = health.visits[0].id
  await health.removeVisit(vid)
  check('就诊记录删除', !health.visits.some(v => v.id === vid))

  // BMI 计算
  await health.record('height', 170, 'cm', '2026-10-15')
  await health.record('weight', 70, 'kg', '2026-10-15')
  const bmi = health.bmi
  check('BMI 计算正确(70/1.7^2≈24.22)', bmi !== null && Math.abs(bmi - 24.22) < 0.05, bmi === null ? 'null' : bmi.toFixed(2))
  // 无身高时不计算
  await db.health.where('type').equals('height').delete()
  health.records = health.records.filter(r => r.type !== 'height')
  check('无身高时 BMI 为 null', health.bmi === null)

  console.log('\n=== 任务3：移除收集箱 ===')
  check('task store 无 inbox getter', !('inbox' in tasks))
  check('inbox 无残留数据逻辑', tasks.tasks.every(t => !('inbox' in t)))

  db.close()
  console.log('\n=================================')
  console.log('通过 ' + pass + ' / ' + (pass + fail) + (fail ? '  ❌ 有失败' : '  ✅ 全部通过'))
  process.exit(fail ? 1 : 0)
}

main().catch(e => { console.error('测试崩溃:', e); process.exit(1) })
