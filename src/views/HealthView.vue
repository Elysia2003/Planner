<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHealthStore } from '@/stores/health'
import { todayStr } from '@/utils'

const health = useHealthStore()

const types = [
  { key: 'weight', name: '体重', unit: 'kg' },
  { key: 'sleep', name: '睡眠', unit: '小时' },
  { key: 'height', name: '身高', unit: 'cm' },
  { key: 'bodyfat', name: '体脂率', unit: '%' },
  { key: 'steps', name: '步数', unit: '步' }
] as const

const activeType = ref<'weight' | 'sleep' | 'height' | 'bodyfat' | 'steps'>('weight')
const value = ref('')
const date = ref(todayStr())
const showVisit = ref(false)

const visitForm = ref({ date: todayStr(), hospital: '', doctor: '', diagnosis: '', prescription: '', note: '' })

const typeLabel = computed(() => types.find(t => t.key === activeType.value)!)
const records = computed(() =>
  health.records.filter(r => r.type === activeType.value).sort((a, b) => b.date.localeCompare(a.date))
)
const latest = computed(() => health.latest(activeType.value))

// 喝水
const waterToday = computed(() => health.todayWater(todayStr()))
async function drinkWater() {
  await health.addWater(todayStr(), 1)
}
async function reduceWater() {
  await health.addWater(todayStr(), -1)
}
async function adjustWater() {
  const v = prompt('手动设置今日喝水杯数（用于纠错）', String(waterToday.value))
  if (v === null) return
  const n = Number(v)
  if (isNaN(n)) { alert('请输入数字'); return }
  await health.setWater(todayStr(), n)
}

// BMI（自动计算）
const bmi = computed(() => health.bmi)
function bmiLabel(v: number): string {
  if (v < 18.5) return '偏瘦'
  if (v < 24) return '正常'
  if (v < 28) return '偏胖'
  return '肥胖'
}
const statusClass = computed(() => {
  const v = bmi.value
  if (v === null) return 'normal'
  if (v < 18.5) return 'thin'
  if (v < 24) return 'normal'
  if (v < 28) return 'over'
  return 'obese'
})

// 就诊删除
async function removeVisit(id: string) {
  if (!confirm('确定删除这条就诊记录？')) return
  await health.removeVisit(id)
}

async function save() {
  const v = Number(value.value)
  if (!v) return
  await health.record(activeType.value, v, typeLabel.value.unit, date.value)
  value.value = ''
}

async function addVisit() {
  if (!visitForm.value.hospital && !visitForm.value.diagnosis) return
  await health.addVisit({ ...visitForm.value })
  visitForm.value = { date: todayStr(), hospital: '', doctor: '', diagnosis: '', prescription: '', note: '' }
  showVisit.value = false
}
</script>

<template>
  <div class="health">
    <header class="page-head">
      <div>
        <h1 class="page-title">健康</h1>
        <p class="page-sub">身体是最重要的资产</p>
      </div>
      <button class="btn primary" @click="showVisit = !showVisit">＋ 记录就诊</button>
    </header>

    <!-- 喝水快捷按钮 -->
    <div class="card water-card">
      <div class="water-info">
        <span class="water-emoji">💧</span>
        <div class="water-text">
          <span class="water-label">今日饮水</span>
          <span class="water-count">{{ waterToday }} <em>杯</em></span>
        </div>
      </div>
      <div class="water-actions">
        <button class="btn water-btn" title="减一杯" @click="reduceWater">−1</button>
        <button class="btn primary water-btn" @click="drinkWater">＋ 喝一杯</button>
        <button class="btn ghost sm" title="手动设置" @click="adjustWater">调整</button>
      </div>
    </div>

    <!-- BMI 自动计算 -->
    <div class="card bmi-card" v-if="bmi !== null">
      <div class="bmi-info">
        <span class="bmi-label">BMI</span>
        <span class="bmi-value">{{ bmi.toFixed(1) }}</span>
        <span class="bmi-status" :class="'bmi-' + statusClass">{{ bmiLabel(bmi) }}</span>
      </div>
      <span class="bmi-note">根据最新身高、体重自动计算</span>
    </div>

    <!-- 类型切换 -->
    <div class="tabs">
      <button
        v-for="t in types" :key="t.key"
        class="tab" :class="{ on: activeType === t.key }"
        @click="activeType = t.key"
      >{{ t.name }}</button>
    </div>

    <!-- 当前值 + 输入 -->
    <div class="card record-card">
      <div class="current">
        <span class="current-label">最近{{ typeLabel.name }}</span>
        <span class="current-value">
          {{ latest ? latest.value + ' ' + latest.unit : '—' }}
          <span v-if="latest" class="current-date">（{{ latest.date }}）</span>
        </span>
      </div>
      <div class="row">
        <div class="field grow">
          <input v-model="value" type="number" step="0.1" class="input" :placeholder="'输入' + typeLabel.name + (typeLabel.unit ? '（' + typeLabel.unit + '）' : '')" />
        </div>
        <div class="field">
          <input v-model="date" type="date" class="input" />
        </div>
        <button class="btn primary" :disabled="!Number(value)" @click="save">记录</button>
      </div>
    </div>

    <!-- 历史 -->
    <div class="card">
      <h2 class="card-title">历史记录</h2>
      <div class="record-list">
        <div v-for="r in records.slice(0, 30)" :key="r.id" class="record-row">
          <span class="record-val">{{ r.value }} {{ r.unit }}</span>
          <span class="record-date">{{ r.date }}</span>
          <button class="btn ghost sm danger" @click="health.removeRecord(r.id)">🗑</button>
        </div>
        <div v-if="!records.length" class="empty">还没有记录</div>
      </div>
    </div>

    <!-- 就诊记录 -->
    <div v-if="health.visits.length" class="card">
      <h2 class="card-title">就诊记录</h2>
      <div class="visit-list">
        <div v-for="v in health.visits" :key="v.id" class="visit-item">
          <div class="visit-head">
            <span class="visit-date">{{ v.date }}</span>
            <span class="visit-hospital">{{ v.hospital }}</span>
            <span class="visit-doctor">{{ v.doctor }}</span>
            <button class="btn ghost sm danger" @click="removeVisit(v.id)">🗑</button>
          </div>
          <div v-if="v.diagnosis" class="visit-diag">诊断：{{ v.diagnosis }}</div>
          <div v-if="v.prescription" class="visit-pres">处方：{{ v.prescription }}</div>
        </div>
      </div>
    </div>

    <!-- 就诊弹窗 -->
    <div v-if="showVisit" class="modal" @click.self="showVisit = false">
      <div class="modal-box card">
        <h3>记录就诊</h3>
        <div class="row">
          <div class="field">
            <label class="label">日期</label>
            <input v-model="visitForm.date" type="date" class="input" />
          </div>
          <div class="field grow">
            <label class="label">医院</label>
            <input v-model="visitForm.hospital" class="input" />
          </div>
        </div>
        <div class="field">
          <label class="label">医生</label>
          <input v-model="visitForm.doctor" class="input" />
        </div>
        <div class="field">
          <label class="label">诊断</label>
          <input v-model="visitForm.diagnosis" class="input" />
        </div>
        <div class="field">
          <label class="label">处方/用药</label>
          <textarea v-model="visitForm.prescription" class="textarea"></textarea>
        </div>
        <div class="actions">
          <button class="btn primary" @click="addVisit">保存</button>
          <button class="btn ghost" @click="showVisit = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }

.tabs { display: flex; gap: 4px; background: var(--bg-2); padding: 3px; border-radius: 9px; margin-bottom: 14px; flex-wrap: wrap; width: fit-content; }
.tab { border: none; background: transparent; cursor: pointer; padding: 6px 16px; border-radius: 7px; font-size: 13px; color: var(--ink-2); }
.tab.on { background: var(--panel); color: var(--ink); font-weight: 600; box-shadow: var(--shadow); }

.record-card { margin-bottom: 14px; }
.water-card {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; padding: 16px;
}
.water-info { display: flex; align-items: center; gap: 12px; }
.water-emoji { font-size: 30px; line-height: 1; }
.water-text { display: flex; flex-direction: column; }
.water-label { font-size: 12.5px; color: var(--ink-3); }
.water-count { font-size: 26px; font-weight: 650; color: var(--accent); }
.water-count em { font-style: normal; font-size: 14px; font-weight: 500; color: var(--ink-3); }
.water-actions { display: flex; align-items: center; gap: 8px; }
.water-btn { font-size: 14px; padding: 10px 16px; }

.bmi-card {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; padding: 14px 16px;
}
.bmi-info { display: flex; align-items: baseline; gap: 10px; }
.bmi-label { font-size: 13px; color: var(--ink-3); font-weight: 600; }
.bmi-value { font-size: 26px; font-weight: 650; color: var(--accent); }
.bmi-status { font-size: 12.5px; font-weight: 600; padding: 2px 10px; border-radius: 999px; }
.bmi-thin { background: var(--amber-soft); color: var(--amber); }
.bmi-normal { background: var(--green-soft); color: var(--green); }
.bmi-over { background: var(--amber-soft); color: var(--amber); }
.bmi-obese { background: var(--red-soft); color: var(--red); }
.bmi-note { font-size: 12px; color: var(--ink-3); }

.current { margin-bottom: 12px; }
.current-label { font-size: 13px; color: var(--ink-3); display: block; }
.current-value { font-size: 30px; font-weight: 650; }
.current-date { font-size: 13px; color: var(--ink-3); font-weight: 400; }
.row { display: flex; gap: 10px; align-items: flex-end; }
.field.grow { flex: 1; }

.card-title { font-size: 15px; margin: 0 0 12px; font-weight: 650; }
.record-list { display: flex; flex-direction: column; }
.record-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 13.5px; }
.record-val { font-weight: 600; }
.record-date { flex: 1; color: var(--ink-3); font-size: 12px; }
.record-row .danger { color: var(--red); }

.visit-list { display: flex; flex-direction: column; gap: 10px; }
.visit-item { padding: 10px 12px; background: var(--bg-2); border-radius: 9px; }
.visit-head { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.visit-date { color: var(--ink-3); }
.visit-hospital { font-weight: 600; }
.visit-doctor { color: var(--ink-2); flex: 1; }
.visit-head .danger { color: var(--red); }
.visit-diag, .visit-pres { font-size: 12.5px; color: var(--ink-2); margin-top: 3px; }

.actions { display: flex; gap: 8px; margin-top: 4px; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-box { width: 100%; max-width: 480px; }
.modal-box h3 { margin: 0 0 14px; font-size: 16px; }
</style>
