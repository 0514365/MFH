import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'
import { StatusBadge, PriorityBadge, CategoryBadge, ImportanceStars, fmtDate } from './badges'
import { ProgressRing } from './Progress'

export const dynamic = 'force-dynamic'

export default async function ProjectsList() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  const projects = (data ?? []) as Project[]

  const { data: taskRows } = await supabase.from('tasks').select('project_id, done')
  const counts: Record<string, { total: number; done: number }> = {}
  for (const t of (taskRows ?? []) as { project_id: string | null; done: boolean }[]) {
    if (!t.project_id) continue
    const c = counts[t.project_id] ?? { total: 0, done: 0 }
    c.total += 1
    if (t.done) c.done += 1
    counts[t.project_id] = c
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" aria-label="홈" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="홈" className="h-8 w-8" />
          </Link>
          <h1 className="truncate font-display text-2xl font-extrabold text-primary">프로젝트</h1>
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
          <Link
            href="/projects/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + 새 프로젝트
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 프로젝트가 없습니다.
          <br />첫 프로젝트를 만들어 보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => {
            const c = counts[p.id] ?? { total: 0, done: 0 }
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={p.status} />
                      <PriorityBadge value={p.priority} />
                      <CategoryBadge value={p.category} />
                      <ImportanceStars value={p.importance} />
                      {p.due_date && <span className="text-[11px] text-muted">~ {fmtDate(p.due_date)}</span>}
                    </div>
                    <div className="mt-1.5 font-bold text-ink">{p.title}</div>
                    {p.description && <div className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</div>}
                  </div>
                  <ProgressRing done={c.done} total={c.total} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
