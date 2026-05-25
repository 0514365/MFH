import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'
import { StatusBadge, PriorityBadge, ImportanceStars, fmtDate } from './badges'

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

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <Link href="/" className="text-xs text-muted underline">
            ← 홈
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-primary">프로젝트</h1>
        </div>
        <Link
          href="/projects/new"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          + 새 프로젝트
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 프로젝트가 없습니다.
          <br />첫 프로젝트를 만들어 보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={p.status} />
                  <PriorityBadge value={p.priority} />
                  <ImportanceStars value={p.importance} />
                  {p.due_date && <span className="text-[11px] text-muted">~ {fmtDate(p.due_date)}</span>}
                </div>
                <div className="mt-1.5 font-bold text-ink">{p.title}</div>
                {p.description && <div className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
