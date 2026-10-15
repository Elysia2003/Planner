<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { todayStr, relativeDate } from '@/utils'
import type { Task, Priority } from '@/types'

const tasks = useTaskStore()
const goals = useGoalStore()

const filter = ref<'today' | 'all' | 'done' | 'trash'>('today')
const search = ref('')
const showNew = ref(false)
const editing = ref<Task | null>(null)

// 新建表单
const form = ref({
  title: '',
  note: '',
  dueDate: '',
  priority: 1 as Priority,
  tags: [] as string[],
  goalId: null as string | null
})

const list = computed(() => {
  let arr: Task[] = []
  switch (filter.value) {
    case 'today': arr = tasks.today; break
    case 'all': arr = tasks.active; break
    case 'done': arr = tasks.done; break
    case 'trash': arr = tasks.trash; break
  }
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    arr = arr.filter(t => t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q))
  }
  return arr.sort((a, b) => {
    const pa = a.priority - b.priority
    if (pa !== 0) return pa
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return b.createdAt - a.createdAt
  })
})

const filters = [
  { key: 'today', label: '今日' },
  { key: 'all', label: '全部' },
  { key: 'done', label: '已完成' },
  { key: 'trash', label: '回收站' }
] as const

function prioLabel(p: number) { return ['P0', 'P1', 'P2', 'P3'][p] || '' }

async function createTask() {
  if (!form.value.title.trim()) return
  await tasks.create({ ...form.value, status: 'todo' })
  form.value.title = ''
  form.value.note = ''
  form.value.tags = []
  showNew.value = false
}

async function toggleStatus(t: Task) {
  await tasks.setStatus(t.id, t.status === 'done' ? 'todo' : 'done')
}

async function toggleSubtask(t: Task, subId: string) {
  await tasks.toggleSubtask(t.id, subId)
}

async function addSubtask(t: Task) {
  const title = prompt('子任务名称')
  if (title) await tasks.addSubtask(t.id, title)
}

async function remove(t: Task) {
  if (filter.value === 'trash') {
    if (confirm('彻底删除？不可恢复。')) await tasks.hardDelete(t.id)
  } else {
    await tasks.softDelete(t.id)
  }
}

async function restore(t: Task) {
  await tasks.restore(t.id)
}

function edit(t: Task) {
  editing.value = { ...t }
}

async function saveEdit() {
  if (!editing.value) return
  await tasks.update(editing.value.id, { ...editing.value })
  editing.value = null
}

function goalTitle(id: string | null) {
  if (!id) return ''
  return goals.goals.find(g => g.id === id)?.title || ''
}
</script>

<template>
  <div class="tasks">
    <header class="page-head">
      <div>
        <h1 class="page-title">任务</h1>
        <p class="page-sub">收集 → 排期 → 执行 → 完成</p>
      </div>
      <button class="btn primary" @click="showNew = !showNew">＋ 新建任务</button>
    </header>

    <!-- 新建任务表单 -->
    <div v-if="showNew" class="card new-form">
      <div class="field">
        <input v-model="form.title" class="input" placeholder="要做什么？" @keyup.enter="createTask" autofocus />
      </div>
      <div class="row">
        <div class="field grow">
          <input v-model="form.dueDate" type="date" class="input" />
        </div>
        <div class="field">
          <select v-model="form.priority" class="select">
            <option :value="0">P0 最高</option>
            <option :value="1">P1 高</option>
            <option :value="2">P2 中</option>
            <option :value="3">P3 低</option>
          </select>
        </div>
        <div class="field grow">
          <select v-model="form.goalId" class="select">
            <option :value="null">不关联目标</option>
            <option v-for="g in goals.topGoals" :key="g.id" :value="g.id">{{ g.title }}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <input v-model="form.note" class="input" placeholder="备注（可选）" />
      </div>
      <div class="actions">
        <button class="btn primary" :disabled="!form.title.trim()" @click="createTask">添加</button>
        <button class="btn ghost" @click="showNew = false">取消</button>
      </div>
    </div>

    <!-- 过滤 + 搜索 -->
    <div class="toolbar">
      <div class="tabs">
        <button
          v-for="f in filters" :key="f.key"
          class="tab" :class="{ on: filter === f.key }"
          @click="filter = f.key"
        >{{ f.label }}</button>
      </div>
      <input v-model="search" class="input search" placeholder="搜索任务…" />
    </div>

    <!-- 任务列表 -->
    <div class="task-list">
      <div v-for="t in list" :key="t.id" class="card task-item">
        <input
          type="checkbox"
          :checked="t.status === 'done'"
          :disabled="filter === 'trash'"
          @change="toggleStatus(t)"
        />
        <div class="task-body">
          <div class="task-line">
            <span class="task-title" :class="{ done: t.status === 'done' }">{{ t.title }}</span>
            <span class="tag" :class="'pri' + t.priority">{{ prioLabel(t.priority) }}</span>
            <span v-if="t.goalId" class="tag accent">🎯 {{ goalTitle(t.goalId) }}</span>
            <span v-for="tag in t.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="task-meta">
            <span v-if="t.dueDate" class="meta" :class="{ overdue: t.dueDate < todayStr() && t.status !== 'done' }">
              📅 {{ relativeDate(t.dueDate) }}
            </span>
            <span v-if="t.note" class="meta">📝 {{ t.note }}</span>
            <span v-if="t.subtasks.length" class="meta">
              ☑ {{ t.subtasks.filter(s => s.done).length }}/{{ t.subtasks.length }}
            </span>
          </div>
          <!-- 子任务 -->
          <div v-if="t.subtasks.length" class="subtasks">
            <label v-for="s in t.subtasks" :key="s.id" class="subtask">
              <input type="checkbox" :checked="s.done" @change="toggleSubtask(t, s.id)" />
              <span :class="{ done: s.done }">{{ s.title }}</span>
            </label>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn ghost sm" title="加子任务" @click="addSubtask(t)">＋</button>
          <button class="btn ghost sm" title="编辑" @click="edit(t)">✎</button>
          <button v-if="filter !== 'trash'" class="btn ghost sm danger" title="删除" @click="remove(t)">🗑</button>
          <button v-else class="btn sm primary" @click="restore(t)">恢复</button>
        </div>
      </div>
      <div v-if="!list.length" class="empty">
        <div class="big">📭</div>
        <span v-if="filter === 'today'">今天没有任务，轻松一天 ✨</span>
        <span v-else>没有任务</span>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="modal" @click.self="editing = null">
      <div class="modal-box card">
        <h3>编辑任务</h3>
        <div class="field">
          <input v-model="editing.title" class="input" />
        </div>
        <div class="row">
          <div class="field grow">
            <label class="label">截止日期</label>
            <input v-model="editing.dueDate" type="date" class="input" />
          </div>
          <div class="field">
            <label class="label">优先级</label>
            <select v-model="editing.priority" class="select">
              <option :value="0">P0</option><option :value="1">P1</option>
              <option :value="2">P2</option><option :value="3">P3</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label class="label">备注</label>
          <textarea v-model="editing.note" class="textarea"></textarea>
        </div>
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

.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.tabs { display: flex; gap: 4px; background: var(--bg-2); padding: 3px; border-radius: 9px; }
.tab {
  border: none; background: transparent; cursor: pointer;
  padding: 6px 14px; border-radius: 7px; font-size: 13px; color: var(--ink-2);
}
.tab.on { background: var(--panel); color: var(--ink); font-weight: 600; box-shadow: var(--shadow); }
.search { flex: 1; max-width: 260px; }

.task-list { display: flex; flex-direction: column; gap: 10px; }
.task-item { display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; }
.task-item > input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--accent); cursor: pointer; margin-top: 2px; }
.task-body { flex: 1; min-width: 0; }
.task-line { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.task-title { font-size: 14.5px; font-weight: 560; }
.task-title.done { text-decoration: line-through; opacity: .5; }
.task-meta { display: flex; gap: 12px; margin-top: 3px; flex-wrap: wrap; }
.meta { font-size: 12px; color: var(--ink-3); }
.meta.overdue { color: var(--red); font-weight: 600; }
.subtasks { margin-top: 8px; padding: 8px 10px; background: var(--bg-2); border-radius: 8px; display: flex; flex-direction: column; gap: 5px; }
.subtask { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.subtask input { accent-color: var(--accent); }
.subtask .done { text-decoration: line-through; opacity: .5; }
.task-actions { display: flex; gap: 2px; flex: none; }
.task-actions .danger { color: var(--red); }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-box { width: 100%; max-width: 480px; }
.modal-box h3 { margin: 0 0 14px; font-size: 16px; }
</style>
