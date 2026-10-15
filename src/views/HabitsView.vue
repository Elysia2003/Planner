<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHabitStore } from '@/stores/habits'
import { todayStr, addDays, weekday } from '@/utils'
import type { Habit } from '@/types'

const habits = useHabitStore()
const showNew = ref(false)
const editing = ref<Habit | null>(null)

const form = ref({
  title: '',
  freq: 'daily' as 'daily' | 'weekly',
  weeklyTarget: 7,
  allowMiss: 0,
  group: '其他',
  remindTime: ''
})

const groups = ['身体', '认知', '社交', '财务', '其他']

const active = computed(() => habits.active)

async function create() {
  if (!form.value.title.trim()) return
  await habits.create({
    ...form.value,
    remindTimes: form.value.remindTime ? [form.value.remindTime] : []
  })
  form.value.title = ''
  form.value.remindTime = ''
  showNew.value = false
}

function startEdit(h: Habit) { editing.value = { ...h } }
async function saveEdit() {
  if (!editing.value) return
  await habits.update(editing.value.id, {
    title: editing.value.title,
    freq: editing.value.freq,
    weeklyTarget: editing.value.weeklyTarget,
    allowMiss: editing.value.allowMiss,
    group: editing.value.group
  })
  editing.value = null
}

async function remove(h: Habit) {
  if (confirm(`删除习惯「${h.title}」及所有打卡记录？`)) await habits.remove(h.id)
}

async function recordMiss(h: Habit) {
  const reason = prompt('为什么没做到？(帮助找到真实阻力)')
  if (reason !== null && reason.trim() !== '') await habits.recordMiss(h.id, todayStr(), reason.trim())
}

// 今日未完成原因
function todayMissReason(h: Habit): string {
  return habits.missReasonOf(h.id, todayStr())
}

// 近 84 天（12 周）热力图数据，区分已完成/未完成/无记录
function heatmap(habitId: string) {
  const done = new Set(habits.datesOf(habitId))
  const days: { date: string; state: 'done' | 'miss' | 'none'; reason: string }[] = []
  for (let i = 83; i >= 0; i--) {
    const d = addDays(todayStr(), -i)
    if (done.has(d)) {
      days.push({ date: d, state: 'done', reason: '' })
    } else {
      const reason = habits.missReasonOf(habitId, d)
      days.push({ date: d, state: reason ? 'miss' : 'none', reason })
    }
  }
  return days
}
</script>

<template>
  <div class="habits">
    <header class="page-head">
      <div>
        <h1 class="page-title">习惯</h1>
        <p class="page-sub">每天一点点，复利成长期改变</p>
      </div>
      <button class="btn primary" @click="showNew = !showNew">＋ 新建习惯</button>
    </header>

    <div v-if="showNew" class="card new-form">
      <div class="field">
        <input v-model="form.title" class="input" placeholder="习惯名称，例如：每天喝 8 杯水" autofocus />
      </div>
      <div class="row">
        <div class="field">
          <label class="label">频率</label>
          <select v-model="form.freq" class="select">
            <option value="daily">每天</option>
            <option value="weekly">每周 N 次</option>
          </select>
        </div>
        <div class="field" v-if="form.freq === 'weekly'">
          <label class="label">每周目标次数</label>
          <input v-model.number="form.weeklyTarget" type="number" min="1" max="7" class="input" />
        </div>
        <div class="field">
          <label class="label">分组</label>
          <select v-model="form.group" class="select">
            <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="label">提醒时间（可选，HH:mm）</label>
        <input v-model="form.remindTime" type="time" class="input" />
      </div>
      <div class="actions">
        <button class="btn primary" :disabled="!form.title.trim()" @click="create">创建</button>
        <button class="btn ghost" @click="showNew = false">取消</button>
      </div>
    </div>

    <div class="habit-list">
      <div v-for="h in active" :key="h.id" class="card habit-card">
        <div class="habit-main">
          <div class="habit-head">
            <span class="habit-dot" :style="{ background: h.color }"></span>
            <span class="habit-title">{{ h.title }}</span>
            <span class="tag">{{ h.group }}</span>
            <span class="tag accent" v-if="h.freq === 'weekly'">每周 {{ habits.weekCount(h.id) }}/{{ h.weeklyTarget }}</span>
            <span class="habit-streak" v-if="habits.streak(h.id).current > 0">
              🔥 {{ habits.streak(h.id).current }} 天
            </span>
            <div class="habit-actions">
              <button class="btn ghost sm" @click="startEdit(h)">✎</button>
              <button class="btn ghost sm danger" @click="remove(h)">🗑</button>
            </div>
          </div>

          <div class="habit-body">
            <button
              class="check-btn"
              :class="{ on: habits.checkedToday(h.id) }"
              :style="habits.checkedToday(h.id) ? { background: h.color, borderColor: h.color } : {}"
              @click="habits.toggleCheckin(h.id, todayStr())"
            >
              {{ habits.checkedToday(h.id) ? '✓ 已打卡' : '打卡' }}
            </button>
            <button v-if="!habits.checkedToday(h.id) && !todayMissReason(h)" class="btn sm ghost" @click="recordMiss(h)">记录没做到的原因</button>
            <div v-if="todayMissReason(h)" class="miss-box">
              <span class="miss-emoji">😔</span>
              <span class="miss-text">今天未完成：{{ todayMissReason(h) }}</span>
              <button class="btn sm ghost" @click="recordMiss(h)">修改</button>
            </div>
          </div>

          <!-- 热力图 -->
          <div class="heatmap">
            <div
              v-for="d in heatmap(h.id)" :key="d.date"
              class="heat-cell"
              :class="d.state"
              :style="d.state === 'done' ? { background: h.color } : {}"
              :title="d.date + ' ' + weekday(d.date) + (d.state === 'miss' ? ' · 未完成：' + d.reason : d.state === 'done' ? ' · 已完成' : '')"
            ></div>
          </div>
          <div class="heatmap-legend">
            <span>84 天前</span>
            <span>今天</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!active.length" class="empty">
      <div class="big">🔥</div>
      还没有习惯。从一个最小的行动开始吧
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="modal" @click.self="editing = null">
      <div class="modal-box card">
        <h3>编辑习惯</h3>
        <div class="field"><input v-model="editing.title" class="input" /></div>
        <div class="row">
          <div class="field">
            <label class="label">频率</label>
            <select v-model="editing.freq" class="select">
              <option value="daily">每天</option>
              <option value="weekly">每周 N 次</option>
            </select>
          </div>
          <div class="field" v-if="editing.freq === 'weekly'">
            <label class="label">每周目标</label>
            <input v-model.number="editing.weeklyTarget" type="number" min="1" max="7" class="input" />
          </div>
          <div class="field">
            <label class="label">弹性（允许漏几次）</label>
            <input v-model.number="editing.allowMiss" type="number" min="0" max="7" class="input" />
          </div>
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

.habit-list { display: flex; flex-direction: column; gap: 12px; }
.habit-card { padding: 16px; }
.habit-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.habit-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.habit-title { font-size: 15px; font-weight: 650; }
.habit-streak { font-size: 12.5px; color: var(--amber); font-weight: 600; }
.habit-actions { margin-left: auto; display: flex; gap: 2px; }
.habit-actions .danger { color: var(--red); }

.habit-body { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
.check-btn {
  padding: 9px 20px; border-radius: 9px; cursor: pointer;
  border: 1.5px solid var(--line); background: var(--bg-2); color: var(--ink-2);
  font-size: 14px; font-weight: 600; transition: .15s;
}
.check-btn:hover { border-color: var(--accent); }
.check-btn.on { color: #fff; }

.heatmap { display: grid; grid-template-columns: repeat(28, 1fr); gap: 3px; margin-top: 4px; }
.heat-cell { aspect-ratio: 1; border-radius: 3px; background: var(--bg-2); }
.heat-cell.miss { background: var(--red-soft); border: 1px solid var(--red); }
.heatmap-legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-3); margin-top: 5px; }

.miss-box {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 8px;
  background: var(--red-soft); border: 1px solid var(--red-soft);
}
.miss-emoji { font-size: 15px; }
.miss-text { font-size: 13px; color: var(--red); font-weight: 500; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-box { width: 100%; max-width: 480px; }
.modal-box h3 { margin: 0 0 14px; font-size: 16px; }
</style>
