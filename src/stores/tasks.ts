import { defineStore } from 'pinia'
import { db, uid, now, toPlain } from '@/db'
import { todayStr, matchesRepeat } from '@/utils'
import type { Task, RepeatRule, Subtask } from '@/types'

interface TaskState {
  tasks: Task[]
  loaded: boolean
}

export const useTaskStore = defineStore('tasks', {
  state: (): TaskState => ({ tasks: [], loaded: false }),
  getters: {
    // 今日聚焦：截止今天或已逾期未完成
    today: (s) => {
      const t = todayStr()
      return s.tasks.filter(x =>
        !x.deletedAt && x.status !== 'done' && x.status !== 'archived' &&
        x.dueDate && x.dueDate <= t
      )
    },
    // 全部活跃（含重复任务展开后的实例由组件处理）
    active: (s) => s.tasks.filter(x => !x.deletedAt && x.status !== 'archived'),
    // 已完成
    done: (s) => s.tasks.filter(x => !x.deletedAt && x.status === 'done'),
    // 回收站
    trash: (s) => s.tasks.filter(x => x.deletedAt),
    // 某目标下的任务
    byGoal: (s) => (goalId: string) => s.tasks.filter(x => x.goalId === goalId && !x.deletedAt)
  },
  actions: {
    async load() {
      this.tasks = await db.tasks.toArray()
      this.loaded = true
    },
    async create(data: Partial<Task>): Promise<Task> {
      const t: Task = {
        id: uid(),
        title: data.title || '新任务',
        note: data.note || '',
        status: data.status || 'todo',
        priority: data.priority ?? 1,
        dueDate: data.dueDate || null,
        remindAt: data.remindAt || null,
        repeat: data.repeat || null,
        tags: data.tags || [],
        subtasks: data.subtasks || [],
        parentId: data.parentId || null,
        goalId: data.goalId || null,
        estimateMin: data.estimateMin ?? null,
        spentMin: data.spentMin ?? 0,
        attachments: data.attachments || [],
        createdAt: now(),
        updatedAt: now(),
        completedAt: null,
        deletedAt: null
      }
      await db.tasks.add(toPlain(t))
      this.tasks.push(t)
      return t
    },
    async update(id: string, patch: Partial<Task>) {
      const t = this.tasks.find(x => x.id === id)
      if (!t) return
      Object.assign(t, patch, { updatedAt: now() })
      await db.tasks.put(toPlain(t))
    },
    async setStatus(id: string, status: Task['status']) {
      const t = this.tasks.find(x => x.id === id)
      if (!t) return
      t.status = status
      t.completedAt = status === 'done' ? now() : (status === 'todo' ? null : t.completedAt)
      t.updatedAt = now()
      await db.tasks.put(toPlain(t))
    },
    async addSubtask(taskId: string, title: string) {
      const t = this.tasks.find(x => x.id === taskId)
      if (!t) return
      const sub: Subtask = { id: uid(), title, done: false }
      t.subtasks.push(sub)
      t.updatedAt = now()
      await db.tasks.put(toPlain(t))
    },
    async toggleSubtask(taskId: string, subtaskId: string) {
      const t = this.tasks.find(x => x.id === taskId)
      if (!t) return
      const sub = t.subtasks.find(x => x.id === subtaskId)
      if (sub) { sub.done = !sub.done; t.updatedAt = now(); await db.tasks.put(toPlain(t)) }
    },
    async softDelete(id: string) {
      await this.update(id, { deletedAt: now() })
    },
    async restore(id: string) {
      await this.update(id, { deletedAt: null })
    },
    async hardDelete(id: string) {
      await db.tasks.delete(id)
      this.tasks = this.tasks.filter(t => t.id !== id)
    },
    // 展开某天的重复任务实例
    repeatInstancesOn(date: string): Task[] {
      const out: Task[] = []
      for (const t of this.tasks) {
        if (t.deletedAt || !t.repeat) continue
        if (!t.dueDate) continue
        if (matchesRepeat(t.repeat, date, t.dueDate)) {
          out.push(t)
        }
      }
      return out
    }
  }
})

export type { RepeatRule }
