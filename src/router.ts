import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/goals', name: 'goals', component: () => import('@/views/GoalsView.vue') },
    { path: '/tasks', name: 'tasks', component: () => import('@/views/TasksView.vue') },
    { path: '/habits', name: 'habits', component: () => import('@/views/HabitsView.vue') },
    { path: '/calendar', name: 'calendar', component: () => import('@/views/CalendarView.vue') },
    { path: '/health', name: 'health', component: () => import('@/views/HealthView.vue') },
    { path: '/finance', name: 'finance', component: () => import('@/views/FinanceView.vue') },
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') }
  ]
})

export default router
