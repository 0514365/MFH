'use client'

// MFH-PROJECTS-LIST-V4 — 2027(4-3): 요약 3칸(진행 중 · 마감 임박 7일 · 정체 14일, 탭 = 빠른 필터) · 연회색 필터 면(검색 · 완료 숨김 · 필터 · 정렬 · 선택) ·
//   상태 그룹 알약(진행 · 예정 · 완료) · 모바일 = 흰 카드(분류 틴트 · 별 · 원형 완료 · 제목 · 설명 2줄 · 로즈 진행 막대 · 마감 알약) /
//   넓은 화면 = 행(체크 · 분류 사각형 · 제목 / 작은 막대 + 완료/전체 · 마감) + 요약(진행 로즈 면).
// MFH-PROJECTS-LIST-V3
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/types'
import { canEditEntry } from '@/lib/members'
import { STATUSES, normalizeStatus, type StatusValue } from '@/lib/constants'
import { chip, chipOn, statusChipCls, toggle } from '@/lib/statusChip'
import {
  applyProjectFilter,
  buildProjectQuery,
  parseProjectFilter,
  type ProjectFilter,
} from '@/lib/projectFilter'
import { StatusBadge, CategoryBadge, ImportanceStars, fmtDate } from './badges'
import { useWideScreen } from '@/lib/useWideScreen'
import { useSelectionMode } from '@/lib/useSelectionMode'
import MarkdownText, { stripMarkdown } from '@/components/MarkdownText'
import { JOURNAL_CATEGORY_BLOCK } from '@/lib/constants'
import { blockColor, brand2027 } from '@/lib/palette'
import SelectionCheckbox from '@/components/SelectionCheckbox'
import SelectionBar from '@/components/SelectionBar'
import ProjectBulkPanel from './ProjectBulkPanel'
import ProjectStatusToggle from './ProjectStatusToggle'
import {
  bulkUpdateProjects,
  bulkDeleteProjects,
  type ProjectBulkPatch,
} from '@/lib/bulkUpdate'

type Counts = Record<string, { total: number; done: number }>
type SortKey = 'due' | 'importance'

// 오늘(로컬) 기준 날짜 계산 — 마감 임박·지남·D-day.
function todayLocal(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
function mdDow(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return d
  return `${dt.getMonth() + 1}/${dt.getDate()} (${WEEKDAY_KO[dt.getDay()]})`
}
function ddayLabel(d: string): string {
  const diff = Math.round((Date.parse(d) - Date.parse(todayLocal())) / 86400000)
  return diff === 0 ? 'D-day' : diff > 0 ? `D-${diff}` : `${-diff}일 지남`
}
type DueState = 'overdue' | 'soon' | 'normal'
function dueState(p: Project): DueState {
  if (!p.due_date || normalizeStatus(p.status) === 'done') return 'normal'
  const today = todayLocal()
  if (p.due_date < today) return 'overdue'
  if (p.due_date <= addDays(today, 7)) return 'soon'
  return 'normal'
}
function isStalled(p: Project): boolean {
  return normalizeStatus(p.status) === 'in_progress' && !!p.updated_at && p.updated_at.slice(0, 10) < addDays(todayLocal(), -14)
}

// 로즈 진행 막대(모듈색 6) + 완료/전체 · %.
function ProgressBar({ done, total, thin }: { done: number; total: number; thin?: boolean }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <span className={`block overflow-hidden rounded-full bg-b27-tint-6 ${thin ? 'h-[5px]' : 'h-2'}`} aria-hidden="true">
      <span className="block h-full rounded-full bg-b27-block-6" style={{ width: `${pct}%` }} />
    </span>
  )
}

// 마감 알약 — 지남 연한 빨강 · 임박 호박 · 그 외 연회색. "~ 12/15 (월) · D-6".
function DuePill({ p }: { p: Project }) {
  if (!p.due_date) return null
  const st = dueState(p)
  const cls =
    st === 'overdue' ? 'bg-b27-expense-soft text-b27-expense' : st === 'soon' ? 'bg-b27-wait-soft text-b27-wait' : 'bg-b27-card text-b27-ink'
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-num text-[12px] font-semibold tabular-nums ${cls}`}>
      ~ {mdDow(p.due_date)}
      {st !== 'normal' ? ` · ${ddayLabel(p.due_date)}` : ''}
    </span>
  )
}

// 상태 그룹 알약 색
const STATUS_GROUP: { key: StatusValue; label: string; bg: string; fg: string; sq: string }[] = [
  { key: 'in_progress', label: '진행', bg: 'var(--b27-tint-8)', fg: 'var(--b27-deep-8)', sq: 'var(--b27-block-8)' },
  { key: 'upcoming', label: '예정', bg: 'var(--b27-card)', fg: 'var(--b27-ink)', sq: 'var(--b27-muted)' },
  { key: 'done', label: '완료', bg: 'var(--b27-tint-4)', fg: 'var(--b27-deep-4)', sq: 'var(--b27-block-4)' },
]

// 요약 패널(읽기전용). 넓은 화면 우측 — 메타 · 제목 · 진행 로즈 면 · 설명. '편집' → /projects/[id]/edit, '상세' → /projects/[id].
function ProjectSummary({
  p,
  counts,
  detailSuffix,
  canEdit,
}: {
  p: Project
  counts: { total: number; done: number }
  detailSuffix: string
  canEdit: boolean
}) {
  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0
  const period =
    p.start_date || p.due_date
      ? `${p.start_date ? fmtDate(p.start_date) : '—'} ~ ${p.due_date ? fmtDate(p.due_date) : '—'}`
      : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge value={p.category} />
            <ImportanceStars value={p.importance} size="md" />
            <StatusBadge value={p.status} />
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-b27-ink">{p.title}</h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={`/projects/${p.id}${detailSuffix}`}
            className="rounded-full bg-b27-card px-3.5 py-2 text-xs font-medium text-b27-ink transition active:opacity-70"
          >
            상세
          </Link>
          {canEdit && (
            <Link
              href={`/projects/${p.id}/edit`}
              className="rounded-full bg-b27-ink px-4 py-2 text-xs font-medium text-white transition active:opacity-80"
            >
              편집
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-b27-tint-6 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-num text-[28px] font-semibold leading-none tabular-nums text-b27-ink">
            {counts.total > 0 ? `${pct}%` : '—'}
          </span>
          <span className="font-num text-[13px] tabular-nums" style={{ color: 'var(--b27-deep-6)' }}>
            {counts.total > 0 ? `완료 ${counts.done} · 전체 ${counts.total}` : '할 일 없음'}
            {p.due_date && normalizeStatus(p.status) !== 'done' ? ` · ${ddayLabel(p.due_date)}` : ''}
          </span>
        </div>
        <span className="mt-2.5 block overflow-hidden rounded-full bg-b27-paper" aria-hidden="true">
          <span className="block h-2 rounded-full bg-b27-block-6" style={{ width: `${pct}%` }} />
        </span>
        {period && <div className="mt-2 font-num text-[12px] text-b27-muted">{period}</div>}
      </div>

      {p.description && (
        <div>
          <div className="mb-1 font-num text-[12px] font-medium text-b27-muted">설명</div>
          <MarkdownText text={p.description} className="break-keep text-sm leading-relaxed text-b27-ink" />
        </div>
      )}
    </div>
  )
}

export default function ProjectsList({
  projects,
  counts,
  currentUserId,
}: {
  projects: Project[]
  counts: Counts
  currentUserId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // URL 쿼리에서 초기 필터/정렬을 읽는다(새로고침·뒤로가기·상세 왕복에도 유지).
  const initial = useMemo(
    () => parseProjectFilter(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [hideDone, setHideDone] = useState(initial.hideDone)
  const [fStatus, setFStatus] = useState<StatusValue[]>(initial.fStatus)
  const [fImportance, setFImportance] = useState<number[]>(initial.fImportance)
  const [fCategory, setFCategory] = useState<string[]>(initial.fCategory)
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey)
  const [asc, setAsc] = useState(initial.asc)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

  // 다중선택 모드 (모듈 무관 hook).
  const sel = useSelectionMode()
  const [busy, setBusy] = useState(false)

  // 필터/정렬 → URL 쿼리 동기화
  useEffect(() => {
    const f: ProjectFilter = { hideDone, fStatus, fImportance, fCategory, sortKey, asc }
    const qs = buildProjectQuery(f)
    const current = searchParams.toString()
    if (qs === current) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [hideDone, fStatus, fImportance, fCategory, sortKey, asc, pathname, router, searchParams])

  const importanceOpts = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.importance).filter((n): n is number => !!n))).sort(
        (a, b) => b - a,
      ),
    [projects],
  )
  const categoryOpts = useMemo(
    () =>
      Array.from(
        new Set(projects.map((p) => p.category).filter((c): c is string => !!c)),
      ).sort(),
    [projects],
  )

  const filtered = useMemo(
    () => applyProjectFilter(projects, { hideDone, fStatus, fImportance, fCategory, sortKey, asc }),
    [projects, hideDone, fStatus, fImportance, fCategory, sortKey, asc],
  )

  // 검색(제목·설명) + 요약 칸 빠른 필터 — URL 비동기화, 목록 표시용.
  const [q, setQ] = useState('')
  const [quick, setQuick] = useState<null | 'progress' | 'soon' | 'stalled'>(null)
  const view = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return filtered.filter((p) => {
      if (qq && !`${p.title} ${p.description ?? ''}`.toLowerCase().includes(qq)) return false
      if (quick === 'progress' && normalizeStatus(p.status) !== 'in_progress') return false
      if (quick === 'soon' && dueState(p) === 'normal') return false
      if (quick === 'stalled' && !isStalled(p)) return false
      return true
    })
  }, [filtered, q, quick])
  const stats = useMemo(() => {
    let progress = 0
    let soon = 0
    let stalled = 0
    for (const p of projects) {
      if (normalizeStatus(p.status) === 'in_progress') progress += 1
      if (dueState(p) !== 'normal') soon += 1
      if (isStalled(p)) stalled += 1
    }
    return { progress, soon, stalled }
  }, [projects])

  const detailQuery = useMemo(
    () => buildProjectQuery({ hideDone, fStatus, fImportance, fCategory, sortKey, asc }),
    [hideDone, fStatus, fImportance, fCategory, sortKey, asc],
  )
  const detailSuffix = detailQuery ? `?${detailQuery}` : ''

  useEffect(() => {
    if (!wide) {
      setSelectedId(null)
      return
    }
    setSelectedId((cur) => {
      if (cur && view.some((p) => p.id === cur)) return cur
      return view[0]?.id ?? null
    })
  }, [wide, view])

  const selectedProject = useMemo(
    () => view.find((p) => p.id === selectedId) ?? null,
    [view, selectedId],
  )

  const activeCount =
    (hideDone ? 0 : 1) + fStatus.length + fImportance.length + fCategory.length
  const hasFilter = activeCount > 0
  const sortChanged = sortKey !== 'due' || !asc
  const canReset = hasFilter || sortChanged

  function resetAll() {
    setHideDone(true)
    setFStatus([])
    setFImportance([])
    setFCategory([])
    setSortKey('due')
    setAsc(true)
  }

  // ───── 일괄변경 액션 ─────
  const filteredIds = useMemo(() => view.map((p) => p.id), [view])
  const allSelected =
    sel.count > 0 && filteredIds.length > 0 && filteredIds.every((id) => sel.selected.has(id))

  async function runBulk(patch: ProjectBulkPatch) {
    if (busy || sel.count === 0) return
    setBusy(true)
    try {
      const ids = Array.from(sel.selected)
      const res = await bulkUpdateProjects(ids, patch)
      if (!res.ok) {
        alert(`변경 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runDelete() {
    if (busy || sel.count === 0) return
    if (
      !confirm(`${sel.count}개 프로젝트를 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)
    )
      return
    setBusy(true)
    try {
      const ids = Array.from(sel.selected)
      const res = await bulkDeleteProjects(ids)
      if (!res.ok) {
        alert(`삭제 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function toggleAll() {
    if (allSelected) sel.clear()
    else sel.selectAll(filteredIds)
  }

  const filterCount = fStatus.length + fImportance.length + fCategory.length
  const pillBtn = 'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:opacity-70'
  const pillOff = 'bg-b27-paper text-b27-muted'
  const pillOn = 'bg-b27-ink text-white'

  return (
    <>
      {/* 요약 3칸 — 진행 중 · 마감 임박(지남 포함, 7일) · 정체(14일). 탭 = 빠른 필터 토글. */}
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        {(
          [
            ['progress', stats.progress, '진행 중', 'bg-b27-tint-8', 'var(--b27-deep-8)'],
            ['soon', stats.soon, '마감 임박', 'bg-b27-wait-soft', 'var(--b27-wait)'],
            ['stalled', stats.stalled, '정체', 'bg-b27-card', 'var(--b27-muted)'],
          ] as const
        ).map(([k, n, l, bg, fg]) => (
          <button
            key={k}
            type="button"
            onClick={() => setQuick((cur) => (cur === k ? null : k))}
            aria-pressed={quick === k}
            className={`flex flex-col items-start gap-0.5 rounded-2xl px-3 py-2.5 transition active:opacity-70 ${bg} ${quick === k ? 'ring-2 ring-b27-ink' : ''}`}
            style={{ color: fg }}
          >
            <span className="font-num text-[24px] font-semibold leading-none tabular-nums">{n}</span>
            <span className="text-[12px] font-medium">{l}</span>
          </button>
        ))}
      </div>

      {/* 컨트롤 바: 연회색 필터 면 — 흰 검색 알약 + 완료 숨김·필터·정렬·선택 흰 알약 (sticky, 헤더 52px 아래) */}
      <div className="sticky top-[52px] z-20 -mx-5 mb-2 bg-b27-paper px-5 pb-2 pt-1">
        <div className="space-y-2.5 rounded-2xl bg-b27-card p-2.5">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·설명 검색"
            className="w-full rounded-full bg-b27-paper px-4 py-2 text-sm text-b27-ink outline-none placeholder:text-b27-muted"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setHideDone((v) => !v)} className={`${pillBtn} ${hideDone ? pillOn : pillOff}`} aria-pressed={hideDone}>
              완료 숨김
            </button>
            <button type="button" onClick={() => setFilterOpen((v) => !v)} className={`${pillBtn} ${filterOpen || filterCount > 0 ? pillOn : pillOff}`} aria-expanded={filterOpen}>
              필터{filterCount > 0 ? ` ${filterCount}` : ''}
            </button>
            <button type="button" onClick={() => setSortOpen((v) => !v)} className={`${pillBtn} ${sortOpen || sortChanged ? pillOn : pillOff}`} aria-expanded={sortOpen}>
              정렬 · {sortKey === 'due' ? '마감' : '중요도'} {asc ? '↑' : '↓'}
            </button>
            <button type="button" onClick={sel.toggleMode} className={`${pillBtn} ${sel.selectMode ? pillOn : pillOff}`} aria-pressed={sel.selectMode}>
              {sel.selectMode ? '선택 종료' : '선택'}
            </button>
            {sel.selectMode && (
              <button type="button" onClick={toggleAll} className={`${pillBtn} ${pillOff}`}>
                {allSelected ? '전체 해제' : '전체 선택'}
              </button>
            )}
            {(canReset || quick || q) && !sel.selectMode && (
              <button
                type="button"
                onClick={() => {
                  resetAll()
                  setQuick(null)
                  setQ('')
                }}
                className={`${pillBtn} ml-auto bg-transparent text-b27-muted`}
              >
                초기화
              </button>
            )}
          </div>

          {filterOpen && (
            <div className="space-y-2.5 border-t-2 border-b27-paper pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 w-12 font-num text-[11px] font-medium text-b27-muted">상태</span>
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFStatus((a) => toggle(a, s.value))}
                    className={statusChipCls(s.value, fStatus.includes(s.value))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {importanceOpts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 w-12 font-num text-[11px] font-medium text-b27-muted">중요도</span>
                  {importanceOpts.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFImportance((a) => toggle(a, n))}
                      className={`${chip} ${fImportance.includes(n) ? chipOn : ''}`}
                    >
                      {'★'.repeat(n)}
                    </button>
                  ))}
                </div>
              )}
              {categoryOpts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 w-12 font-num text-[11px] font-medium text-b27-muted">분류</span>
                  {categoryOpts.map((c) => {
                    const n = JOURNAL_CATEGORY_BLOCK[c]
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFCategory((a) => toggle(a, c))}
                        className={`${chip} ${fCategory.includes(c) ? chipOn : ''}`}
                      >
                        <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: n ? blockColor(n).bg : brand2027.line }} aria-hidden="true" />
                        {c}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {sortOpen && (
            <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-b27-paper pt-2.5">
              <span className="mr-1 w-12 font-num text-[11px] font-medium text-b27-muted">정렬</span>
              <button type="button" onClick={() => setSortKey('due')} className={`${chip} ${sortKey === 'due' ? chipOn : ''}`}>
                마감기한
              </button>
              <button type="button" onClick={() => setSortKey('importance')} className={`${chip} ${sortKey === 'importance' ? chipOn : ''}`}>
                중요도
              </button>
              <button type="button" onClick={() => setAsc((v) => !v)} className={`${chip} ml-auto`}>
                {asc ? '오름차순 ↑' : '내림차순 ↓'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 리스트 */}
      {projects.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          아직 프로젝트가 없습니다.
          <br />첫 프로젝트를 만들어 보세요.
        </p>
      ) : view.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          조건에 맞는 프로젝트가 없습니다.
        </p>
      ) : (
        (() => {
          function renderItem(p: Project) {
            const c = counts[p.id] ?? { total: 0, done: 0 }
            const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0
            const isSel = wide && p.id === selectedId && !sel.selectMode
            const checked = sel.isSelected(p.id)
            const inSelectMode = sel.selectMode
            const emphasized = (inSelectMode && checked) || isSel
            const isDone = normalizeStatus(p.status) === 'done'

            // ── 모바일: 흰 카드 ──
            if (!wide) {
              const body = (
                <span className="flex flex-col gap-2">
                  <span className={`block text-[17px] font-semibold leading-snug ${isDone ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>
                    {p.title}
                  </span>
                  {p.description && (
                    <span className="line-clamp-2 text-[13.5px] leading-relaxed text-[#4A5072]">{stripMarkdown(p.description)}</span>
                  )}
                  {c.total > 0 && (
                    <span className="flex items-center gap-2.5">
                      <span className="min-w-0 flex-1">
                        <ProgressBar done={c.done} total={c.total} />
                      </span>
                      <span className="shrink-0 font-num text-[12.5px] font-semibold tabular-nums text-b27-ink">
                        {c.done}/{c.total} · {pct}%
                      </span>
                    </span>
                  )}
                  {(p.due_date || isStalled(p)) && (
                    <span className="flex flex-wrap gap-1.5">
                      <DuePill p={p} />
                      {isStalled(p) && (
                        <span className="inline-flex items-center rounded-full bg-b27-card px-2.5 py-0.5 text-[11.5px] text-b27-muted">정체</span>
                      )}
                    </span>
                  )}
                </span>
              )
              return (
                <li
                  key={p.id}
                  className={`flex flex-col gap-2 rounded-[20px] bg-b27-paper p-4 ${emphasized ? 'ring-2 ring-b27-ink' : 'ring-1 ring-b27-line'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {inSelectMode && <SelectionCheckbox checked={checked} />}
                      <CategoryBadge value={p.category} />
                      <ImportanceStars value={p.importance} size="md" />
                      {normalizeStatus(p.status) === 'upcoming' && !p.category && <StatusBadge value={p.status} />}
                    </span>
                    {!inSelectMode && <ProjectStatusToggle id={p.id} status={p.status} />}
                  </div>
                  {inSelectMode ? (
                    <button type="button" onClick={() => sel.toggleId(p.id)} className="text-left">
                      {body}
                    </button>
                  ) : (
                    <Link href={`/projects/${p.id}${detailSuffix}`} className="block active:opacity-80">
                      {body}
                    </Link>
                  )}
                </li>
              )
            }

            // ── 넓은 화면: 행 ──
            const n = p.category ? JOURNAL_CATEGORY_BLOCK[p.category] : undefined
            const st = dueState(p)
            return (
              <li key={p.id} className="border-b border-b27-line last:border-b-0">
                <div className={`flex items-center gap-3 rounded-xl px-2 py-[11px] ${emphasized ? 'bg-b27-card' : ''}`}>
                  {inSelectMode ? <SelectionCheckbox checked={checked} /> : <ProjectStatusToggle id={p.id} status={p.status} />}
                  <button
                    type="button"
                    onClick={() => (inSelectMode ? sel.toggleId(p.id) : setSelectedId(p.id))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
                  >
                    <span className="inline-block h-[9px] w-[9px] shrink-0 rounded-[3px]" style={{ background: n ? blockColor(n).bg : brand2027.line }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] font-medium leading-snug ${isDone ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>
                        {p.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        {c.total > 0 && (
                          <span className="w-[120px] shrink-0">
                            <ProgressBar done={c.done} total={c.total} thin />
                          </span>
                        )}
                        <span className={`truncate font-num text-[12px] tabular-nums ${st === 'overdue' ? 'font-semibold text-b27-expense' : st === 'soon' ? 'font-semibold text-b27-wait' : 'text-b27-muted'}`}>
                          {[c.total > 0 ? `${c.done}/${c.total}` : '할 일 없음', p.due_date ? `~${mdDow(p.due_date)}${st !== 'normal' ? ` ${ddayLabel(p.due_date)}` : ''}` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </span>
                    <ImportanceStars value={p.importance} size="md" />
                  </button>
                </div>
              </li>
            )
          }

          // 상태 그룹(진행 · 예정 · 완료) — 각 그룹 안은 기존 정렬 유지.
          const list = (
            <div className="space-y-4">
              {STATUS_GROUP.map((g) => {
                const items = view.filter((p) => normalizeStatus(p.status) === g.key)
                if (items.length === 0) return null
                return (
                  <section key={g.key}>
                    <h2 className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: g.bg, color: g.fg }}>
                      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: g.sq }} aria-hidden="true" />
                      {g.label}
                      <span className="font-num font-medium tabular-nums text-b27-muted">{items.length}</span>
                    </h2>
                    <ul className={wide ? '' : 'flex flex-col gap-2.5'}>{items.map(renderItem)}</ul>
                  </section>
                )
              })}
            </div>
          )

          // sticky bar 가림 방지용 하단 여백(selectMode 일 때만)
          const bottomPad = sel.selectMode && sel.count > 0 ? 'pb-32' : ''

          // 좁은 화면: 목록 + (선택모드면 하단 SelectionBar)
          if (!wide)
            return (
              <>
                <div className={bottomPad}>{list}</div>
                {sel.selectMode && sel.count > 0 && (
                  <SelectionBar
                    count={sel.count}
                    onCancel={sel.exit}
                    onSelectAll={toggleAll}
                    allSelected={allSelected}
                  >
                    <ProjectBulkActionsRow
                      busy={busy}
                      categoryOpts={categoryOpts}
                      importanceOpts={importanceOpts}
                      onStatus={(s) => runBulk({ status: s })}
                      onImportance={(n) => runBulk({ importance: n })}
                      onCategory={(c) => runBulk({ category: c })}
                      onDelete={runDelete}
                    />
                  </SelectionBar>
                )}
              </>
            )

          // 넓은 화면: 좌 목록 / 우(평소=요약 / selectMode=일괄변경 패널).
          const selCounts = selectedProject
            ? counts[selectedProject.id] ?? { total: 0, done: 0 }
            : { total: 0, done: 0 }
          return (
            <div className={`grid grid-cols-1 gap-5 @xl:grid-cols-[1fr_1.1fr] ${bottomPad}`}>
              <div className="min-w-0">{list}</div>
              <div className="min-w-0">
                <div
                  className="sticky top-[150px] rounded-2xl bg-b27-paper p-1"
                  style={{ maxHeight: 'calc(100vh - 170px)', overflowY: 'auto' }}
                >
                  {sel.selectMode ? (
                    sel.count > 0 ? (
                      <ProjectBulkPanel
                        count={sel.count}
                        busy={busy}
                        categoryOpts={categoryOpts}
                        importanceOpts={importanceOpts}
                        onStatus={(s) => runBulk({ status: s })}
                        onImportance={(n) => runBulk({ importance: n })}
                        onCategory={(c) => runBulk({ category: c })}
                        onDelete={runDelete}
                      />
                    ) : (
                      <p className="py-10 text-center text-sm text-b27-muted">
                        왼쪽에서 프로젝트를 선택하세요.
                        <br />
                        <button
                          type="button"
                          onClick={toggleAll}
                          className="mt-3 rounded-full bg-b27-card px-3.5 py-1.5 text-xs font-medium text-b27-ink transition active:opacity-70"
                        >
                          보이는 항목 전체 선택
                        </button>
                      </p>
                    )
                  ) : selectedProject ? (
                    <ProjectSummary
                      p={selectedProject}
                      counts={selCounts}
                      detailSuffix={detailSuffix}
                      canEdit={canEditEntry(selectedProject.user_id, currentUserId)}
                    />
                  ) : (
                    <p className="py-10 text-center text-sm text-b27-muted">
                      왼쪽에서 프로젝트를 선택하세요.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })()
      )}
    </>
  )
}

// 좁은화면 SelectionBar 내부 액션 chip row.
function ProjectBulkActionsRow({
  busy,
  categoryOpts,
  importanceOpts,
  onStatus,
  onImportance,
  onCategory,
  onDelete,
}: {
  busy: boolean
  categoryOpts: string[]
  importanceOpts: number[]
  onStatus: (s: StatusValue) => void
  onImportance: (n: number) => void
  onCategory: (c: string | null) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState<null | 'status' | 'imp' | 'cat'>(null)
  const Btn = ({
    children,
    on,
    onClick,
  }: {
    children: React.ReactNode
    on?: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition active:opacity-70 disabled:opacity-50 ${
        on ? 'bg-b27-ink text-white' : 'bg-b27-card text-b27-ink'
      }`}
    >
      {children}
    </button>
  )

  function tap(kind: 'status' | 'imp' | 'cat') {
    setOpen((cur) => (cur === kind ? null : kind))
  }

  function applyAndClose<T>(fn: (v: T) => void, v: T) {
    setOpen(null)
    fn(v)
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <Btn on={open === 'status'} onClick={() => tap('status')}>
        상태
      </Btn>
      {importanceOpts.length > 0 && (
        <Btn on={open === 'imp'} onClick={() => tap('imp')}>
          중요도
        </Btn>
      )}
      {categoryOpts.length > 0 && (
        <Btn on={open === 'cat'} onClick={() => tap('cat')}>
          분류
        </Btn>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded-full bg-b27-expense-soft px-3 py-1.5 text-[11px] font-medium text-b27-expense transition active:opacity-70 disabled:opacity-50"
      >
        삭제
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div
            className="rounded-2xl bg-b27-paper p-3 shadow-[0_8px_28px_-8px_rgba(43,49,96,0.25)]"
          >
            {open === 'status' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">상태로 변경</span>
                {STATUSES.map((s) => (
                  <Btn key={s.value} onClick={() => applyAndClose(onStatus, s.value)}>
                    {s.label}
                  </Btn>
                ))}
              </div>
            )}
            {open === 'imp' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">중요도 변경</span>
                {importanceOpts.map((n) => (
                  <Btn key={n} onClick={() => applyAndClose(onImportance, n)}>
                    {'★'.repeat(n)}
                  </Btn>
                ))}
              </div>
            )}
            {open === 'cat' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">분류 변경</span>
                {categoryOpts.map((c) => (
                  <Btn key={c} onClick={() => applyAndClose(onCategory, c)}>
                    {c}
                  </Btn>
                ))}
                <Btn onClick={() => applyAndClose(onCategory, null)}>분류 제거</Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
