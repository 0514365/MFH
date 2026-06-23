import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry } from '@/lib/members'
import type { Project, Attachment } from '@/lib/types'
import { applyProjectFilter, parseProjectFilter } from '@/lib/projectFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { normalizeStatus, statusV2Label } from '@/lib/constants'
import { ImportanceStars } from '../badges'
import { ProgressRing } from '../Progress'
import ProjectTaskList from './ProjectTaskList'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AttachmentList, { type AttItem } from '@/components/AttachmentList'
import DeleteButton from './DeleteButton'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

type ProjTask = {
  id: string
  title: string
  done: boolean
  due_date: string | null
  sort_order: number | null
  predecessor_ids: string[] | null
  successor_ids: string[] | null
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
    .select('id, title, done, due_date, sort_order, predecessor_ids, successor_ids')
    .eq('project_id', params.id)
    .order('done', { ascending: true })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  const tlist = (taskRows ?? []) as ProjTask[]
  const total = tlist.length
  const done = tlist.filter((t) => t.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const toYYMMDD = (d: string | null) => (d ? d.slice(2).split('-').join('.') : '—')
  const period =
    project.start_date || project.due_date
      ? `${toYYMMDD(project.start_date)} — ${toYYMMDD(project.due_date)}`
      : null

  // 상태 칩 색 (목록 배지와 동일 토큰)
  const st = normalizeStatus(project.status)
  const stCls =
    st === 'done'
      ? 'bg-status-done text-on-status-done'
      : st === 'in_progress'
        ? 'bg-status-progress text-on-status-progress'
        : 'bg-status-upcoming text-on-status-upcoming'
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
    <main className="app-theme mx-auto max-w-md pb-10">
      {/* 상단바 — 일지 상세와 통일 */}
      <header
        className="sticky top-0 z-30 border-b border-line px-3 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <BackButton href="/projects" label="목록" variant="icon-accent" />
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight text-ink">
              {project.title}
            </h1>
            {period && (
              <div className="mt-0.5 font-display text-[12px] font-medium tracking-wide text-muted">
                ( {period} )
              </div>
            )}
          </div>
          <div className="shrink-0">
            <DetailNav
              basePath="/projects"
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

      {/* 메타칩 */}
      <section className="px-5 pb-6 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <ImportanceStars value={project.importance} size="md" />
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${stCls}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
            {statusV2Label(project.status)}
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
          {author && <span className="flex-1 text-right text-[12px] text-muted">{author}</span>}
        </div>
      </section>

      {/* 설명 */}
      {project.description && (
        <section className="border-t border-line bg-white/50 px-5 py-7">
          <div className="mb-3">
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Description
            </div>
            <h2 className="text-[17px] font-bold tracking-tight text-ink">프로젝트 개요</h2>
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
            <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Progress
            </div>
            <h2 className="text-[19px] font-bold tracking-tight text-ink">진행 상황</h2>
          </div>
          <Link
            href={`/tasks/new?project=${project.id}`}
            className="shrink-0 rounded-full bg-accent-soft px-3.5 py-1.5 text-[12.5px] font-medium text-accent transition hover:opacity-80"
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
            <div className="mt-5">
              <ProjectTaskList items={tlist} canReorder={canEdit} />
            </div>
          ) : (
            <p className="mt-5 text-xs text-faint">‘+ 할 일 추가’로 이 프로젝트의 할 일을 만들어 보세요.</p>
          )}
        </div>
      </section>

      {/* 수정 / 삭제 — 일지 상세와 통일 */}
      {canEdit ? (
        <div className="flex items-center justify-center gap-3 border-t border-line px-5 pb-12 pt-8">
          <Link
            href={`/projects/${project.id}/edit`}
            className="rounded-full border border-line bg-surface-subtle px-5 py-2 text-[13px] font-medium text-muted transition hover:border-primary"
          >
            수정
          </Link>
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
