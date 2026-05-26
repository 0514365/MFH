import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
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
      <PageHeader
        title="할 일"
        current="tasks"
        action={
          <Link href="/tasks/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
            + 새 할 일
          </Link>
        }
      />

      <TasksListClient tasks={tasks} />
    </main>
  )
}
