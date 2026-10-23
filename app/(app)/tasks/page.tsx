import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { TaskListRow } from './TasksListClient'
import TasksListClient from './TasksListClient'
import DomainInsightPanel from '@/app/(app)/insights/DomainInsightPanel'
import BadgeOptIn from '@/components/BadgeOptIn'
import OfflineSync from '@/components/OfflineSync'
import type { OfflineTask } from '@/lib/offlineStore'

// MFH-TASKS-PAGE-V3 — 2027(4-2): theme-2027 · 제목 「할 일」 · 새 할 일 = 터키석 ＋(모바일) / 남색 알약(md+) · 신호 칩 → 목록 요약 3칸으로 대체.
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
    <main className="mx-auto max-w-md px-5 pb-8 @xl:max-w-5xl">
      <PageHeader
        title="할 일"
        current="tasks"
        action={
          <Link
            href="/tasks/new"
            className="hidden rounded-full bg-b27-ink px-4 py-2 text-[13px] font-medium text-white transition active:opacity-80 md:inline-flex"
          >
            새 할 일
          </Link>
        }
      />

      <BadgeOptIn />

      <DomainInsightPanel domain="task_assist" />
      <DomainInsightPanel domain="task" />

      <TasksListClient tasks={tasks} currentUserId={user.id} />

      <OfflineSync tasks={offlineTasks} />

      {/* 새 할 일 ＋ — 터키석 플로팅(모바일), 하단 탭바 위 16px */}
      <Link
        href="/tasks/new"
        aria-label="새 할 일"
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-b27-plus text-white shadow-[0_8px_18px_-6px_rgba(46,196,182,0.6)] transition active:scale-95 md:hidden"
        style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </Link>
    </main>
  )
}
