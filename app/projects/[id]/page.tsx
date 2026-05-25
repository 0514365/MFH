import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'
import { StatusBadge, PriorityBadge, CategoryBadge, ImportanceStars, fmtDate } from '../badges'
import { ProgressRing } from '../Progress'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('projects').select('*').eq('id', params.id).maybeSingle()
  const project = data as Project | null
  if (!project) notFound()

  const { data: taskRows } = await supabase.from('tasks').select('id, done').eq('project_id', params.id)
  const tlist = (taskRows ?? []) as { id: string; done: boolean }[]
  const total = tlist.length
  const done = tlist.filter((t) => t.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const period =
    project.start_date || project.due_date
      ? `${fmtDate(project.start_date) || '—'} ~ ${fmtDate(project.due_date) || '—'}`
      : null

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/projects" className="text-xs text-muted underline">
        ← 프로젝트
      </Link>

      <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge value={project.status} />
        <PriorityBadge value={project.priority} />
        <CategoryBadge value={project.category} />
        <ImportanceStars value={project.importance} />
      </div>
      <h1 className="text-2xl font-extrabold text-ink">{project.title}</h1>
      {period && <p className="mt-1 text-sm text-muted">{period}</p>}

      {project.description && (
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{project.description}</p>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold text-primary">진행 상황</h2>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          <ProgressRing done={done} total={total} size={60} />
          <div className="min-w-0">
            <div className="font-bold text-ink">{total > 0 ? `${pct}% 완료` : '할 일 없음'}</div>
            <div className="mt-0.5 text-xs text-muted">
              {total > 0 ? `완료 ${done} / 전체 ${total}` : '연결된 할 일이 아직 없습니다'}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-faint">할 일을 추가·연결하면 진행률이 자동으로 계산됩니다.</p>
      </section>

      <div className="mt-10 flex items-center gap-4">
        <Link href={`/projects/${project.id}/edit`} className="text-xs font-semibold text-accent underline">
          수정
        </Link>
        <DeleteButton id={project.id} />
      </div>
    </main>
  )
}
