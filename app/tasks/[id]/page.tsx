import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canEditEntry } from '@/lib/members'
import type { Attachment } from '@/lib/types'
import { parseTaskFilter, orderTaskIds } from '@/lib/taskFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { normalizeStatus, statusV2Label, IMPORTANCE_MAX } from '@/lib/constants'
import { fmtDate } from '../../projects/badges'
import { fmtTime } from '@/lib/calendar'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AttachmentList, { type AttItem } from '@/components/AttachmentList'
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
      'id, title, description, done, priority, importance, status, category, place_name, due_date, due_time, project_id, completed_at, user_id, recurrence_id, recurrence_freq, attachments, projects(id, title)',
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

  return (
    <main className="mx-auto max-w-md pb-10">
      {/* 상단바 — 일지/프로젝트 상세와 통일 */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <BackButton href="/tasks" label="To-Do" variant="text" />
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

      {/* 헤더: 메타칩 / 완료체크 + 제목 + 마감 */}
      <section className="px-5 pb-8 pt-7">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${stCls}`}>
            {statusV2Label(task.status ?? 'upcoming')}
          </span>
          {task.category && (
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-muted">
              {task.category}
            </span>
          )}
          {task.importance > 0 && (
            <span className="inline-flex items-center text-[10px] tracking-widest" style={{ color: '#D4AF37' }}>
              {Array.from({ length: IMPORTANCE_MAX }).map((_, i) => (
                <span key={i} className={i < task.importance ? '' : 'text-line'}>
                  ★
                </span>
              ))}
            </span>
          )}
          {task.recurrence_id && <RecurrenceBadge freq={task.recurrence_freq} />}
        </div>

        <div className="flex items-start gap-4">
          {canEdit && (
            <div className="mt-1">
              <TaskCheck id={task.id} done={task.done} />
            </div>
          )}
          <div className="min-w-0">
            <h1
              className={`text-[24px] font-bold leading-[1.3] tracking-tight ${
                task.done ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {task.title}
            </h1>
            {task.due_date && (
              <div
                className={`mt-3 text-[14px] ${
                  task.done ? 'text-faint' : overdue ? 'font-medium text-danger' : 'text-muted'
                }`}
              >
                마감 {fmtDueShort(task.due_date)}
                {task.due_time ? ` ${fmtTime(task.due_time)}` : ''}
                {overdue ? ' · 연체' : ''}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 장소 */}
      {task.place_name && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-3">
            <p className="font-display text-[10px] uppercase leading-none tracking-[0.15em] text-muted">Location</p>
            <h2 className="mt-2 text-[16px] font-bold leading-none text-ink">장소</h2>
          </div>
          <p className="flex items-center gap-2 text-[15px] font-light text-ink">
            <span className="text-lg leading-none">📍</span> {task.place_name}
          </p>
        </section>
      )}

      {/* 상위 프로젝트 */}
      {task.projects && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-4">
            <p className="font-display text-[10px] uppercase leading-none tracking-[0.15em] text-muted">Parent Project</p>
            <h2 className="mt-2 text-[16px] font-bold leading-none text-ink">상위 프로젝트</h2>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      )}

      {/* 메모 */}
      {task.description && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-4">
            <p className="font-display text-[10px] uppercase leading-none tracking-[0.15em] text-muted">Note</p>
            <h2 className="mt-2 text-[16px] font-bold leading-none text-ink">메모</h2>
          </div>
          <p className="whitespace-pre-wrap text-[15px] font-light leading-[1.75] text-ink">{task.description}</p>
        </section>
      )}

      {/* 첨부파일 — 이미지 썸네일 + PDF 미리보기 */}
      {attItems.length > 0 && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-4">
            <p className="font-display text-[10px] uppercase leading-none tracking-[0.15em] text-muted">Files</p>
            <h2 className="mt-2 text-[16px] font-bold leading-none text-ink">첨부파일</h2>
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

      {/* 수정 / 복제 / 삭제 */}
      {canEdit ? (
        <div className="flex items-center justify-center gap-6 border-t border-line px-5 pb-12 pt-8 text-[14px] font-medium text-muted">
          <Link
            href={`/tasks/${task.id}/edit${navQuery ? `?${navQuery}` : ''}`}
            className="rounded-lg px-4 py-2 transition hover:text-ink"
          >
            수정하기
          </Link>
          <div className="h-3.5 w-px bg-line" />
          <Link href={`/tasks/new?from=${task.id}`} className="rounded-lg px-4 py-2 transition hover:text-ink">
            복제
          </Link>
          <div className="h-3.5 w-px bg-line" />
          <DeleteButton id={task.id} recurrenceId={task.recurrence_id} dueDate={task.due_date} />
        </div>
      ) : (
        <div className="border-t border-line px-5 pb-10 pt-8 text-center">
          <p className="mb-5 text-[13px] leading-relaxed text-muted">
            다른 멤버님의 할 일입니다. 보기·복제만 가능합니다.
          </p>
          <Link
            href={`/tasks/new?from=${task.id}`}
            className="inline-block rounded-xl border border-line bg-surface px-8 py-2.5 text-[14px] font-medium text-ink shadow-sm transition active:bg-surface-subtle"
          >
            복제
          </Link>
        </div>
      )}
    </main>
  )
}
