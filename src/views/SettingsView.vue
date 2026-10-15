<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { exportAll, importAll, clearAll } from '@/db'
import { downloadJson, downloadFile, todayStr } from '@/utils'
import type { BackupPayload } from '@/types'

const settings = useSettingsStore()
const fileInput = ref<HTMLInputElement | null>(null)

const themes = [
  { key: 'light', name: '浅色' },
  { key: 'dark', name: '深色' },
  { key: 'system', name: '跟随系统' }
] as const

async function doExportJson() {
  const payload = await exportAll()
  downloadJson(`生活规划-备份-${todayStr()}.json`, payload)
}

async function doExportMarkdown() {
  const payload = await exportAll()
  const L: string[] = []
  L.push('# 生活规划 · 数据导出', '', `导出时间：${new Date().toLocaleString()}`, '')
  if (payload.goals.length) {
    L.push('## 目标')
    payload.goals.filter(g => !g.archived).forEach(g => {
      L.push(`- ${g.title}（进度 ${g.progress}%，${g.domain}）`)
    })
    L.push('')
  }
  if (payload.tasks.length) {
    L.push('## 任务')
    payload.tasks.filter(t => !t.deletedAt && t.status !== 'done').forEach(t => {
      L.push(`- [${t.status === 'done' ? 'x' : ' '}] ${t.title}${t.dueDate ? '（' + t.dueDate + '）' : ''}`)
    })
    L.push('')
  }
  if (payload.habits.length) {
    L.push('## 习惯')
    payload.habits.filter(h => !h.archived).forEach(h => L.push(`- ${h.title}`))
    L.push('')
  }
  if (payload.transactions.length) {
    const expense = payload.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const income = payload.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    L.push('## 财务', `- 总支出：¥${(expense / 100).toFixed(2)}`, `- 总收入：¥${(income / 100).toFixed(2)}`, '')
  }
  downloadFile(`生活规划-导出-${todayStr()}.md`, L.join('\n'), 'text/markdown;charset=utf-8')
}

function triggerImport() { fileInput.value?.click() }

function onImportFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const payload = JSON.parse(reader.result as string) as BackupPayload
      if (confirm('导入会覆盖当前所有数据，确定继续？')) {
        await importAll(payload)
        location.reload()
      }
    } catch (err) {
      alert('导入失败：文件格式不正确')
    }
  }
  reader.readAsText(f)
  ;(e.target as HTMLInputElement).value = ''
}

async function doClear() {
  if (!confirm('⚠️ 此操作将删除本机全部数据，且不可恢复！')) return
  if (!confirm('再次确认：真的要清空所有目标、任务、习惯、财务、健康数据吗？')) return
  await clearAll()
  location.reload()
}

// 标签/分类管理
const newTag = ref('')
const newCat = ref('')
async function addTag() {
  if (newTag.value.trim()) { await settings.addTag(newTag.value.trim()); newTag.value = '' }
}
async function addCat() {
  if (newCat.value.trim()) { await settings.addCategory(newCat.value.trim()); newCat.value = '' }
}
</script>

<template>
  <div class="settings">
    <header class="page-head">
      <h1 class="page-title">设置</h1>
      <p class="page-sub">个性化与数据管理</p>
    </header>

    <!-- 主题 -->
    <section class="card">
      <h2 class="card-title">外观</h2>
      <div class="theme-row">
        <button
          v-for="t in themes" :key="t.key"
          class="theme-btn" :class="{ on: settings.theme === t.key }"
          @click="settings.setTheme(t.key)"
        >{{ t.name }}</button>
      </div>
    </section>

    <!-- 标签管理 -->
    <section class="card">
      <h2 class="card-title">标签</h2>
      <div class="chips">
        <span v-for="t in settings.tags" :key="t" class="tag">{{ t }}</span>
      </div>
      <div class="add-row">
        <input v-model="newTag" class="input" placeholder="新标签" @keyup.enter="addTag" />
        <button class="btn primary sm" @click="addTag">添加</button>
      </div>
    </section>

    <!-- 记账分类管理 -->
    <section class="card">
      <h2 class="card-title">记账分类</h2>
      <div class="chips">
        <span v-for="c in settings.categories" :key="c" class="tag accent">{{ c }}</span>
      </div>
      <div class="add-row">
        <input v-model="newCat" class="input" placeholder="新分类" @keyup.enter="addCat" />
        <button class="btn primary sm" @click="addCat">添加</button>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="card">
      <h2 class="card-title">数据管理</h2>
      <p class="desc">数据存储在本机浏览器（IndexedDB），完全离线可用。建议定期导出备份。</p>
      <div class="actions">
        <button class="btn primary" @click="doExportJson">导出 JSON 备份</button>
        <button class="btn" @click="doExportMarkdown">导出 Markdown</button>
        <button class="btn" @click="triggerImport">导入备份</button>
        <input ref="fileInput" type="file" accept=".json" style="display:none" @change="onImportFile" />
      </div>
    </section>

    <!-- 危险区 -->
    <section class="card danger-zone">
      <h2 class="card-title">危险区</h2>
      <button class="btn danger" @click="doClear">清空全部数据</button>
    </section>

    <!-- 关于 -->
    <section class="card">
      <h2 class="card-title">关于</h2>
      <p class="desc">生活规划工具 v0.1 · 本地优先 · 免订阅 · 无云端依赖</p>
      <p class="desc">你的数据只属于你，随时可导出带走。</p>
    </section>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 16px; }
.page-title { font-size: 22px; margin: 0; font-weight: 650; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 2px 0 0; }

.card { margin-bottom: 14px; }
.card-title { font-size: 15px; margin: 0 0 12px; font-weight: 650; }

.theme-row { display: flex; gap: 8px; }
.theme-btn {
  padding: 8px 20px; border-radius: 9px; cursor: pointer; font-size: 13px;
  border: 1px solid var(--line); background: var(--panel); color: var(--ink-2);
}
.theme-btn.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 600; }

.chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 10px; }
.add-row { display: flex; gap: 8px; max-width: 320px; }

.desc { font-size: 13px; color: var(--ink-3); margin: 0 0 10px; line-height: 1.7; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.danger-zone { border-color: var(--red-soft); }
.danger-zone .card-title { color: var(--red); }
</style>
