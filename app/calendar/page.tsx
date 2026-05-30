import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { normalizeStatus } from '@/lib/constants'
import PageHeader from '@/components/PageHeader'
import CalendarView, { type CalItem } from './CalendarView'
import CalendarSubscribe from './CalendarSubscribe'

export const dynamic = 'force-dynamic'
// MFH-CAL-FILTER-V1
// MFH-CAL-STATUS-V1

export default async function CalendarPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projData } = await supabase
    .from('projects')
    .select('id, title, start_date, due_date, priority, importance, status, category')

  const { data: taskData } = await supabase
    .from('tasks')
    .select('id, title, due_date, due_time, priority, importance, done, status, category')
    .not('due_date', 'is', null)

  const projects = (projData ?? []) as {
    id: string
    title: string
    start_date: string | null
    due_date: string | null
    priority: string
    importance: number | null
    status: string
    category: string | null
  }[]
  const tasks = (taskData ?? []) as {
    id: string
    title: string
    due_date: string
    due_time: string | null
    priority: string
    importance: number | null
    done: boolean
    status: string | null
    category: string | null
  }[]

  const items: CalItem[] = [
    // 프로젝트: start_date~due_date 기간 막대. 한쪽만 있으면 그날 하루로.
    ...projects
      .filter((p) => p.start_date || p.due_date)
      .map((p) => {
        const start = (p.start_date ?? p.due_date) as string
        const end = (p.due_date ?? p.start_date) as string
        const status = normalizeStatus(p.status)
        return {
          id: p.id,
          type: 'project' as const,
          title: p.title,
          start: start <= end ? start : end,
          end: start <= end ? end : start,
          time: null,
          status,
          priority: p.priority,
          importance: p.importance ?? 0,
          category: p.category ?? null,
          done: status === 'done',
          href: `/projects/${p.id}`,
        }
      }),
    // 할 일: due_date 하루(+ 선택적 시간).
    ...tasks.map((t) => {
      const status = t.done ? 'done' : normalizeStatus(t.status)
      return {
        id: t.id,
        type: 'task' as const,
        title: t.title,
        start: t.due_date,
        end: t.due_date,
        time: t.due_time,
        status,
        priority: t.priority,
        importance: t.importance ?? 0,
        category: t.category ?? null,
        done: t.done || status === 'done',
        href: `/tasks/${t.id}/edit`,
      }
    }),
  ]

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <PageHeader title="Calendar" current="calendar" />
      <p className="-mt-3 mb-5 text-xs text-muted">프로젝트·할 일 마감 일정</p>

      <CalendarView items={items} />

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-upcoming" /> Upcoming
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-progress" /> In Progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-done" /> Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm border-l-2 border-muted bg-surface-subtle" /> 프로젝트(기간)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-surface-subtle" /> 할 일(하루)
        </span>
      </div>

      <CalendarSubscribe />
    </main>
  )
}
