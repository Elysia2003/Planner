<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { useSettingsStore } from '@/stores/settings'
import { todayStr, fenToYuan, yuanToFen } from '@/utils'
import * as echarts from 'echarts'

const finance = useFinanceStore()
const settings = useSettingsStore()

const showNew = ref(false)
const chartEl = ref<HTMLElement | null>(null)

const form = ref({
  type: 'expense' as 'income' | 'expense',
  amount: '',
  category: '餐饮',
  account: '现金',
  note: '',
  date: todayStr()
})

const cats = computed(() => settings.categories)

async function add() {
  const amount = Number(form.value.amount)
  if (!amount || amount <= 0) return
  await finance.addTransaction({
    type: form.value.type,
    amount: yuanToFen(amount),
    category: form.value.category,
    account: form.value.account,
    note: form.value.note,
    date: form.value.date
  })
  form.value.amount = ''
  form.value.note = ''
  showNew.value = false
}

// 近期交易（倒序）
const recent = computed(() =>
  [...finance.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 30)
)

function del(id: string) {
  if (confirm('删除这笔记录？')) finance.removeTransaction(id)
}

// 图表
async function renderChart() {
  await nextTick()
  if (!chartEl.value) return
  const chart = echarts.init(chartEl.value)
  const data = finance.categoryBreakdown
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const textColor = isDark ? '#b8bec6' : '#4a5158'
  chart.setOption({
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ¥${fenToYuan(p.value)} (${p.percent}%)` },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: isDark ? '#1f2329' : '#fff', borderWidth: 2 },
      label: { color: textColor, fontSize: 12 },
      data: data.map(d => ({ name: d.category, value: d.amount }))
    }]
  })
  return chart
}

onMounted(() => renderChart())
watch(() => finance.transactions.length, () => renderChart())
watch(() => settings.isDark, () => renderChart())

// 预算
const budgetInput = ref('')
async function setBudget() {
  const v = Number(budgetInput.value)
  if (v > 0) {
    const m = new Date().toISOString().slice(0, 7)
    await finance.setBudget(m, '', yuanToFen(v))
    budgetInput.value = ''
  }
}

// 储蓄目标
const savingForm = ref({ title: '', targetAmount: '', savedAmount: '' })
async function addSaving() {
  if (!savingForm.value.title) return
  await finance.addSavingGoal({
    title: savingForm.value.title,
    targetAmount: yuanToFen(Number(savingForm.value.targetAmount) || 0),
    savedAmount: yuanToFen(Number(savingForm.value.savedAmount) || 0)
  })
  savingForm.value = { title: '', targetAmount: '', savedAmount: '' }
}

// 订阅
const subForm = ref({ name: '', amount: '', nextChargeDate: '' })
async function addSub() {
  if (!subForm.value.name) return
  await finance.addSubscription({
    name: subForm.value.name,
    amount: yuanToFen(Number(subForm.value.amount) || 0),
    nextChargeDate: subForm.value.nextChargeDate
  })
  subForm.value = { name: '', amount: '', nextChargeDate: '' }
}
</script>

<template>
  <div class="finance">
    <header class="page-head">
      <div>
        <h1 class="page-title">财务</h1>
        <p class="page-sub">知道钱花在哪，才谈得上规划</p>
      </div>
      <button class="btn primary" @click="showNew = !showNew">＋ 记一笔</button>
    </header>

    <!-- 概览 -->
    <div class="overview">
      <div class="ov-card">
        <span class="ov-num">¥{{ fenToYuan(finance.monthExpense) }}</span>
        <span class="ov-label">本月支出</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">¥{{ fenToYuan(finance.monthIncome) }}</span>
        <span class="ov-label">本月收入</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">¥{{ fenToYuan(finance.monthIncome - finance.monthExpense) }}</span>
        <span class="ov-label">本月结余</span>
      </div>
      <div class="ov-card">
        <span class="ov-num">{{ finance.monthBudget ? Math.round(finance.monthExpense / finance.monthBudget * 100) : 0 }}%</span>
        <span class="ov-label">预算使用率</span>
      </div>
    </div>

    <!-- 记一笔 -->
    <div v-if="showNew" class="card new-form">
      <div class="row">
        <div class="field">
          <label class="label">类型</label>
          <select v-model="form.type" class="select">
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </div>
        <div class="field grow">
          <label class="label">金额（元）</label>
          <input v-model="form.amount" type="number" min="0" step="0.01" class="input" placeholder="0.00" />
        </div>
        <div class="field grow">
          <label class="label">分类</label>
          <select v-model="form.category" class="select">
            <option v-for="c in cats" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="field">
          <label class="label">日期</label>
          <input v-model="form.date" type="date" class="input" />
        </div>
      </div>
      <div class="row">
        <div class="field grow">
          <label class="label">账户</label>
          <select v-model="form.account" class="select">
            <option v-for="a in finance.accounts" :key="a.id" :value="a.name">{{ a.name }}</option>
            <option value="现金">现金</option>
            <option value="银行卡">银行卡</option>
            <option value="支付宝">支付宝</option>
            <option value="微信">微信</option>
          </select>
        </div>
        <div class="field grow">
          <label class="label">备注</label>
          <input v-model="form.note" class="input" placeholder="可选" />
        </div>
      </div>
      <div class="actions">
        <button class="btn primary" :disabled="!Number(form.amount)" @click="add">保存</button>
        <button class="btn ghost" @click="showNew = false">取消</button>
      </div>
    </div>

    <div class="grid">
      <!-- 分类饼图 -->
      <section class="card">
        <h2 class="card-title">本月支出结构</h2>
        <div v-if="finance.categoryBreakdown.length" ref="chartEl" class="chart"></div>
        <div v-else class="empty">本月还没有支出记录</div>
      </section>

      <!-- 预算 -->
      <section class="card">
        <h2 class="card-title">本月预算</h2>
        <div v-if="finance.monthBudget" class="budget-info">
          <div class="budget-row">
            <span>已用 ¥{{ fenToYuan(finance.monthExpense) }}</span>
            <span>预算 ¥{{ fenToYuan(finance.monthBudget) }}</span>
          </div>
          <div class="progress">
            <div class="progress-fill" :class="{ over: finance.monthExpense > finance.monthBudget }"
              :style="{ width: Math.min(100, finance.monthExpense / finance.monthBudget * 100) + '%' }"></div>
          </div>
        </div>
        <div v-else class="empty">未设置预算</div>
        <div class="budget-set">
          <input v-model="budgetInput" type="number" class="input" placeholder="设置月预算（元）" />
          <button class="btn primary sm" @click="setBudget">设置</button>
        </div>
      </section>

      <!-- 储蓄目标 -->
      <section class="card">
        <h2 class="card-title">储蓄目标</h2>
        <div v-if="finance.savingGoals.length" class="saving-list">
          <div v-for="s in finance.savingGoals" :key="s.id" class="saving-item">
            <div class="saving-head">
              <span class="saving-title">{{ s.title }}</span>
              <span class="saving-amt">¥{{ fenToYuan(s.savedAmount) }} / ¥{{ fenToYuan(s.targetAmount) }}</span>
            </div>
            <div class="progress">
              <div class="progress-fill" :style="{ width: (s.targetAmount ? s.savedAmount / s.targetAmount * 100 : 0) + '%' }"></div>
            </div>
          </div>
        </div>
        <div class="row saving-add">
          <input v-model="savingForm.title" class="input" placeholder="目标名称" />
          <input v-model="savingForm.targetAmount" type="number" class="input" placeholder="目标金额" />
          <button class="btn primary sm" @click="addSaving">添加</button>
        </div>
      </section>

      <!-- 订阅提醒 -->
      <section class="card">
        <h2 class="card-title">订阅服务</h2>
        <div v-if="finance.upcomingSubscriptions.length" class="sub-list">
          <div v-for="s in finance.upcomingSubscriptions" :key="s.id" class="sub-item">
            <span class="sub-name">{{ s.name }}</span>
            <span class="sub-amt">¥{{ fenToYuan(s.amount) }}/{{ s.cycle === 'monthly' ? '月' : '年' }}</span>
            <span class="sub-date">下次扣款 {{ s.nextChargeDate }}</span>
          </div>
        </div>
        <div class="row sub-add">
          <input v-model="subForm.name" class="input" placeholder="订阅名" />
          <input v-model="subForm.amount" type="number" class="input" placeholder="金额" />
          <input v-model="subForm.nextChargeDate" type="date" class="input" />
          <button class="btn primary sm" @click="addSub">添加</button>
        </div>
      </section>
    </div>

    <!-- 交易明细 -->
    <section class="card transactions">
      <h2 class="card-title">最近交易</h2>
      <div class="tx-list">
        <div v-for="t in recent" :key="t.id" class="tx-row">
          <span class="tx-cat">{{ t.category }}</span>
          <span class="tx-note">{{ t.note }}</span>
          <span class="tx-date">{{ t.date }}</span>
          <span class="tx-amt" :class="t.type === 'income' ? 'income' : 'expense'">
            {{ t.type === 'income' ? '+' : '-' }}¥{{ fenToYuan(t.amount) }}
          </span>
          <button class="btn ghost sm danger" @click="del(t.id)">🗑</button>
        </div>
        <div v-if="!recent.length" class="empty">还没有交易记录</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }

.overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.ov-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; box-shadow: var(--shadow); }
.ov-num { font-size: 20px; font-weight: 650; }
.ov-label { font-size: 12px; color: var(--ink-3); }

.new-form { margin-bottom: 14px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.field.grow { flex: 1; min-width: 110px; }
.actions { display: flex; gap: 8px; margin-top: 12px; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.card-title { font-size: 15px; margin: 0 0 12px; font-weight: 650; }
.chart { height: 220px; }

.budget-info { margin-bottom: 12px; }
.budget-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--ink-2); margin-bottom: 8px; }
.progress { height: 9px; background: var(--bg-2); border-radius: 5px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 5px; transition: width .3s; }
.progress-fill.over { background: var(--red); }
.budget-set { display: flex; gap: 8px; margin-top: 12px; }

.saving-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.saving-item { display: flex; flex-direction: column; gap: 6px; }
.saving-head { display: flex; justify-content: space-between; font-size: 13px; }
.saving-title { font-weight: 600; }
.saving-amt { color: var(--ink-2); }
.saving-add { margin-top: 4px; }

.sub-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.sub-item { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--line-2); }
.sub-name { font-weight: 600; }
.sub-amt { color: var(--ink-2); }
.sub-date { margin-left: auto; color: var(--amber); font-size: 12px; }
.sub-add { margin-top: 4px; }

.transactions { margin-bottom: 14px; }
.tx-list { display: flex; flex-direction: column; }
.tx-row { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line-2); font-size: 13px; }
.tx-cat { font-weight: 600; min-width: 50px; }
.tx-note { flex: 1; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-date { color: var(--ink-3); font-size: 12px; }
.tx-amt { font-weight: 650; white-space: nowrap; }
.tx-amt.expense { color: var(--red); }
.tx-amt.income { color: var(--green); }
.tx-row .danger { color: var(--red); }

@media (max-width: 820px) {
  .overview { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
</style>
