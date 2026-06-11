import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry } from '@/lib/members'
import { parseTaskFilter, orderTaskIds } from '@/lib/taskFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { StatusBadge, CategoryBadge, ImportanceStars, fmtDate } from '../../projects/badges'
import { fmtTime } from '@/lib/calendar'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AuthorBadge from '@/components/AuthorBadge'
import TaskCheck from '../TaskCheck'
import DeleteButton from './DeleteButton'
import RecurrenceBadge from '@/components/RecurrenceBadge'

export const dynamic = 'force-dynamic'

type TaskDetail = {
  id: string
  title: string
  description: string | null
  done: boolean
  priority: string
  importance: number
  status: string | null
  category: string | null
  place_name: string | null
  due_date: string | null
  due_time: string | null
  project_id: string | null
  completed_at: string | null
  user_id: string
  recurrence_id: string | null
  recurrence_freq: string | null
  projects: { id: string; title: string } | null
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
function fmtDueShort(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return d
  return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEKDAY_KO[dt.getDay()]})`
}
function isOverdue(d: string): boolean {
  const now = new Date()
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return d < today
}

export default async function TaskDetailPage(props: {
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

  const { data } = await supabase
    .from('tasks')
    .select(
      'id, title, description, done, priority, importance, status, category, place_name, due_date, due_time, project_id, completed_at, user_id, recurrence_id, recurrence_freq, projects(id, title)',
    )
    .eq('id', params.id)
    .maybeSingle()
  const task = data as unknown as TaskDetail | null
  if (!task) notFound()

  const membersMap = await getMembersMap(supabase)
  const canEdit = canEditEntry(task.user_id, user.id)

  // 목록과 동일한 필터+정렬+그룹평탄화로 전체를 재계산 → 현재 항목의 이전/다음.
  const filter = parseTaskFilter({
    get: (k) => {
      const v = searchParams[k]
      return Array.isArray(v) ? v[v.length - 1] ?? null : v ?? null
    },
  })
  const { data: navRows } = await supabase
    .from('tasks')
    .select(
      'id, user_id, done, status, importance, category, project_id, due_date, due_time, created_at, title, description, place_name',
    )
  const orderedIds = orderTaskIds((navRows ?? []) as any[], filter)
  const nav = computeListNav(orderedIds, params.id)
  const navQuery = searchParamsToQuery(searchParams)

  const overdue = !!task.due_date && !task.done && isOverdue(task.due_date)

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <BackButton href="/tasks" label="To-Do" />
        <DetailNav
          basePath="/tasks"
          prevId={nav.prevId}
          nextId={nav.nextId}
          index={nav.index}
          total={nav.total}
          query={navQuery}
        />
      </div>

      <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge value={task.status ?? 'upcoming'} />
        <CategoryBadge value={task.category} />
        {task.importance > 0 && <ImportanceStars value={task.importance} />}
        {task.recurrence_id && <RecurrenceBadge freq={task.recurrence_freq} />}
        <AuthorBadge name={membersMap[task.user_id]} />
      </div>

      <div className="flex items-start gap-3">
        {canEdit && (
          <div className="pt-1.5">
            <TaskCheck id={task.id} done={task.done} />
          </div>
        )}
        <h1
          className={`text-2xl font-extrabold ${
            task.done ? 'text-faint line-through' : 'text-ink'
          }`}
        >
          {task.title}
        </h1>
      </div>

      {/* 마감·시간·연체 */}
      {task.due_date && (
        <p className={`mt-2 text-sm ${overdue ? 'text-danger' : 'text-muted'}`}>
          마감 {fmtDueShort(task.due_date)}
          {task.due_time ? ` ${fmtTime(task.due_time)}` : ''}
          {overdue ? ' · 연체' : ''}
        </p>
      )}

      {/* 장소 */}
      {task.place_name && (
        <p className="mt-1 text-sm text-muted">📍 {task.place_name}</p>
      )}

      {/* 연결 프로젝트 */}
      {task.projects && (
        <p className="mt-1 text-sm text-muted">
          프로젝트:{' '}
          <Link
            href={`/projects/${task.projects.id}`}
            className="font-semibold text-primary underline"
          >
            {task.projects.title}
          </Link>
        </p>
      )}

      {/* 완료 시각 */}
      {task.done && task.completed_at && (
        <p className="mt-1 text-xs text-faint">
          완료: {fmtDate(task.completed_at.slice(0, 10))}
        </p>
      )}

      {/* 설명 */}
      {task.description && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-bold text-primary">설명</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {task.description}
          </p>
        </section>
      )}

      <div className="mt-10 flex items-center gap-4">
        <Link
          href={`/tasks/new?from=${task.id}`}
          className="text-xs font-semibold text-primary underline"
        >
          복제
        </Link>
        {canEdit && (
          <>
            <Link
              href={`/tasks/${task.id}/edit${navQuery ? `?${navQuery}` : ''}`}
              className="text-xs font-semibold text-accent underline"
            >
              수정
            </Link>
            <DeleteButton
              id={task.id}
              recurrenceId={task.recurrence_id}
              dueDate={task.due_date}
            />
          </>
        )}
      </div>
      {!canEdit && (
        <p className="mt-3 text-xs text-faint">
          {membersMap[task.user_id] ?? '다른 멤버'}님의 할 일입니다. 보기·복제만 가능합니다.
        </p>
      )}
    </main>
  )
}
