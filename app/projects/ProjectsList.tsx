'use client'

// MFH-PROJECTS-LIST-V3
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/types'
import type { MembersMap } from '@/lib/members'
import AuthorBadge from '@/components/AuthorBadge'
import { STATUSES, type StatusValue } from '@/lib/constants'
import { chip, chipOn, statusChipCls, toggle } from '@/lib/statusChip'
import {
  applyProjectFilter,
  buildProjectQuery,
  parseProjectFilter,
  type ProjectFilter,
} from '@/lib/projectFilter'
import { StatusBadge, CategoryBadge, ImportanceStars, fmtDate } from './badges'
import { ProgressRing } from './Progress'
import { useWideScreen } from '@/lib/useWideScreen'
import { useSelectionMode } from '@/lib/useSelectionMode'
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

// 요약 패널(읽기전용). 넓은 화면 우측. '편집' → /projects/[id]/edit, '상세' → /projects/[id].
function ProjectSummary({
  p,
  counts,
  detailSuffix,
  authorName,
  canEdit,
}: {
  p: Project
  counts: { total: number; done: number }
  detailSuffix: string
  authorName?: string
  canEdit: boolean
}) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-2">
      <span className="w-16 shrink-0 text-xs font-semibold text-faint">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
    </div>
  )
  const period =
    p.start_date || p.due_date
      ? `${p.start_date ? fmtDate(p.start_date) : '—'} ~ ${p.due_date ? fmtDate(p.due_date) : '—'}`
      : null
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <AuthorBadge name={authorName} />
          <h2 className="mt-1 text-lg font-bold text-ink">{p.title}</h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={`/projects/${p.id}${detailSuffix}`}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary"
          >
            상세
          </Link>
          {canEdit && (
            <Link
              href={`/projects/${p.id}/edit`}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              편집
            </Link>
          )}
        </div>
      </div>

      {p.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {p.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <ProgressRing done={counts.done} total={counts.total} />
        <span className="text-xs text-muted">
          할 일 {counts.done}/{counts.total} 완료
        </span>
      </div>

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Row label="상태">
          <StatusBadge value={p.status} />
        </Row>
        {p.importance > 0 && (
          <Row label="중요도">
            <ImportanceStars value={p.importance} />
          </Row>
        )}
        {period && <Row label="기간">{period}</Row>}
        {p.category && (
          <Row label="분류">
            <CategoryBadge value={p.category} />
          </Row>
        )}
      </div>
    </div>
  )
}

export default function ProjectsList({
  projects,
  counts,
  membersMap = {},
  currentUserId,
}: {
  projects: Project[]
  counts: Counts
  membersMap?: MembersMap
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
      if (cur && filtered.some((p) => p.id === cur)) return cur
      return filtered[0]?.id ?? null
    })
  }, [wide, filtered])

  const selectedProject = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId],
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
  const filteredIds = useMemo(() => filtered.map((p) => p.id), [filtered])
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

  return (
    <>
      {/* 컨트롤 바: 필터 / 정렬 / 선택 / 전체선택 / 모두 초기화 (sticky) */}
      <div
        className="sticky top-[64px] z-20 -mx-5 mb-3 flex flex-wrap items-center gap-2 px-5 py-2"
        style={{ background: 'var(--paper)' }}
      >
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            filterOpen || hasFilter
              ? 'border-primary text-primary'
              : 'border-line text-muted hover:border-primary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          필터
          {hasFilter && (
            <span className="ml-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            sortOpen || sortChanged
              ? 'border-primary text-primary'
              : 'border-line text-muted hover:border-primary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {sortKey === 'due' ? '마감기한' : '중요도'} {asc ? '↑' : '↓'}
        </button>

        <button
          type="button"
          onClick={sel.toggleMode}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            sel.selectMode
              ? 'border-primary bg-primary text-white'
              : 'border-line text-muted hover:border-primary'
          }`}
          aria-pressed={sel.selectMode}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          {sel.selectMode ? '선택 종료' : '선택'}
        </button>

        {sel.selectMode && (
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        )}

        {canReset && !sel.selectMode && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto flex items-center gap-1 rounded-xl border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            모두 초기화
          </button>
        )}
      </div>

      {/* 필터 칩바 (접이식) */}
      {filterOpen && (
        <div className="mb-3 space-y-2 rounded-xl border border-line bg-surface-subtle p-3">
          {/* 완료 숨김 (Tasks 목록과 동일) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-faint">완료</span>
            <button
              type="button"
              onClick={() => setHideDone((v) => !v)}
              className={`${chip} ${hideDone ? chipOn : ''}`}
            >
              완료 숨김
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-faint">상태</span>
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
              <span className="mr-1 text-[11px] font-semibold text-faint">중요도</span>
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
              <span className="mr-1 text-[11px] font-semibold text-faint">분류</span>
              {categoryOpts.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFCategory((a) => toggle(a, c))}
                  className={`${chip} ${fCategory.includes(c) ? chipOn : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 정렬 (접이식) */}
      {sortOpen && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-subtle p-3">
          <span className="mr-1 text-[11px] font-semibold text-faint">정렬</span>
          <button
            type="button"
            onClick={() => setSortKey('due')}
            className={`${chip} ${sortKey === 'due' ? chipOn : ''}`}
          >
            마감기한
          </button>
          <button
            type="button"
            onClick={() => setSortKey('importance')}
            className={`${chip} ${sortKey === 'importance' ? chipOn : ''}`}
          >
            중요도
          </button>
          <button type="button" onClick={() => setAsc((v) => !v)} className={`${chip} ml-auto`}>
            {asc ? '오름차순 ↑' : '내림차순 ↓'}
          </button>
        </div>
      )}

      {/* 리스트 */}
      {projects.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 프로젝트가 없습니다.
          <br />첫 프로젝트를 만들어 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          조건에 맞는 프로젝트가 없습니다.
        </p>
      ) : (
        (() => {
          function ProjectBody({ p, authorName }: { p: Project; authorName?: string }) {
            return (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={p.status} />
                  <CategoryBadge value={p.category} />
                  <ImportanceStars value={p.importance} />
                  {p.due_date && (
                    <span className="text-[11px] text-muted">~ {fmtDate(p.due_date)}</span>
                  )}
                  <AuthorBadge name={authorName} />
                </div>
                <div className="mt-1.5 font-bold text-ink">{p.title}</div>
                {p.description && (
                  <div className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</div>
                )}
              </>
            )
          }

          function renderItem(p: Project) {
            const c = counts[p.id] ?? { total: 0, done: 0 }
            const isSel = wide && p.id === selectedId && !sel.selectMode
            const checked = sel.isSelected(p.id)
            const inSelectMode = sel.selectMode

            return (
              <li key={p.id}>
                <div
                  className={`relative flex items-center gap-3 rounded-2xl border bg-surface p-4 ${
                    inSelectMode && checked
                      ? 'border-primary border-2'
                      : isSel
                        ? 'border-primary border-2'
                        : 'border-line'
                  }`}
                >
                  {/* 좌측: selectMode 일 때만 선택 체크박스 */}
                  {inSelectMode && <SelectionCheckbox checked={checked} />}

                  {/* 본문 wrapper: selectMode 면 button(토글), 넓은화면 button(요약선택), 좁은화면 Link(상세).
                      우측 상단 완료영역 자리 확보를 위해 pr-16. */}
                  {inSelectMode ? (
                    <button
                      type="button"
                      onClick={() => sel.toggleId(p.id)}
                      className="min-w-0 flex-1 pr-16 text-left"
                    >
                      <ProjectBody p={p} authorName={membersMap[p.user_id]} />
                    </button>
                  ) : wide ? (
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className="min-w-0 flex-1 pr-16 text-left"
                    >
                      <ProjectBody p={p} authorName={membersMap[p.user_id]} />
                    </button>
                  ) : (
                    <Link
                      href={`/projects/${p.id}${detailSuffix}`}
                      className="min-w-0 flex-1 pr-16"
                    >
                      <ProjectBody p={p} authorName={membersMap[p.user_id]} />
                    </Link>
                  )}

                  {/* ProgressRing — 본문 우측 column (기존 위치 유지, 하단 정렬) */}
                  <div className="shrink-0 self-end">
                    <ProgressRing done={c.done} total={c.total} />
                  </div>

                  {/* 우측 상단: "완료" 라벨 + ProjectStatusToggle (단건, button 중첩 회피 위해 직속 absolute) */}
                  <div className="absolute right-4 top-3 flex shrink-0 items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-faint">완료</span>
                    <ProjectStatusToggle id={p.id} status={p.status} />
                  </div>
                </div>
              </li>
            )
          }

          const list = <ul className="space-y-3">{filtered.map(renderItem)}</ul>

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
            <div className={`grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr] ${bottomPad}`}>
              <div className="min-w-0">{list}</div>
              <div className="min-w-0">
                <div
                  className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
                  style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
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
                      <p className="py-10 text-center text-sm text-faint">
                        왼쪽에서 프로젝트를 선택하세요.
                        <br />
                        <button
                          type="button"
                          onClick={toggleAll}
                          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
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
                      authorName={membersMap[selectedProject.user_id]}
                      canEdit={selectedProject.user_id === currentUserId}
                    />
                  ) : (
                    <p className="py-10 text-center text-sm text-faint">
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
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
        on
          ? 'border-primary bg-primary text-white'
          : 'border-line text-muted hover:border-primary'
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
        className="rounded-lg border border-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
      >
        삭제
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div
            className="rounded-xl border border-line p-3 shadow-lg"
            style={{ background: 'var(--paper)' }}
          >
            {open === 'status' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">상태로 변경</span>
                {STATUSES.map((s) => (
                  <Btn key={s.value} onClick={() => applyAndClose(onStatus, s.value)}>
                    {s.label}
                  </Btn>
                ))}
              </div>
            )}
            {open === 'imp' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">중요도 변경</span>
                {importanceOpts.map((n) => (
                  <Btn key={n} onClick={() => applyAndClose(onImportance, n)}>
                    {'★'.repeat(n)}
                  </Btn>
                ))}
              </div>
            )}
            {open === 'cat' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">분류 변경</span>
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
