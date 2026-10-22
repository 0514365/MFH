import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { normalizeStatus } from '@/lib/constants'
import CalendarView, { type CalItem } from './CalendarView'
import CalendarSubscribe from './CalendarSubscribe'
import PageHeader from '@/components/PageHeader'

export const dynamic = 'force-dynamic'
// MFH-CAL-PAGE-2027 — 4-4: theme-2027 · 페이지 헤더 「캘린더」 · 범례는 CalendarView 안(한글) · 넓은 화면 폭 6xl.
// MFH-CAL-FILTER-V1
// MFH-CAL-STATUS-V1

export default async function CalendarPage() {
  const supabase = await createClient()
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
    <main className="theme-2027 mx-auto w-full max-w-md px-5 pb-8 @xl:max-w-3xl @4xl:max-w-6xl">
      <PageHeader title="캘린더" current="calendar" />
      <CalendarView items={items} />

      <CalendarSubscribe />
    </main>
  )
}
