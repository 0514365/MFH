import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry } from '@/lib/members'
import type { Project, Attachment } from '@/lib/types'
import { applyProjectFilter, parseProjectFilter } from '@/lib/projectFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { normalizeStatus, statusV2Label, priorityLabel, IMPORTANCE_MAX } from '@/lib/constants'
import { fmtDate } from '../badges'
import { ProgressRing } from '../Progress'
import TaskCheck from '../../tasks/TaskCheck'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AttachmentList, { type AttItem } from '@/components/AttachmentList'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

type ProjTask = { id: string; title: string; done: boolean; due_date: string | null }

// 할 일 마감 짧은 표기: 'YYYY-MM-DD' → 'MM.DD'
function fmtMD(d: string): string {
  return d.slice(5).replace('-', '.')
}

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
    .select('id, user_id, status, importance, category, due_date, created_at')
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
      ? `${fmtDate(project.start_date) || '—'} — ${fmtDate(project.due_date) || '—'}`
      : null

  // 상태 칩 색 (목록 배지와 동일 토큰)
  const st = normalizeStatus(project.status)
  const stCls =
    st === 'done'
      ? 'bg-status-done text-on-status-done'
      : st === 'in_progress'
        ? 'bg-status-progress text-on-status-progress'
        : 'bg-status-upcoming text-on-status-upcoming'
  // 우선순위 칩 색
  const prCls =
    project.priority === 'high'
      ? 'bg-accent-soft text-accent'
      : project.priority === 'low'
        ? 'bg-surface-subtle text-faint'
        : 'bg-surface-subtle text-muted'
  const author = membersMap[project.user_id]

  // 첨부 signed URL(1시간) — 비공개 'attachments' 버킷.
  const atts = (project.attachments ?? []) as Attachment[]
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

  return (
    <main className="mx-auto max-w-md pb-10">
      {/* 상단바 — 일지 상세와 통일 */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <BackButton href="/projects" label="Projects" variant="text" />
        <DetailNav
          basePath="/projects"
          prevId={nav.prevId}
          nextId={nav.nextId}
          index={nav.index}
          total={nav.total}
          query={navQuery}
          variant="minimal"
        />
      </header>

      {/* 헤더: 기간 / 메타 / 제목 */}
      <section className="px-5 pb-6 pt-5">
        {period && (
          <div className="mb-4 font-display text-[11px] font-medium uppercase tracking-[0.15em] text-muted">
            {period}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${stCls}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
            {statusV2Label(project.status)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${prCls}`}
          >
            {priorityLabel(project.priority)}
          </span>
          {project.category && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
              {project.category}
            </span>
          )}
          {project.importance > 0 && (
            <span className="ml-0.5 inline-flex items-center text-[10px] tracking-widest" style={{ color: '#D4AF37' }}>
              {Array.from({ length: IMPORTANCE_MAX }).map((_, i) => (
                <span key={i} className={i < project.importance ? '' : 'text-line'}>
                  ★
                </span>
              ))}
            </span>
          )}
          {author && <span className="flex-1 text-right text-[12px] text-muted">{author}</span>}
        </div>
        <h1 className="break-keep text-[26px] font-bold leading-[1.3] tracking-tight text-ink">{project.title}</h1>
      </section>

      {/* 설명 */}
      {project.description && (
        <section className="border-t border-line bg-white/50 px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-muted">
              Description
            </div>
            <h2 className="text-[14px] font-bold tracking-tight text-ink">프로젝트 개요</h2>
          </div>
          <p className="whitespace-pre-wrap break-keep text-[15px] font-light leading-[1.75] text-ink">
            {project.description}
          </p>
        </section>
      )}

      {/* 첨부파일 — 이미지 썸네일 + PDF 미리보기 */}
      {attItems.length > 0 && (
        <section className="border-t border-line px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-muted">
              Files
            </div>
            <h2 className="text-[14px] font-bold tracking-tight text-ink">첨부파일</h2>
          </div>
          <AttachmentList items={attItems} />
        </section>
      )}

      {/* 진행 상황 */}
      <section className="border-t border-line px-5 pb-7 pt-7">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
              Progress
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-ink">진행 상황</h2>
          </div>
          <Link
            href={`/tasks/new?project=${project.id}`}
            className="text-[13px] font-medium text-primary transition-colors hover:text-accent"
          >
            + 할 일 추가
          </Link>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <div className={`flex items-center gap-5 ${tlist.length > 0 ? 'border-b border-line pb-5' : ''}`}>
            <ProgressRing done={done} total={total} size={60} />
            <div className="min-w-0">
              <div className="text-[18px] font-bold tracking-tight text-ink">
                {total > 0 ? `${pct}% 완료` : '할 일 없음'}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
                {total > 0 ? (
                  <>
                    <span>
                      완료 <strong className="font-semibold text-ink">{done}</strong>
                    </span>
                    <span className="text-line">|</span>
                    <span>
                      전체 <strong className="font-semibold text-ink">{total}</strong>
                    </span>
                  </>
                ) : (
                  '연결된 할 일이 아직 없습니다'
                )}
              </div>
            </div>
          </div>

          {tlist.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-4">
              {tlist.map((t) => (
                <li key={t.id} className="flex items-center gap-3.5">
                  <TaskCheck id={t.id} done={t.done} />
                  <Link href={`/tasks/${t.id}/edit`} className="flex flex-1 items-center justify-between gap-4">
                    <span
                      className={`min-w-0 truncate text-[15px] font-light tracking-tight ${
                        t.done ? 'text-faint line-through' : 'text-ink'
                      }`}
                    >
                      {t.title}
                    </span>
                    {t.due_date && (
                      <span
                        className={`shrink-0 whitespace-nowrap font-display text-[11px] font-medium tracking-wide ${
                          t.done ? 'text-faint' : 'text-muted'
                        }`}
                      >
                        {fmtMD(t.due_date)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-xs text-faint">‘+ 할 일 추가’로 이 프로젝트의 할 일을 만들어 보세요.</p>
          )}
        </div>
      </section>

      {/* 수정 / 삭제 — 일지 상세와 통일 */}
      {canEdit ? (
        <div className="flex items-center justify-center gap-6 border-t border-line px-5 pb-12 pt-8">
          <Link
            href={`/projects/${project.id}/edit`}
            className="rounded-xl px-5 py-2 text-[13px] font-medium text-muted transition hover:bg-surface-subtle"
          >
            수정하기
          </Link>
          <div className="h-3 w-px bg-line" />
          <DeleteButton id={project.id} />
        </div>
      ) : (
        <p className="border-t border-line px-5 pb-12 pt-8 text-center text-xs text-faint">
          {author ?? '다른 멤버'}님의 프로젝트입니다. 보기·할 일 추가만 가능합니다.
        </p>
      )}
    </main>
  )
}
