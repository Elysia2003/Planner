<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGoalStore } from '@/stores/goals'
import { useTaskStore } from '@/stores/tasks'
import { todayStr, relativeDate } from '@/utils'
import type { Goal } from '@/types'

const goals = useGoalStore()
const tasks = useTaskStore()

const showNew = ref(false)
const showArchived = ref(false)
const editing = ref<Goal | null>(null)

const form = ref({
  title: '',
  desc: '',
  period: 'year' as Goal['period'],
  domain: '成长',
  vision: ''
})

const domains = ['事业', '健康', '家庭', '财务', '成长', '社交', '休闲']
const periodLabels: Record<string, string> = { year: '年度', quarter: '季度', month: '月度', longterm: '长期' }

const list = computed(() => goals.topGoals)

function goalTasks(goalId: string) {
  const direct = tasks.byGoal(goalId)
  const children = goals.childrenOf(goalId)
  const childIds = new Set(children.map(c => c.id))
  const indirect = tasks.tasks.filter(t => t.goalId && childIds.has(t.goalId) && !t.deletedAt)
  return { total: direct.length + indirect.length, done: direct.filter(t => t.status === 'done').length + indirect.filter(t => t.status === 'done').length }
}

async function create() {
  if (!form.value.title.trim()) return
  await goals.create({
    ...form.value,
    startDate: todayStr(),
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10)
  })
  form.value.title = ''
  form.value.desc = ''
  showNew.value = false
}

function startEdit(g: Goal) { editing.value = { ...g, milestones: g.milestones.map(m => ({ ...m })) } }

async function saveEdit() {
  if (!editing.value) return
  await goals.update(editing.value.id, {
    title: editing.value.title,
    desc: editing.value.desc,
    period: editing.value.period,
    domain: editing.value.domain,
    vision: editing.value.vision,
    endDate: editing.value.endDate
  })
  editing.value = null
}

async function addMilestone(g: Goal) {
  const title = prompt('里程碑名称')
  const date = prompt('日期 (YYYY-MM-DD)', todayStr())
  if (title) await goals.addMilestone(g.id, title, date || todayStr())
}

async function setProgress(g: Goal) {
  const v = prompt('进度 0-100', String(g.progress))
  if (v !== null) await goals.setProgress(g.id, Number(v))
}

async function archive(g: Goal) {
  const reason = prompt('为什么放弃？(可选)') || ''
  await goals.archive(g.id, reason)
}
</script>

<template>
  <div class="goals">
    <header class="page-head">
      <div>
        <h1 class="page-title">目标</h1>
        <p class="page-sub">把「想成为什么样的人」拆成可追踪的目标</p>
      </div>
      <button class="btn primary" @click="showNew = !showNew">＋ 新建目标</button>
    </header>

    <div v-if="showNew" class="card new-form">
      <div class="field">
        <input v-model="form.title" class="input" placeholder="目标名称，例如：减重 10 斤" autofocus />
      </div>
      <div class="row">
        <div class="field">
          <label class="label">周期</label>
          <select v-model="form.period" class="select">
            <option value="longterm">长期</option>
            <option value="year">年度</option>
            <option value="quarter">季度</option>
            <option value="month">月度</option>
          </select>
        </div>
        <div class="field grow">
          <label class="label">领域</label>
          <select v-model="form.domain" class="select">
            <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <textarea v-model="form.desc" class="textarea" placeholder="描述（可选）"></textarea>
      </div>
      <div class="actions">
        <button class="btn primary" :disabled="!form.title.trim()" @click="create">创建</button>
        <button class="btn ghost" @click="showNew = false">取消</button>
      </div>
    </div>

    <!-- 活跃目标 -->
    <div class="goal-grid">
      <div v-for="g in list" :key="g.id" class="card goal-card">
        <div class="goal-head">
          <div>
            <span class="tag accent">{{ periodLabels[g.period] }}</span>
            <span class="tag">{{ g.domain }}</span>
          </div>
          <div class="goal-actions">
            <button class="btn ghost sm" @click="startEdit(g)">✎</button>
            <button class="btn ghost sm danger" @click="archive(g)">归档</button>
          </div>
        </div>
        <h3 class="goal-title">{{ g.title }}</h3>
        <p v-if="g.desc" class="goal-desc">{{ g.desc }}</p>

        <div class="progress-wrap" @click="setProgress(g)" title="点击修改进度">
          <div class="progress">
            <div class="progress-fill" :style="{ width: g.progress + '%' }"></div>
          </div>
          <span class="goal-pct">{{ g.progress }}%</span>
        </div>

        <!-- 任务关联 -->
        <div class="goal-stats">
          <span>任务 {{ goalTasks(g.id).done }}/{{ goalTasks(g.id).total }}</span>
          <span>里程碑 {{ g.milestones.filter(m => m.done).length }}/{{ g.milestones.length }}</span>
          <span v-if="g.endDate">截止 {{ relativeDate(g.endDate) }}</span>
        </div>

        <!-- 里程碑 -->
        <div v-if="g.milestones.length" class="milestones">
          <label v-for="m in g.milestones" :key="m.id" class="milestone" @click="goals.toggleMilestone(g.id, m.id)">
            <input type="checkbox" :checked="m.done" />
            <span :class="{ done: m.done }">{{ m.title }}</span>
            <span class="ms-date">{{ m.date }}</span>
          </label>
        </div>

        <button class="btn sm ghost" @click="addMilestone(g)">＋ 里程碑</button>
      </div>
    </div>

    <div v-if="!list.length" class="empty">
      <div class="big">🎯</div>
      还没有目标。先想清楚：今年最想改变什么？
    </div>

    <!-- 归档 -->
    <div v-if="goals.archived.length" class="archived">
      <button class="btn ghost" @click="showArchived = !showArchived">
        {{ showArchived ? '收起' : '展开' }}归档目标 ({{ goals.archived.length }})
      </button>
      <div v-if="showArchived" class="archived-list">
        <div v-for="g in goals.archived" :key="g.id" class="card archived-item">
          <span class="archived-title">{{ g.title }}</span>
          <span v-if="g.abandonedReason" class="meta">原因：{{ g.abandonedReason }}</span>
          <button class="btn sm ghost" @click="goals.unarchive(g.id)">恢复</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="modal" @click.self="editing = null">
      <div class="modal-box card">
        <h3>编辑目标</h3>
        <div class="field"><input v-model="editing.title" class="input" /></div>
        <div class="row">
          <div class="field">
            <label class="label">周期</label>
            <select v-model="editing.period" class="select">
              <option value="longterm">长期</option><option value="year">年度</option>
              <option value="quarter">季度</option><option value="month">月度</option>
            </select>
          </div>
          <div class="field grow">
            <label class="label">领域</label>
            <select v-model="editing.domain" class="select">
              <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
        </div>
        <div class="field"><textarea v-model="editing.desc" class="textarea"></textarea></div>
        <div class="actions">
          <button class="btn primary" @click="saveEdit">保存</button>
          <button class="btn ghost" @click="editing = null">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }

.new-form { margin-bottom: 14px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; }
.field.grow { flex: 1; min-width: 120px; }
.actions { display: flex; gap: 8px; margin-top: 4px; }

.goal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.goal-card { display: flex; flex-direction: column; gap: 8px; }
.goal-head { display: flex; align-items: center; justify-content: space-between; }
.goal-actions { display: flex; gap: 2px; }
.goal-actions .danger { color: var(--red); }
.goal-title { margin: 2px 0 0; font-size: 16px; font-weight: 650; }
.goal-desc { margin: 0; font-size: 13px; color: var(--ink-3); }

.progress-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.progress { flex: 1; height: 9px; background: var(--bg-2); border-radius: 5px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 5px; transition: width .3s; }
.goal-pct { font-size: 13px; font-weight: 650; color: var(--accent); width: 44px; text-align: right; }

.goal-stats { display: flex; gap: 14px; font-size: 12px; color: var(--ink-3); flex-wrap: wrap; }

.milestones { display: flex; flex-direction: column; gap: 5px; margin-top: 2px; }
.milestone { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; padding: 5px 8px; border-radius: 7px; }
.milestone:hover { background: var(--bg-2); }
.milestone input { accent-color: var(--accent); }
.milestone .done { text-decoration: line-through; opacity: .5; }
.ms-date { margin-left: auto; font-size: 11.5px; color: var(--ink-3); }

.archived { margin-top: 18px; }
.archived-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.archived-item { display: flex; align-items: center; gap: 14px; padding: 10px 14px; }
.archived-title { flex: 1; opacity: .6; text-decoration: line-through; }
.meta { font-size: 12px; color: var(--ink-3); }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-box { width: 100%; max-width: 480px; }
.modal-box h3 { margin: 0 0 14px; font-size: 16px; }

@media (max-width: 820px) { .goal-grid { grid-template-columns: 1fr; } }
</style>
