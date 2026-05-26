import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { PriorityBadge, ImportanceStars, fmtDate } from '../projects/badges'
import { fmtTime } from '@/lib/calendar'
import TaskCheck from './TaskCheck'

export const dynamic = 'force-dynamic'

type TaskRow = {
  id: string
  title: string
  description: string | null
  done: boolean
  priority: string
  importance: number
  due_date: string | null
  due_time: string | null
  project_id: string | null
  projects: { title: string } | null
}

export default async function TasksList() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('tasks')
    .select('id, title, description, done, priority, importance, due_date, due_time, project_id, projects(title)')
    .order('done', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('due_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
  const tasks = (data ?? []) as unknown as TaskRow[]

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <Link href="/" className="text-xs text-muted underline">
            ← 홈
          </Link>
          <Link href="/calendar" className="ml-3 text-xs text-muted underline">
            캘린더
          </Link>
          <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="" className="h-7 w-7 shrink-0" />
            <h1 className="font-display text-2xl font-extrabold text-primary">할 일</h1>
          </div>
        </div>
        <Link href="/tasks/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
          + 새 할 일
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 할 일이 없습니다.
          <br />첫 할 일을 만들어 보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <TaskCheck id={t.id} done={t.done} />
              <Link href={`/tasks/${t.id}/edit`} className="min-w-0 flex-1">
                <div className={`truncate text-sm font-semibold ${t.done ? 'text-faint line-through' : 'text-ink'}`}>
                  {t.title}
                </div>
                {t.description && <div className="mt-0.5 line-clamp-1 text-xs text-muted">{t.description}</div>}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {t.projects?.title && (
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                      {t.projects.title}
                    </span>
                  )}
                  <PriorityBadge value={t.priority} />
                  <ImportanceStars value={t.importance} />
                  {t.due_date && (
                    <span className="text-[11px] text-muted">
                      ~ {fmtDate(t.due_date)}
                      {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
