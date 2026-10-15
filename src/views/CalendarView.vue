<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { toDateStr, todayStr, weekStart } from '@/utils'

const tasks = useTaskStore()

const viewDate = ref(new Date())
const today = todayStr()

const weekStartDay = 1 // 周一

// 当前显示月份的天数网格
const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const first = new Date(year, month, 1)
  const start = weekStart(first, weekStartDay)
  const days: { date: string; day: number; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({
      date: toDateStr(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month
    })
  }
  return days
})

const monthLabel = computed(() => `${viewDate.value.getFullYear()} 年 ${viewDate.value.getMonth() + 1} 月`)

// 某天的任务
function tasksOn(date: string) {
  const due = tasks.tasks.filter(t => !t.deletedAt && t.dueDate === date && t.status !== 'done')
  const repeats = tasks.repeatInstancesOn(date)
  return [...due, ...repeats].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
}

function prev() { viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1) }
function next() { viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1) }
function goToday() { viewDate.value = new Date() }

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
</script>

<template>
  <div class="calendar">
    <header class="page-head">
      <div>
        <h1 class="page-title">日程</h1>
        <p class="page-sub">把任务放进真实的时间里</p>
      </div>
      <div class="cal-nav">
        <button class="btn" @click="prev">‹</button>
        <span class="cal-month">{{ monthLabel }}</span>
        <button class="btn" @click="next">›</button>
        <button class="btn ghost" @click="goToday">今天</button>
      </div>
    </header>

    <div class="card">
      <div class="cal-grid">
        <div v-for="w in weekdays" :key="w" class="cal-weekday">{{ w }}</div>
        <div
          v-for="d in calendarDays" :key="d.date"
          class="cal-day"
          :class="{ out: !d.inMonth, today: d.date === today }"
        >
          <span class="cal-daynum">{{ d.day }}</span>
          <div class="cal-tasks">
            <span v-for="t in tasksOn(d.date).slice(0, 3)" :key="t.id" class="cal-task" :class="'pri' + t.priority">
              {{ t.title }}
            </span>
            <span v-if="tasksOn(d.date).length > 3" class="cal-more">+{{ tasksOn(d.date).length - 3 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }
.cal-nav { display: flex; align-items: center; gap: 8px; }
.cal-month { font-size: 14px; font-weight: 600; min-width: 100px; text-align: center; }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
.cal-weekday { text-align: center; padding: 8px 0; font-size: 12.5px; color: var(--ink-3); font-weight: 600; }
.cal-day { min-height: 92px; padding: 6px; background: var(--bg-2); border-radius: 6px; overflow: hidden; }
.cal-day.out { opacity: .4; }
.cal-day.today { background: var(--accent-soft); outline: 2px solid var(--accent); outline-offset: -2px; }
.cal-daynum { font-size: 12px; font-weight: 600; color: var(--ink-2); }
.cal-tasks { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
.cal-task {
  font-size: 11px; padding: 2px 5px; border-radius: 4px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; background: var(--panel); border-left: 3px solid var(--ink-3);
}
.cal-task.pri0 { border-left-color: var(--red); }
.cal-task.pri1 { border-left-color: var(--amber); }
.cal-task.pri2 { border-left-color: var(--green); }
.cal-more { font-size: 11px; color: var(--ink-3); }

@media (max-width: 820px) {
  .cal-day { min-height: 60px; }
  .cal-task { display: none; }
}
</style>
