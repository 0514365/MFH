import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'
import { StatusBadge, PriorityBadge, CategoryBadge, ImportanceStars, fmtDate } from '../badges'
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
        <h2 className="mb-2 text-sm font-bold text-primary">연결된 할 일</h2>
        <p className="text-sm text-faint">할 일 기능은 다음 단계에서 연결됩니다.</p>
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
