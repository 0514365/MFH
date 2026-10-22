// MFH-TASK-DETAIL-V2 — 2027(4-2): theme-2027 · 빨간 ‹ 할 일 + ‹n/total› · 메타(별·상태·분류 틴트·장소·반복) · 제목 22/600 ·
//   완료 토글 면 · 마감 살구 면(큰 날짜 · 시간 · D-day) · 설명 · 상위 프로젝트 로즈 면 · 선행/후속 · 수정 남색/복제/삭제.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canEditEntry } from '@/lib/members'
import type { Attachment } from '@/lib/types'
import { parseTaskFilter, orderTaskIds } from '@/lib/taskFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { fmtDate, ImportanceStars, StatusBadge, CategoryBadge } from '../../projects/badges'
import { fmtTime } from '@/lib/calendar'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AttachmentList, { type AttItem } from '@/components/AttachmentList'
import MarkdownText from '@/components/MarkdownText'
import TaskCheck from '../TaskCheck'
import DeleteButton from './DeleteButton'
import RecurrenceBadge from '@/components/RecurrenceBadge'

export const dynamic = 'force-dynamic'

type TaskDetail = {
  id: string
  title: string
  description: string | null
  done: boolean
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
  predecessor_ids: string[] | null
  successor_ids: string[] | null
  attachments: Attachment[] | null
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
      'id, title, description, done, importance, status, category, place_name, due_date, due_time, project_id, completed_at, user_id, recurrence_id, recurrence_freq, predecessor_ids, successor_ids, attachments, projects(id, title)',
    )
    .eq('id', params.id)
    .maybeSingle()
  const task = data as unknown as TaskDetail | null
  if (!task) notFound()

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

  // 선행/후속 작업 제목 조회(같은 프로젝트 할 일 각 1개 — types: "상세에 표시만").
  const predId = task.predecessor_ids?.[0] ?? null
  const sucId = task.successor_ids?.[0] ?? null
  const linkedIds = [predId, sucId].filter(Boolean) as string[]
  let linkedMap: Record<string, string> = {}
  if (linkedIds.length) {
    const { data: linked } = await supabase.from('tasks').select('id, title').in('id', linkedIds)
    linkedMap = Object.fromEntries(((linked ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]))
  }
  const predTitle = predId ? linkedMap[predId] ?? null : null
  const sucTitle = sucId ? linkedMap[sucId] ?? null : null

  // 첨부 signed URL(1시간) — 비공개 'attachments' 버킷.
  const atts = (task.attachments ?? []) as Attachment[]
  let attItems: AttItem[] = []
  if (atts.length) {
    const { data: signed } = await supabase.storage
      .from('attachments')
      .createSignedUrls(
        atts.map((a) => a.path),
        3600,
      )
    attItems = (signed ?? [])
      .map((s, i) => (s.signedUrl ? { url: s.signedUrl, name: atts[i].name, mime: atts[i].mime } : null))
      .filter(Boolean) as AttItem[]
  }

  // 마감 D-day(오늘 기준, 로컬). 지남이면 음수.
  const dday = (() => {
    if (!task.due_date) return null
    const now = new Date()
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    const diff = Math.round((Date.parse(task.due_date) - Date.parse(today)) / 86400000)
    return diff === 0 ? 'D-day' : diff > 0 ? `D-${diff}` : `${-diff}일 지남`
  })()

  const ChevronRight = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-b27-muted" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
  const label = 'mb-1.5 flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted'

  return (
    <main className="theme-2027 mx-auto max-w-md pb-10">
      {/* 상단바 — 빨간 ‹ 할 일 / ‹ n/total › */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between bg-b27-paper pl-3 pr-4">
        <BackButton href={navQuery ? `/tasks?${navQuery}` : '/tasks'} label="할 일" variant="text" />
        <DetailNav
          basePath="/tasks"
          prevId={nav.prevId}
          nextId={nav.nextId}
          index={nav.index}
          total={nav.total}
          query={navQuery}
          variant="minimal"
        />
      </header>

      <div className="flex flex-col gap-4 px-5 pt-2">
        {/* 메타(별점 · 상태 · 사역분류 · 장소 · 반복) → 제목 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ImportanceStars value={task.importance} size="md" />
          <StatusBadge value={task.status ?? 'upcoming'} />
          <CategoryBadge value={task.category} />
          {task.place_name && (
            <span className="inline-flex items-center rounded-full bg-b27-card px-2.5 py-0.5 text-[11.5px] text-b27-ink">{task.place_name}</span>
          )}
          {task.recurrence_id && <RecurrenceBadge freq={task.recurrence_freq} />}
        </div>
        <h1 className={`-mt-1 break-keep text-[22px] font-semibold leading-[1.35] ${task.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>
          {task.title}
        </h1>

        {/* 완료 토글 면 */}
        {canEdit && (
          <div className="flex items-center justify-between rounded-2xl bg-b27-card px-4 py-3">
            <span className="text-[14px] text-b27-ink">
              {task.done ? `완료됨${task.completed_at ? ` · ${fmtDate(task.completed_at.slice(0, 10))}` : ''}` : '완료로 표시'}
            </span>
            <TaskCheck id={task.id} done={task.done} size="lg" />
          </div>
        )}

        {/* 마감 — 할 일 틴트 면(3 살구) · 큰 날짜 + 시간 · D-day */}
        {task.due_date && (
          <div className="rounded-2xl bg-b27-tint-3 px-4 py-3.5">
            <div className={label} style={{ color: 'var(--b27-deep-3)' }}>
              <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-3" aria-hidden="true" />
              마감
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`font-num text-[26px] font-semibold tabular-nums ${overdue ? 'text-b27-expense' : 'text-b27-ink'}`}>
                {fmtDueShort(task.due_date)}
              </span>
              <span className={`font-num text-[15px] tabular-nums ${overdue ? 'text-b27-expense' : ''}`} style={overdue ? undefined : { color: 'var(--b27-deep-3)' }}>
                {[task.due_time ? fmtTime(task.due_time) : null, task.done ? null : dday].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        )}

        {/* 설명 */}
        {task.description && (
          <section>
            <div className={label}>설명</div>
            <MarkdownText text={task.description} className="break-keep text-[15px] leading-[1.75] text-b27-ink" />
          </section>
        )}

        {/* 상위 프로젝트 — 프로젝트 틴트 면(6 로즈) */}
        {task.projects && (
          <Link href={`/projects/${task.projects.id}`} className="block rounded-2xl bg-b27-tint-6 px-4 py-3.5 transition active:opacity-80">
            <div className={label}>
              <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-6" aria-hidden="true" />
              상위 프로젝트
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[15px] font-medium text-b27-ink">{task.projects.title}</span>
              {ChevronRight}
            </div>
          </Link>
        )}

        {/* 선행 · 후속 업무 (같은 프로젝트 할 일 각 1개) */}
        {(predTitle || sucTitle) && (
          <section>
            <div className={label}>선행 · 후속</div>
            <div className="flex flex-col gap-1.5">
              {predTitle && predId && (
                <Link href={`/tasks/${predId}`} className="flex items-center justify-between gap-3 rounded-xl bg-b27-card px-3.5 py-2.5 transition active:opacity-70">
                  <span className="min-w-0 truncate text-[14px] text-b27-ink">
                    <span className="mr-2 text-b27-muted">선행</span>
                    {predTitle}
                  </span>
                  {ChevronRight}
                </Link>
              )}
              {sucTitle && sucId && (
                <Link href={`/tasks/${sucId}`} className="flex items-center justify-between gap-3 rounded-xl bg-b27-card px-3.5 py-2.5 transition active:opacity-70">
                  <span className="min-w-0 truncate text-[14px] text-b27-ink">
                    <span className="mr-2 text-b27-muted">후속</span>
                    {sucTitle}
                  </span>
                  {ChevronRight}
                </Link>
              )}
            </div>
          </section>
        )}

        {/* 첨부파일 */}
        {attItems.length > 0 && (
          <section>
            <div className={label}>첨부파일</div>
            <AttachmentList items={attItems} />
          </section>
        )}

        {/* 수정(남색) / 복제(연회색) / 삭제(연한 빨강) */}
        {canEdit ? (
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={`/tasks/${task.id}/edit${navQuery ? `?${navQuery}` : ''}`}
              className="flex-1 rounded-2xl bg-b27-ink py-3.5 text-center text-[14px] font-medium text-white transition active:opacity-80"
            >
              수정
            </Link>
            <Link
              href={`/tasks/new?from=${task.id}`}
              className="flex-1 rounded-2xl bg-b27-card py-3.5 text-center text-[14px] font-medium text-b27-ink transition active:opacity-70"
            >
              복제
            </Link>
            <DeleteButton id={task.id} recurrenceId={task.recurrence_id} dueDate={task.due_date} />
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <p className="rounded-2xl bg-b27-card px-4 py-3 text-center text-xs text-b27-muted">다른 멤버님의 할 일입니다. 보기·복제만 가능합니다.</p>
            <Link
              href={`/tasks/new?from=${task.id}`}
              className="rounded-2xl bg-b27-card py-3.5 text-center text-[14px] font-medium text-b27-ink transition active:opacity-70"
            >
              복제
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
