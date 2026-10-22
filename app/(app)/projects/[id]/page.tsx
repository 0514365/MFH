// MFH-PROJECT-DETAIL-2027 — 4-3: theme-2027 · 빨간 ‹ 프로젝트 · 메타 · 제목 22/600 · 진행 로즈 면(큰 % · 막대 · 기간 · D-day) ·
//   설명 · 첨부 · 할 일 목록 + 터키석 「＋ 할 일 추가」 · 수정 남색 / 삭제 연한 빨강.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canEditEntry } from '@/lib/members'
import type { Project, Attachment } from '@/lib/types'
import { applyProjectFilter, parseProjectFilter } from '@/lib/projectFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { normalizeStatus } from '@/lib/constants'
import { ImportanceStars, StatusBadge, CategoryBadge } from '../badges'
import ProjectTaskList from './ProjectTaskList'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AttachmentList, { type AttItem } from '@/components/AttachmentList'
import MarkdownText from '@/components/MarkdownText'
import DeleteButton from './DeleteButton'

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

  // D-day(오늘 기준, 로컬). 완료 프로젝트는 표시 안 함.
  const dday = (() => {
    if (!project.due_date || normalizeStatus(project.status) === 'done') return null
    const now = new Date()
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    const diff = Math.round((Date.parse(project.due_date) - Date.parse(today)) / 86400000)
    return diff === 0 ? 'D-day' : diff > 0 ? `D-${diff}` : `${-diff}일 지남`
  })()
  const label = 'mb-1.5 flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted'

  return (
    <main className="theme-2027 mx-auto max-w-md pb-10 @xl:max-w-5xl">
      {/* 상단바 — 빨간 ‹ 프로젝트 / ‹ n/total › */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between bg-b27-paper pl-3 pr-4">
        <BackButton href={navQuery ? `/projects?${navQuery}` : '/projects'} label="프로젝트" variant="text" />
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

      {/* 본문 — 모바일 세로 스택, 데스크탑(900px↑) 개요·첨부(좌) + 진행 상황(우, 스크롤 고정) 2컬럼 */}
      <div className="flex flex-col gap-4 px-5 pt-2 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:items-start min-[900px]:gap-9">
        <div className="flex min-w-0 flex-col gap-4">
          {/* 메타(분류 · 별 · 상태) → 제목 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge value={project.category} />
            <ImportanceStars value={project.importance} size="md" />
            <StatusBadge value={project.status} />
          </div>
          <h1 className="-mt-1 break-keep text-[22px] font-semibold leading-[1.35] text-b27-ink @xl:text-[26px]">{project.title}</h1>

          {/* 진행 요약 — 프로젝트 틴트 면(6 로즈): 큰 % · 완료/전체 · 막대 · 기간 · D-day */}
          <section className="rounded-2xl bg-b27-tint-6 px-4 py-4">
            <div className={label}>
              <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-6" aria-hidden="true" />
              진행 상황
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-num text-[34px] font-semibold leading-none tabular-nums text-b27-ink">
                {total > 0 ? (
                  <>
                    {pct}
                    <span className="text-[17px]">%</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
              <span className="font-num text-[13px] tabular-nums" style={{ color: 'var(--b27-deep-6)' }}>
                {total > 0 ? `완료 ${done} · 전체 ${total}` : '연결된 할 일 없음'}
              </span>
            </div>
            <span className="mt-2.5 block overflow-hidden rounded-full bg-b27-paper" aria-hidden="true">
              <span className="block h-2 rounded-full bg-b27-block-6" style={{ width: `${pct}%` }} />
            </span>
            {(period || dday) && (
              <div className="mt-2 font-num text-[12.5px] tabular-nums text-b27-muted">{[period, dday].filter(Boolean).join(' · ')}</div>
            )}
          </section>

          {/* 설명 */}
          {project.description && (
            <section>
              <div className={label}>설명</div>
              <MarkdownText text={project.description} className="break-keep text-[15px] leading-[1.75] text-b27-ink" />
            </section>
          )}

          {/* 첨부파일 */}
          {attItems.length > 0 && (
            <section>
              <div className={label}>첨부파일</div>
              <AttachmentList items={attItems} />
            </section>
          )}
        </div>

        <div className="min-[900px]:sticky min-[900px]:top-[64px]">
          {/* 할 일 — 원형 체크 · 끌어서 순서 · 마감 색 + 할 일 추가(터키석 행동 버튼) */}
          <section>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-num text-[13px] font-semibold text-b27-ink">할 일</span>
              <Link
                href={`/tasks/new?project=${project.id}`}
                className="shrink-0 rounded-full bg-b27-plus px-3.5 py-1.5 text-[12.5px] font-medium text-white transition active:opacity-80"
              >
                ＋ 할 일 추가
              </Link>
            </div>
            {tlist.length > 0 ? (
              <ProjectTaskList items={tlist} canReorder={canEdit} />
            ) : (
              <p className="rounded-2xl bg-b27-card px-4 py-3 text-xs text-b27-muted">‘＋ 할 일 추가’로 이 프로젝트의 할 일을 만들어 보세요.</p>
            )}
          </section>
        </div>
      </div>

      {/* 수정(남색) / 삭제(연한 빨강) */}
      <div className="px-5">
        {canEdit ? (
          <div className="mt-6 flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/edit`}
              className="flex-1 rounded-2xl bg-b27-ink py-3.5 text-center text-[14px] font-medium text-white transition active:opacity-80"
            >
              수정
            </Link>
            <DeleteButton id={project.id} />
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-b27-card px-4 py-3 text-center text-xs text-b27-muted">
            다른 멤버님의 프로젝트입니다. 보기·할 일 추가만 가능합니다.
          </p>
        )}
      </div>
    </main>
  )
}
