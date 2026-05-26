import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { TaskListRow } from './TasksListClient'
import TasksListClient from './TasksListClient'

// MFH-TASKS-PAGE-V2
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('tasks')
    .select(
      'id, title, description, done, priority, importance, status, category, due_date, due_time, project_id, projects(title)',
    )
    .order('done', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('due_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
  const tasks = (data ?? []) as unknown as TaskListRow[]

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" aria-label="홈" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="홈" className="h-8 w-8" />
          </Link>
          <h1 className="truncate font-display text-2xl font-extrabold text-primary">할 일</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/calendar"
            aria-label="캘린더"
            className="rounded-xl border border-line p-2 text-muted transition hover:border-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="16" y1="2" x2="16" y2="6" />
            </svg>
          </Link>
          <Link href="/tasks/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
            + 새 할 일
          </Link>
        </div>
      </div>

      <TasksListClient tasks={tasks} />
    </main>
  )
}
