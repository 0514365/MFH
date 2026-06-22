import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap } from '@/lib/members'
import PageHeader from '@/components/PageHeader'
import type { TaskListRow } from './TasksListClient'
import TasksListClient from './TasksListClient'
import DomainInsightPanel from '@/app/insights/DomainInsightPanel'
import BadgeOptIn from '@/components/BadgeOptIn'
import SignalChips from '@/components/SignalChips'
import { taskSignals } from '@/lib/signals'
import OfflineSync from '@/components/OfflineSync'
import type { OfflineTask } from '@/lib/offlineStore'

// MFH-TASKS-PAGE-V2
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('tasks')
    .select(
      'id, title, description, done, priority, importance, status, category, place_name, due_date, due_time, project_id, user_id, recurrence_id, recurrence_freq, projects(title)',
    )
    .order('done', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('due_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
  const tasks = (data ?? []) as unknown as TaskListRow[]
  const membersMap = await getMembersMap(supabase)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const signals = taskSignals(tasks, today)

  // 오프라인 스냅샷: 미완료 할일. OfflineSync 가 온라인일 때 IndexedDB 에 적재.
  const offlineTasks: OfflineTask[] = tasks
    .filter((t) => !t.done)
    .map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      due_time: t.due_time,
      importance: t.importance,
      category: t.category,
    }))

  return (
    <main className="mx-auto max-w-md px-5 py-8 min-[740px]:max-w-5xl">
      <PageHeader
        title="To-Do"
        current="tasks"
        action={
          <Link href="/tasks/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
            + To-Do
          </Link>
        }
      />

      <BadgeOptIn />

      <SignalChips signals={signals} />

      <DomainInsightPanel domain="task_assist" />
      <DomainInsightPanel domain="task" />

      <TasksListClient tasks={tasks} membersMap={membersMap} currentUserId={user.id} />

      <OfflineSync tasks={offlineTasks} />
    </main>
  )
}
