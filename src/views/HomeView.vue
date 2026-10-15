<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useGoalStore } from '@/stores/goals'
import { useFinanceStore } from '@/stores/finance'
import { todayStr, relativeDate, fenToYuan, repeatRuleText } from '@/utils'
import { useRouter } from 'vue-router'

const router = useRouter()
const tasks = useTaskStore()
const habits = useHabitStore()
const goals = useGoalStore()
const finance = useFinanceStore()

const today = todayStr()

const overdueTasks = computed(() =>
  tasks.today.filter(t => t.dueDate && t.dueDate < today)
)
const dueToday = computed(() =>
  tasks.today.filter(t => t.dueDate === today)
)
const todayHabits = computed(() => habits.active)
const activeGoals = computed(() => goals.topGoals.slice(0, 5))
const expense = computed(() => fenToYuan(finance.monthExpense))
const budget = computed(() => finance.monthBudget)
const budgetPercent = computed(() =>
  budget.value > 0 ? Math.min(100, Math.round(finance.monthExpense / budget.value * 100)) : 0
)

function prioLabel(p: number) { return ['P0', 'P1', 'P2', 'P3'][p] || '' }
function goTasks() { router.push('/tasks') }
function goGoals() { router.push('/goals') }
</script>

<template>
  <div class="home">
    <header class="page-head">
      <div>
        <h1 class="page-title">今日</h1>
        <p class="page-sub">{{ today }} · {{ relativeDate(today) }}</p>
      </div>
    </header>

    <!-- 概览卡片 -->
    <div class="overview">
      <div class="ov-card" @click="goTasks">
        <span class="ov-num">{{ overdueTasks.length + dueToday.length }}</span>
        <span class="ov-label">今日待办</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">{{ todayHabits.filter(h => habits.checkedToday(h.id)).length }}/{{ todayHabits.length }}</span>
        <span class="ov-label">习惯打卡</span>
      </div>
      <div class="ov-card" @click="goGoals">
        <span class="ov-num">{{ goals.active.length }}</span>
        <span class="ov-label">进行中目标</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">{{ expense }}</span>
        <span class="ov-label">本月支出(元)</span>
        <div class="ov-bar" v-if="budget > 0">
          <div class="ov-bar-fill" :style="{ width: budgetPercent + '%' }"></div>
        </div>
      </div>
    </div>

    <div class="grid">
      <!-- 逾期任务 -->
      <section class="card" v-if="overdueTasks.length">
        <h2 class="card-title">⚠️ 逾期</h2>
        <div class="task-row" v-for="t in overdueTasks" :key="t.id">
          <span class="dot dot-red"></span>
          <span class="task-title">{{ t.title }}</span>
          <span class="task-date">{{ relativeDate(t.dueDate!) }}</span>
        </div>
      </section>

      <!-- 今日任务 -->
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">今日待办</h2>
          <button class="btn sm" @click="goTasks">全部任务 →</button>
        </div>
        <div v-if="dueToday.length" class="task-list">
          <label v-for="t in dueToday" :key="t.id" class="task-row">
            <input
              type="checkbox"
              :checked="t.status === 'done'"
              @change="tasks.setStatus(t.id, t.status === 'done' ? 'todo' : 'done')"
            />
            <span class="task-title" :class="{ done: t.status === 'done' }">{{ t.title }}</span>
            <span class="tag" :class="'pri' + t.priority">{{ prioLabel(t.priority) }}</span>
            <span v-if="t.repeat" class="tag">{{ repeatRuleText(t.repeat) }}</span>
          </label>
        </div>
        <div v-else class="empty">
          <div class="big">🎉</div>
          今天没有待办，去收集箱里加点东西吧
        </div>
      </section>

      <!-- 习惯打卡 -->
      <section class="card">
        <h2 class="card-title">今日习惯</h2>
        <div v-if="todayHabits.length" class="habit-grid">
          <button
            v-for="h in todayHabits"
            :key="h.id"
            class="habit-chip"
            :class="{ on: habits.checkedToday(h.id) }"
            :style="habits.checkedToday(h.id) ? { background: h.color, borderColor: h.color } : {}"
            @click="habits.toggleCheckin(h.id, today)"
          >
            {{ h.title }}
          </button>
        </div>
        <div v-else class="empty">
          <div class="big">🔥</div>
          还没有习惯，去「习惯」页创建第一个吧
        </div>
      </section>

      <!-- 目标进度 -->
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">目标进度</h2>
          <button class="btn sm" @click="goGoals">全部目标 →</button>
        </div>
        <div v-if="activeGoals.length" class="goal-list">
          <div v-for="g in activeGoals" :key="g.id" class="goal-row">
            <span class="goal-title">{{ g.title }}</span>
            <div class="progress">
              <div class="progress-fill" :style="{ width: g.progress + '%' }"></div>
            </div>
            <span class="goal-pct">{{ g.progress }}%</span>
          </div>
        </div>
        <div v-else class="empty">
          <div class="big">🎯</div>
          还没有目标，去「目标」页定一个吧
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 18px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }

.overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.ov-card {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 14px 16px; cursor: pointer;
  display: flex; flex-direction: column; gap: 2px;
  box-shadow: var(--shadow); transition: .12s;
}
.ov-card:hover { border-color: var(--accent); }
.ov-num { font-size: 22px; font-weight: 650; color: var(--ink); }
.ov-label { font-size: 12px; color: var(--ink-3); }
.ov-bar { height: 4px; background: var(--bg-2); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.ov-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width .3s; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-title { font-size: 15px; margin: 0 0 10px; font-weight: 650; }
.card-head .card-title { margin: 0; }

.task-row {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 13.5px;
}
.task-row:last-child { border-bottom: none; }
.task-title { flex: 1; }
.task-title.done { text-decoration: line-through; opacity: .5; }
.task-date { font-size: 12px; color: var(--ink-3); white-space: nowrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.dot-red { background: var(--red); }
input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

.habit-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.habit-chip {
  padding: 7px 14px; border-radius: 999px; cursor: pointer;
  background: var(--bg-2); color: var(--ink-2); border: 1.5px solid transparent;
  font-size: 13px; transition: .12s;
}
.habit-chip:hover { border-color: var(--line); }
.habit-chip.on { color: #fff; font-weight: 600; }

.goal-list { display: flex; flex-direction: column; gap: 10px; }
.goal-row { display: flex; align-items: center; gap: 10px; }
.goal-title { flex: 1; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.goal-pct { font-size: 12px; color: var(--ink-3); width: 38px; text-align: right; }
.progress { flex: 1; max-width: 180px; height: 7px; background: var(--bg-2); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width .3s; }

@media (max-width: 820px) {
  .overview { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
</style>
