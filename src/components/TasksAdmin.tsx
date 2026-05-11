'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createTask, deleteTask, listTasks, toggleTaskDone } from '@/lib/db/crm'
import type { Task, TaskPriority } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'
import EmptyState from './ui/EmptyState'
import { CheckSquare } from 'lucide-react'

const PRIORITY: Record<TaskPriority, string> = {
  low: 'bg-line text-ink-muted',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

export default function TasksAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Task[]>([])
  const [adding, setAdding] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => { if (user) refresh() }, [user])
  async function refresh() { if (user) setList(await listTasks(user.id)) }

  async function toggle(t: Task) {
    await toggleTaskDone(t.id, !t.doneAt)
    refresh()
  }
  async function rm(id: string) {
    const ok = await confirm({
      title: 'Delete task?',
      description: 'This cannot be undone.',
      destructive: true,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await deleteTask(id)
    toast.success('Task deleted')
    refresh()
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const open = list.filter(t => !t.doneAt)
  const done = list.filter(t => t.doneAt)

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Tasks"
        actions={
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} /> New task
          </button>
        }
        subBar={
          <>
            <span>Open: <span className="text-ink font-bold">{open.length}</span></span>
            <span className="text-ink-muted">·</span>
            <span>Done: <span className="text-ink font-bold">{done.length}</span></span>
          </>
        }
      />
      <main className="px-6 md:px-10 py-6 grid gap-6">
        {list.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={24} />}
            title="No tasks yet"
            description="Tasks help you track follow-ups: chase a quote, send a viewing room link, prep for a meeting."
            action={{ label: 'Add your first task', onClick: () => setAdding(true) }}
          />
        ) : (
          <>
            <Section title="Open" tasks={open} onToggle={toggle} onDelete={rm} />
            {done.length > 0 && <Section title="Completed" tasks={done} onToggle={toggle} onDelete={rm} muted />}
          </>
        )}
      </main>
      {adding && <AddTaskModal ownerId={user.id} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh() }} />}
    </div>
  )
}

function Section({
  title, tasks, onToggle, onDelete, muted,
}: { title: string; tasks: Task[]; onToggle: (t: Task) => void; onDelete: (id: string) => void; muted?: boolean }) {
  if (!tasks.length) return null
  return (
    <section className="bg-paper border border-line rounded-md overflow-hidden">
      <p className="px-4 py-3 border-b border-line font-display text-meta uppercase tracking-[0.14em]">
        {title} · {tasks.length}
      </p>
      <ul>
        {tasks.map(t => (
          <li key={t.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-line/60 last:border-0 hover:bg-bg ${muted ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              checked={!!t.doneAt}
              onChange={() => onToggle(t)}
              className="w-4 h-4 accent-accent"
            />
            <span className={`flex-1 text-body ${t.doneAt ? 'line-through text-ink-muted' : 'font-bold'}`}>
              {t.title}
            </span>
            <span className={`text-meta tracking-[0.14em] uppercase px-2 py-0.5 rounded-xs ${PRIORITY[t.priority]}`}>
              {t.priority}
            </span>
            {t.dueAt && (
              <span className="text-meta text-ink-muted text-[11px]">
                Due {new Date(t.dueAt).toLocaleDateString()}
              </span>
            )}
            <button onClick={() => onDelete(t.id)} className="text-red-600 hover:text-red-700">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AddTaskModal({
  ownerId, onCancel, onSaved,
}: { ownerId: string; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueAt, setDueAt] = useState('')
  async function save() {
    await createTask({ ownerId, title, priority, dueAt: dueAt || null })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-paper rounded-md shadow-pop p-6 w-full max-w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase mb-4">New task</h2>
        <div className="grid gap-3">
          <input placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} className="input" />
          <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className="input" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onCancel} className="btn-outline">Cancel</button>
            <button onClick={save} disabled={!title} className="btn-primary disabled:opacity-40">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
