import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canEditEntry } from '@/lib/members'
import type { Attachment } from '@/lib/types'
import { parseTaskFilter, orderTaskIds } from '@/lib/taskFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { normalizeStatus, statusV2Label } from '@/lib/constants'
import { fmtDate, ImportanceStars } from '../../projects/badges'
import { fmtTime } from '@/lib/calendar'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AttachmentList, { type AttItem } from '@/components/AttachmentList'
import TaskCheck from '../TaskCheck'
import DeleteButton from './DeleteButton'
import RecurrenceBadge from '@/components/RecurrenceBadge'
import '../../p/portfolio-theme.css'

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

  // 상태 칩 색 (목록 배지와 동일 토큰)
  const st = normalizeStatus(task.status ?? 'upcoming')
  const stCls =
    st === 'done'
      ? 'bg-status-done text-on-status-done'
      : st === 'in_progress'
        ? 'bg-status-progress text-on-status-progress'
        : 'bg-status-upcoming text-on-status-upcoming'

  const ChevronRight = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )

  return (
    <main className="app-theme mx-auto max-w-md pb-10">
      {/* 상단바 — 프로젝트 상세와 통일 */}
      <header
        className="sticky top-0 z-30 border-b border-line px-3 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <BackButton href="/tasks" label="목록" variant="icon-accent" />
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1
              className={`truncate text-[18px] font-bold leading-tight tracking-tight ${
                task.done ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {task.title}
            </h1>
            {task.due_date && (
              <div
                className={`mt-0.5 font-display text-[12px] font-medium tracking-wide ${
                  overdue ? 'text-danger' : 'text-muted'
                }`}
              >
                ( 마감 {fmtDueShort(task.due_date)}
                {task.due_time ? ` ${fmtTime(task.due_time)}` : ''}
                {overdue ? ' · 연체' : ''} )
              </div>
            )}
          </div>
          <div className="shrink-0">
            <DetailNav
              basePath="/tasks"
              prevId={nav.prevId}
              nextId={nav.nextId}
              index={nav.index}
              total={nav.total}
              query={navQuery}
              variant="pad"
            />
          </div>
        </div>
      </header>

      {/* 메타칩(별점·상태·사역분류·장소·반복) + 완료 토글 우측 */}
      <section className="px-5 pb-6 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <ImportanceStars value={task.importance} size="md" />
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${stCls}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              {statusV2Label(task.status ?? 'upcoming')}
            </span>
            {task.category && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
                {task.category}
              </span>
            )}
            {task.place_name && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {task.place_name}
              </span>
            )}
            {task.recurrence_id && <RecurrenceBadge freq={task.recurrence_freq} />}
          </div>
          {canEdit && (
            <div className="flex shrink-0 items-center gap-1.5 pt-1">
              <span className="text-[12px] font-bold text-accent">완료</span>
              <TaskCheck id={task.id} done={task.done} />
            </div>
          )}
        </div>
      </section>

      {/* 설명 — 프로젝트 상세 Description 과 동일 */}
      {task.description && (
        <section className="border-t border-line bg-white/50 px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Description
            </div>
            <h2 className="text-[17px] font-bold tracking-tight text-ink">설명</h2>
          </div>
          <p className="whitespace-pre-wrap break-keep text-[15px] font-light leading-[1.75] text-ink">
            {task.description}
          </p>
        </section>
      )}

      {/* 상위 프로젝트 */}
      {task.projects && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Parent Project
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-ink">상위 프로젝트</h2>
          </div>
          <Link
            href={`/projects/${task.projects.id}`}
            className="flex items-center justify-between rounded-3xl border border-line bg-surface p-4 shadow-sm transition active:bg-surface-subtle"
          >
            <span className="flex min-w-0 items-center gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </span>
              <span className="min-w-0 truncate text-[15px] font-medium leading-snug text-ink">{task.projects.title}</span>
            </span>
            {ChevronRight}
          </Link>
        </section>
      )}

      {/* 선행 · 후속 업무 (같은 프로젝트 할 일 각 1개) */}
      {(predTitle || sucTitle) && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Linked Tasks
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-ink">선행 · 후속 업무</h2>
          </div>
          <div className={`grid gap-2.5 ${predTitle && sucTitle ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {predTitle && predId && (
              <Link
                href={`/tasks/${predId}`}
                className="block rounded-2xl border border-line bg-surface p-3 shadow-sm transition active:bg-surface-subtle"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-surface-subtle px-1.5 py-0.5 text-[10px] font-bold text-muted">
                    선행
                  </span>
                  {ChevronRight}
                </div>
                <div className="mt-2 truncate text-[14px] text-ink">{predTitle}</div>
              </Link>
            )}
            {sucTitle && sucId && (
              <Link
                href={`/tasks/${sucId}`}
                className="block rounded-2xl border border-line bg-surface p-3 shadow-sm transition active:bg-surface-subtle"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-surface-subtle px-1.5 py-0.5 text-[10px] font-bold text-muted">
                    후속
                  </span>
                  {ChevronRight}
                </div>
                <div className="mt-2 truncate text-[14px] text-ink">{sucTitle}</div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 첨부파일 — 이미지 썸네일 + PDF 미리보기 */}
      {attItems.length > 0 && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-muted">
              Files
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-ink">첨부파일</h2>
          </div>
          <AttachmentList items={attItems} />
        </section>
      )}

      {/* 완료 시각 */}
      {task.done && task.completed_at && (
        <section className="border-t border-line px-5 py-6 text-center">
          <span className="text-[13px] text-faint">완료 {fmtDate(task.completed_at.slice(0, 10))}</span>
        </section>
      )}

      {/* 수정 / 복제 / 삭제 — 프로젝트 상세 톤(알약) */}
      {canEdit ? (
        <div className="flex items-center justify-center gap-3 border-t border-line px-5 pb-12 pt-8">
          <Link
            href={`/tasks/${task.id}/edit${navQuery ? `?${navQuery}` : ''}`}
            className="rounded-full border border-line bg-surface-subtle px-5 py-2 text-[13px] font-medium text-muted transition hover:border-primary"
          >
            수정
          </Link>
          <Link
            href={`/tasks/new?from=${task.id}`}
            className="rounded-full border border-line bg-surface-subtle px-5 py-2 text-[13px] font-medium text-muted transition hover:border-primary"
          >
            복제
          </Link>
          <DeleteButton id={task.id} recurrenceId={task.recurrence_id} dueDate={task.due_date} />
        </div>
      ) : (
        <div className="border-t border-line px-5 pb-10 pt-8 text-center">
          <p className="mb-5 text-[13px] leading-relaxed text-muted">
            다른 멤버님의 할 일입니다. 보기·복제만 가능합니다.
          </p>
          <Link
            href={`/tasks/new?from=${task.id}`}
            className="inline-block rounded-full border border-line bg-surface-subtle px-8 py-2.5 text-[14px] font-medium text-muted transition hover:border-primary"
          >
            복제
          </Link>
        </div>
      )}
    </main>
  )
}
