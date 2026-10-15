<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { useHabitStore } from '@/stores/habits'
import { useFinanceStore } from '@/stores/finance'
import { useHealthStore } from '@/stores/health'

const route = useRoute()
const settings = useSettingsStore()
const tasks = useTaskStore()
const goals = useGoalStore()
const habits = useHabitStore()
const finance = useFinanceStore()
const health = useHealthStore()

const nav = [
  { path: '/', name: '今日', icon: '🏠' },
  { path: '/goals', name: '目标', icon: '🎯' },
  { path: '/tasks', name: '任务', icon: '✅' },
  { path: '/habits', name: '习惯', icon: '🔥' },
  { path: '/calendar', name: '日程', icon: '📅' },
  { path: '/health', name: '健康', icon: '💪' },
  { path: '/finance', name: '财务', icon: '💰' },
  { path: '/stats', name: '统计', icon: '📊' },
  { path: '/settings', name: '设置', icon: '⚙️' }
]

onMounted(async () => {
  await Promise.all([
    settings.load(), tasks.load(), goals.load(),
    habits.load(), finance.load(), health.load()
  ])
})

// 今日待办数量（用于侧边栏角标）
const todayCount = () => tasks.today.length
</script>

<template>
  <div class="app">
    <aside class="sidebar no-print">
      <div class="logo">
        <span class="logo-mark">✓</span>
        <span class="logo-text">生活规划</span>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-name">{{ item.name }}</span>
          <span v-if="item.path === '/' && todayCount() > 0" class="badge">{{ todayCount() }}</span>
        </router-link>
      </nav>
      <div class="sidebar-foot">
        <span class="foot-note">数据存于本机 · 离线可用</span>
      </div>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app { display: flex; height: 100vh; }
.sidebar {
  width: var(--sidebar-w);
  flex: none;
  background: var(--panel);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
}
.logo {
  display: flex; align-items: center; gap: 9px;
  padding: 4px 8px 16px;
}
.logo-mark {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 15px;
}
.logo-text { font-size: 16px; font-weight: 650; letter-spacing: -.01em; }
.nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 11px; border-radius: 9px;
  color: var(--ink-2); font-size: 14px;
  transition: .12s;
}
.nav-item:hover { background: var(--bg-2); color: var(--ink); }
.nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.nav-icon { font-size: 16px; width: 20px; text-align: center; }
.nav-name { flex: 1; }
.sidebar-foot { padding: 12px 8px 4px; border-top: 1px solid var(--line-2); }
.foot-note { font-size: 11px; color: var(--ink-3); }
.main {
  flex: 1; overflow-y: auto;
  padding: 24px 28px 64px;
  max-width: 1100px;
}

/* 平板/窄屏：侧边栏收窄为图标 */
@media (max-width: 820px) {
  .sidebar { width: 64px; padding: 16px 8px; }
  .logo-text, .nav-name, .badge, .foot-note { display: none; }
  .logo { justify-content: center; padding: 4px 0 16px; }
  .nav-item { justify-content: center; padding: 11px 0; }
  .main { padding: 16px 16px 64px; }
}
</style>
