<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useFinanceStore } from '@/stores/finance'
import { useGoalStore } from '@/stores/goals'
import { useSettingsStore } from '@/stores/settings'
import { addDays, todayStr, fenToYuan } from '@/utils'
import * as echarts from 'echarts'

const tasks = useTaskStore()
const habits = useHabitStore()
const finance = useFinanceStore()
const goals = useGoalStore()
const settings = useSettingsStore()

const trendEl = ref<HTMLElement | null>(null)
const financeEl = ref<HTMLElement | null>(null)

// 近 7 天任务完成趋势
const weekTrend = computed(() => {
  const days: { date: string; total: number; done: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(todayStr(), -i)
    const total = tasks.tasks.filter(t => !t.deletedAt && t.dueDate === d).length
    const done = tasks.tasks.filter(t => !t.deletedAt && t.dueDate === d && t.status === 'done').length
    days.push({ date: d.slice(5), total, done })
  }
  return days
})

// 近 6 个月支出
const monthTrend = computed(() => {
  const now = new Date()
  const months: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const amount = finance.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0)
    months.push({ label: `${d.getMonth() + 1}月`, amount })
  }
  return months
})

// 完成率
const weekCompletion = computed(() => {
  const total = tasks.tasks.filter(t => !t.deletedAt && t.dueDate && t.dueDate >= addDays(todayStr(), -7)).length
  const done = tasks.tasks.filter(t => !t.deletedAt && t.dueDate && t.dueDate >= addDays(todayStr(), -7) && t.status === 'done').length
  return total ? Math.round(done / total * 100) : 0
})

// 习惯达标率（今天已打卡比例）
const habitRate = computed(() => {
  const act = habits.active
  if (!act.length) return 0
  return Math.round(act.filter(h => habits.checkedToday(h.id)).length / act.length * 100)
})

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark' }
function textColor() { return isDark() ? '#b8bec6' : '#4a5158' }

async function renderTrend() {
  await nextTick()
  if (!trendEl.value) return
  const chart = echarts.init(trendEl.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['总任务', '已完成'], textStyle: { color: textColor() } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: weekTrend.value.map(d => d.date), axisLabel: { color: textColor() } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: textColor() } },
    series: [
      { name: '总任务', type: 'bar', data: weekTrend.value.map(d => d.total), itemStyle: { color: '#3d5afe', borderRadius: [4, 4, 0, 0] } },
      { name: '已完成', type: 'bar', data: weekTrend.value.map(d => d.done), itemStyle: { color: '#0f9d58', borderRadius: [4, 4, 0, 0] } }
    ]
  })
}

async function renderFinance() {
  await nextTick()
  if (!financeEl.value) return
  const chart = echarts.init(financeEl.value)
  chart.setOption({
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}: ¥${fenToYuan(p[0].value)}` },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: monthTrend.value.map(m => m.label), axisLabel: { color: textColor() } },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor(), formatter: (v: number) => '¥' + fenToYuan(v) }
    },
    series: [{
      name: '支出', type: 'line', smooth: true, data: monthTrend.value.map(m => m.amount),
      itemStyle: { color: '#b04a4a' }, areaStyle: { opacity: .12 }
    }]
  })
}

onMounted(() => { renderTrend(); renderFinance() })
watch(() => settings.isDark, () => { renderTrend(); renderFinance() })
watch(() => tasks.tasks.length, () => renderTrend())

function pad(n: number) { return n < 10 ? '0' + n : String(n) }
</script>

<template>
  <div class="stats">
    <header class="page-head">
      <div>
        <h1 class="page-title">统计</h1>
        <p class="page-sub">用数据看见生活</p>
      </div>
    </header>

    <!-- 关键指标 -->
    <div class="overview">
      <div class="ov-card">
        <span class="ov-num">{{ goals.active.length }}</span>
        <span class="ov-label">进行中目标</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">{{ tasks.done.length }}</span>
        <span class="ov-label">累计完成任务</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">{{ weekCompletion }}%</span>
        <span class="ov-label">近 7 天任务完成率</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">{{ habitRate }}%</span>
        <span class="ov-label">今日习惯打卡率</span>
      </div>
    </div>

    <div class="grid">
      <section class="card">
        <h2 class="card-title">近 7 天任务</h2>
        <div ref="trendEl" class="chart"></div>
      </section>
      <section class="card">
        <h2 class="card-title">近 6 个月支出</h2>
        <div ref="financeEl" class="chart"></div>
      </section>
    </div>

    <!-- 目标进度一览 -->
    <section class="card">
      <h2 class="card-title">目标进度一览</h2>
      <div v-if="goals.topGoals.length" class="goal-list">
        <div v-for="g in goals.topGoals" :key="g.id" class="goal-row">
          <span class="goal-title">{{ g.title }}</span>
          <div class="progress"><div class="progress-fill" :style="{ width: g.progress + '%' }"></div></div>
          <span class="goal-pct">{{ g.progress }}%</span>
        </div>
      </div>
      <div v-else class="empty">暂无目标</div>
    </section>

    <!-- 数据导出 -->
    <section class="card">
      <h2 class="card-title">数据导出</h2>
      <p class="desc">把数据导出为文件，自行分析或备份</p>
      <div class="actions">
        <button class="btn" @click="$router.push('/settings')">前往设置页导出/备份 →</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 16px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }

.overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.ov-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; box-shadow: var(--shadow); }
.ov-num { font-size: 22px; font-weight: 650; }
.ov-label { font-size: 12px; color: var(--ink-3); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.card-title { font-size: 15px; margin: 0 0 12px; font-weight: 650; }
.chart { height: 240px; }

.goal-list { display: flex; flex-direction: column; gap: 10px; }
.goal-row { display: flex; align-items: center; gap: 12px; }
.goal-title { flex: 1; font-size: 13.5px; }
.goal-pct { font-size: 12px; color: var(--ink-3); width: 40px; text-align: right; }
.progress { flex: 1; max-width: 240px; height: 8px; background: var(--bg-2); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 4px; }

.desc { font-size: 13px; color: var(--ink-3); margin: 0 0 10px; }
.actions { display: flex; gap: 8px; }

@media (max-width: 820px) {
  .overview { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
</style>
