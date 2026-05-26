import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import CalendarView, { type CalItem } from './CalendarView'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projData } = await supabase
    .from('projects')
    .select('id, title, start_date, due_date, priority, status')

  const { data: taskData } = await supabase
    .from('tasks')
    .select('id, title, due_date, priority, done')
    .not('due_date', 'is', null)

  const projects = (projData ?? []) as {
    id: string
    title: string
    start_date: string | null
    due_date: string | null
    priority: string
    status: string
  }[]
  const tasks = (taskData ?? []) as {
    id: string
    title: string
    due_date: string
    priority: string
    done: boolean
  }[]

  const items: CalItem[] = [
    // 프로젝트: start_date~due_date 기간 막대. 한쪽만 있으면 그날 하루로.
    ...projects
      .filter((p) => p.start_date || p.due_date)
      .map((p) => {
        const start = (p.start_date ?? p.due_date) as string
        const end = (p.due_date ?? p.start_date) as string
        return {
          id: p.id,
          type: 'project' as const,
          title: p.title,
          start: start <= end ? start : end,
          end: start <= end ? end : start,
          status: p.status,
          priority: p.priority,
          done: p.status === 'done',
          href: `/projects/${p.id}`,
        }
      }),
    // 할 일: due_date 하루.
    ...tasks.map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      start: t.due_date,
      end: t.due_date,
      status: t.done ? 'done' : 'active',
      priority: t.priority,
      done: t.done,
      href: `/tasks/${t.id}/edit`,
    })),
  ]

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-5">
      <div className="mb-5">
        <Link href="/" className="text-xs text-muted underline">
          ← 홈
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-primary">캘린더</h1>
        <p className="mt-1 text-xs text-muted">프로젝트·할 일 마감 일정</p>
      </div>

      <CalendarView items={items} />

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" /> 높음
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> 보통
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-faint" /> 낮음
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm border-l-2 border-muted bg-surface-subtle" /> 프로젝트(기간)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-surface-subtle" /> 할 일(하루)
        </span>
      </div>
    </main>
  )
}
