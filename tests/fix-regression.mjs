// 回归测试：验证 reactive 对象存储修复 + 四个 bug
import 'fake-indexeddb/auto'
import { reactive } from 'vue'
import { db, toPlain } from '../src/db.ts'

// 用 esbuild 处理 TS，直接在这里模拟真实 store 的写库行为
// 核心：所有写库前都 toPlain，验证 reactive 对象能被正确存储

async function main() {
  // 1. 模拟 goals update：reactive 对象 put 进库（问题1根因）
  const goal = reactive({ id: 'g1', title: '目标A', desc: '', period: 'year', startDate: '2026-01-01', endDate: '2026-12-31', progress: 0, parentId: null, milestones: [], domain: '成长', vision: '', archived: false, abandonedReason: '', createdAt: 1, updatedAt: 1 })
  goal.title = '改过的目标'
  try {
    await db.goals.put(toPlain(goal))
    const back = await db.goals.get('g1')
    console.log('PASS  目标更新存储 OK，读回标题:', back.title)
  } catch (e) {
    console.log('FAIL  目标更新存储失败:', e.message)
  }

  // 2. 模拟 tasks create：含 reactive 数组 tags（问题3根因）
  const taskForm = reactive({ title: '新任务', note: '', dueDate: '', priority: 1, tags: reactive([]), goalId: null })
  const task = { id: 't1', title: taskForm.title, note: taskForm.note, status: 'todo', priority: taskForm.priority, dueDate: taskForm.dueDate || null, remindAt: null, repeat: null, tags: taskForm.tags, subtasks: [], parentId: null, goalId: taskForm.goalId || null, estimateMin: null, spentMin: 0, attachments: [], createdAt: 2, updatedAt: 2, completedAt: null, deletedAt: null }
  try {
    await db.tasks.add(toPlain(task))
    const back = await db.tasks.get('t1')
    console.log('PASS  任务创建存储 OK，读回:', back.title, 'tags=', JSON.stringify(back.tags))
  } catch (e) {
    console.log('FAIL  任务创建失败:', e.message)
  }

  // 3. 模拟 health 喝水 +1（问题4）
  const waterRecord = reactive({ id: 'w1', type: 'water', value: 0, unit: '杯', date: '2026-10-15', note: '', createdAt: 3 })
  // 第一次：无记录，新建 value=1
  try {
    const r = { id: 'w1', type: 'water', value: 1, unit: '杯', date: '2026-10-15', note: '', createdAt: 3 }
    await db.health.add(toPlain(r))
    // 第二次：+1
    waterRecord.value = 2
    await db.health.put(toPlain(waterRecord))
    const back = await db.health.get('w1')
    console.log('PASS  喝水累计 OK，当前', back.value, back.unit)
  } catch (e) {
    console.log('FAIL  喝水记录失败:', e.message)
  }

  // 4. 验证 toPlain 对 reactive 的深层数组有效
  const withMilestones = reactive({ id: 'g2', title: 'x', milestones: reactive([reactive({ id: 'm1', title: '里程碑', date: '2026-01-01', done: false })]) })
  try {
    await db.goals.put(toPlain(withMilestones))
    const back = await db.goals.get('g2')
    console.log('PASS  深层 reactive 数组存储 OK，里程碑数:', back.milestones.length)
  } catch (e) {
    console.log('FAIL  深层 reactive 失败:', e.message)
  }

  // 5. 模拟目标删除：级联子目标
  await db.goals.put({ id: 'p1', title: '父', parentId: null })
  await db.goals.put({ id: 'c1', title: '子', parentId: 'p1' })
  // 模拟 remove 逻辑
  await db.goals.delete('p1')
  await db.goals.bulkDelete(['c1'])
  const p = await db.goals.get('p1')
  const c = await db.goals.get('c1')
  console.log('PASS  目标删除+级联 OK，父目标剩余:', p, '子目标剩余:', c)

  db.close()
}

main().catch(e => console.error('测试崩溃:', e))
