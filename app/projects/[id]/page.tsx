import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry } from '@/lib/members'
import type { Project } from '@/lib/types'
import { applyProjectFilter, parseProjectFilter } from '@/lib/projectFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { StatusBadge, PriorityBadge, CategoryBadge, ImportanceStars, fmtDate } from '../badges'
import { ProgressRing } from '../Progress'
import TaskCheck from '../../tasks/TaskCheck'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AuthorBadge from '@/components/AuthorBadge'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

type ProjTask = { id: string; title: string; done: boolean; due_date: string | null }

export default async function ProjectDetail(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('projects').select('*').eq('id', params.id).maybeSingle()
  const project = data as Project | null
  if (!project) notFound()

  const membersMap = await getMembersMap(supabase)
  const canEdit = canEditEntry(project.user_id, user.id)

  // 목록과 동일한 필터+정렬로 전체를 재계산 → 현재 항목의 이전/다음.
  const filter = parseProjectFilter({ get: (k) => {
    const v = searchParams[k]
    return Array.isArray(v) ? (v[v.length - 1] ?? null) : (v ?? null)
  } })
  const { data: navRows } = await supabase
    .from('projects')
    .select('id, status, importance, category, due_date, created_at')
  const orderedIds = applyProjectFilter((navRows ?? []) as any[], filter).map((p) => p.id as string)
  const nav = computeListNav(orderedIds, params.id)
  const navQuery = searchParamsToQuery(searchParams)

  const { data: taskRows } = await supabase
    .from('tasks')
    .select('id, title, done, due_date')
    .eq('project_id', params.id)
    .order('done', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  const tlist = (taskRows ?? []) as ProjTask[]
  const total = tlist.length
  const done = tlist.filter((t) => t.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const period =
    project.start_date || project.due_date
      ? `${fmtDate(project.start_date) || '—'} ~ ${fmtDate(project.due_date) || '—'}`
      : null

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <BackButton href="/projects" label="Projects" />
        <DetailNav
          basePath="/projects"
          prevId={nav.prevId}
          nextId={nav.nextId}
          index={nav.index}
          total={nav.total}
          query={navQuery}
        />
      </div>

      <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge value={project.status} />
        <PriorityBadge value={project.priority} />
        <CategoryBadge value={project.category} />
        <ImportanceStars value={project.importance} />
        <AuthorBadge name={membersMap[project.user_id]} />
      </div>
      <h1 className="text-2xl font-extrabold text-ink">{project.title}</h1>
      {period && <p className="mt-1 text-sm text-muted">{period}</p>}

      {project.description && (
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{project.description}</p>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">진행 상황</h2>
          <Link href={`/tasks/new?project=${project.id}`} className="text-xs font-semibold text-accent underline">
            + 할 일 추가
          </Link>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          <ProgressRing done={done} total={total} size={60} />
          <div className="min-w-0">
            <div className="font-bold text-ink">{total > 0 ? `${pct}% 완료` : '할 일 없음'}</div>
            <div className="mt-0.5 text-xs text-muted">
              {total > 0 ? `완료 ${done} / 전체 ${total}` : '연결된 할 일이 아직 없습니다'}
            </div>
          </div>
        </div>

        {tlist.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {tlist.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <TaskCheck id={t.id} done={t.done} />
                <Link
                  href={`/tasks/${t.id}/edit`}
                  className={`min-w-0 flex-1 truncate text-sm ${t.done ? 'text-faint line-through' : 'text-ink'}`}
                >
                  {t.title}
                </Link>
                {t.due_date && <span className="shrink-0 text-[11px] text-muted">{fmtDate(t.due_date)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-faint">‘+ 할 일 추가’로 이 프로젝트의 할 일을 만들어 보세요.</p>
        )}
      </section>

      {canEdit ? (
        <div className="mt-10 flex items-center gap-4">
          <Link href={`/projects/${project.id}/edit`} className="text-xs font-semibold text-accent underline">
            수정
          </Link>
          <DeleteButton id={project.id} />
        </div>
      ) : (
        <p className="mt-10 text-xs text-faint">
          {membersMap[project.user_id] ?? '다른 멤버'}님의 프로젝트입니다. 보기·할 일 추가만 가능합니다.
        </p>
      )}
    </main>
  )
}
