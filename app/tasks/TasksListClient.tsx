'use client'

// MFH-TASKS-LIST-V8
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { STATUSES, type StatusValue } from '@/lib/constants'
import {
  parseTaskFilter,
  buildTaskQuery,
  applyTaskFilter,
  isDefaultTaskFilter,
  readTaskFilter,
  saveTaskFilter,
  clearTaskFilter,
  type TaskFilter,
} from '@/lib/taskFilter'
import { chip, chipOn, statusChipCls, toggle } from '@/lib/statusChip'
import { fmtTime } from '@/lib/calendar'
import { canEditEntry } from '@/lib/members'
import { StatusBadge, CategoryBadge, ImportanceStars } from '../projects/badges'
import { useWideScreen } from '@/lib/useWideScreen'
import {
  taskGroupOf,
  TASK_GROUP_LABEL,
  TASK_GROUP_ORDER,
  type TaskGroupKey,
} from '@/lib/taskGroups'
import TaskCheck from './TaskCheck'
import { useSelectionMode } from '@/lib/useSelectionMode'
import MarkdownText from '@/components/MarkdownText'
import SelectionCheckbox from '@/components/SelectionCheckbox'
import SelectionBar from '@/components/SelectionBar'
import TaskBulkPanel from './TaskBulkPanel'
import {
  bulkUpdateTasks,
  bulkDeleteTasks,
  bulkDuplicateTasks,
  type TaskBulkPatch,
  type TaskCopyInput,
} from '@/lib/bulkUpdate'
import { requestBadgeRefresh } from '@/lib/badge'
import RecurrenceBadge from '@/components/RecurrenceBadge'

export type TaskListRow = {
  id: string
  title: string
  description: string | null
  done: boolean
  priority: string
  importance: number
  status: string | null
  category: string | null
  due_date: string | null
  due_time: string | null
  place_name: string | null
  project_id: string | null
  user_id: string
  recurrence_id: string | null
  recurrence_freq: string | null
  projects: { title: string } | null
}

type SortKey = 'due' | 'importance'

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
// 마감일(YYYY-MM-DD) → "5/30(금)". 잘못된 값이면 원문 반환.
function fmtDueShort(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return d
  return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEKDAY_KO[dt.getDay()]})`
}
// 마감일이 오늘 이전이면 연체.
function isOverdue(d: string): boolean {
  const now = new Date()
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return d < today
}
// 마감일이 오늘~+2일 이내면 임박.
function isSoon(d: string): boolean {
  const now = new Date()
  const base = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  const today = base.toISOString().slice(0, 10)
  base.setDate(base.getDate() + 2)
  const soonMax = base.toISOString().slice(0, 10)
  return d >= today && d <= soonMax
}
// 카드 좌측 긴급도 밴드 — 완료=초록 / 지남=red / 임박=orange / 그 외=옅은 회색.
function bandColor(t: TaskListRow): string {
  if (t.done) return '#0F6E56'
  if (t.due_date) {
    if (isOverdue(t.due_date)) return '#B61821'
    if (isSoon(t.due_date)) return '#D97706'
  }
  return '#C9C4BE'
}
// 하단 메타 칩(프로젝트·분류·장소). 아이콘 + 라벨.
function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-muted">
      <span className="shrink-0 text-faint">{icon}</span>
      <span className="max-w-[120px] truncate">{label}</span>
    </span>
  )
}
const taskMetaIcon = {
  project: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>),
  place: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>),
  tag: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.5" /></svg>),
}

// ───── 복제 제목 자동번호 ─────
// "원제목 (사본)" / "(사본 2)" 접미사를 떼어 원제목만. (중복 복제 시 접미사 누적 방지)
function baseTitle(title: string): string {
  const stripped = title.replace(/\s*\(사본(?:\s*\d+)?\)\s*$/, '').trim()
  return stripped || title.trim()
}
// 기존 제목과 겹치지 않는 "(사본)/(사본 N)" 제목. 생성분도 existing 에 즉시 더해 일괄복제끼리도 안 겹침.
function uniqueCopyTitle(base: string, existing: Set<string>): string {
  const first = `${base} (사본)`
  if (!existing.has(first)) {
    existing.add(first)
    return first
  }
  let n = 2
  while (existing.has(`${base} (사본 ${n})`)) n++
  const result = `${base} (사본 ${n})`
  existing.add(result)
  return result
}

// 요약 패널(읽기전용). 넓은 화면 우측. '편집' 버튼 → /tasks/[id]/edit.
function TaskSummary({
  t,
  canEdit,
  editSuffix,
}: {
  t: TaskListRow
  canEdit: boolean
  editSuffix: string
}) {
  const overdue = !!t.due_date && !t.done && isOverdue(t.due_date)
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-2">
      <span className="w-16 shrink-0 text-xs font-semibold text-faint">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
    </div>
  )
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`mt-1 text-lg font-bold ${t.done ? 'text-faint line-through' : 'text-ink'}`}>
            {t.title}
          </h2>
          {t.recurrence_id && (
            <div className="mt-1.5">
              <RecurrenceBadge freq={t.recurrence_freq} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/tasks/new?from=${t.id}`}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary"
          >
            복제
          </Link>
          {canEdit && (
            <Link
              href={`/tasks/${t.id}/edit${editSuffix}`}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              편집
            </Link>
          )}
        </div>
      </div>

      {t.description && (
        <MarkdownText
          text={t.description}
          className="mt-3 break-keep text-sm leading-relaxed text-muted"
        />
      )}

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Row label="상태">
          <StatusBadge value={t.status ?? 'upcoming'} />
        </Row>
        {t.importance > 0 && (
          <Row label="중요도">
            <ImportanceStars value={t.importance} />
          </Row>
        )}
        {t.due_date && (
          <Row label="마감">
            <span className={overdue ? 'text-danger' : ''}>
              {fmtDueShort(t.due_date)}
              {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
              {overdue ? ' · 연체' : ''}
            </span>
          </Row>
        )}
        {t.place_name && <Row label="장소">📍 {t.place_name}</Row>}
        {t.category && (
          <Row label="분류">
            <CategoryBadge value={t.category} />
          </Row>
        )}
        {t.projects?.title && <Row label="프로젝트">{t.projects.title}</Row>}
        <Row label="완료">{t.done ? '완료됨' : '미완료'}</Row>
      </div>
    </div>
  )
}

export default function TasksListClient({
  tasks,
  currentUserId,
}: {
  tasks: TaskListRow[]
  currentUserId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // URL 쿼리 → 초기 필터(새로고침·뒤로가기·상세왕복까지 영속). 로그아웃 시 /login 이동으로 자동 소멸.
  const init = parseTaskFilter(searchParams)

  const [hideDone, setHideDone] = useState(init.hideDone)
  const [fStatus, setFStatus] = useState<StatusValue[]>(init.fStatus)
  const [fImportance, setFImportance] = useState<number[]>(init.fImportance)
  const [fCategory, setFCategory] = useState<string[]>(init.fCategory)
  const [fProject, setFProject] = useState<string[]>(init.fProject)
  const [q, setQ] = useState(init.q)
  const [sortKey, setSortKey] = useState<SortKey>(init.sortKey)
  const [asc, setAsc] = useState(init.asc)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

  // 다중선택 모드 (모듈 무관 hook). selectMode 진입시 카드 탭=토글, 평소엔 상세 직행/요약 선택.
  const sel = useSelectionMode()
  const [busy, setBusy] = useState(false)
  // 세션 복원 완료 플래그(복원 전엔 sessionStorage 저장 보류 → 기본값 덮어쓰기 방지)
  const [restored, setRestored] = useState(false)

  // 필터 변경 → URL 쿼리 동기화(기본값이면 쿼리 제거). 목록 상태가 URL 에 영속.
  const currentFilter: TaskFilter = {
    hideDone,
    fStatus,
    fImportance,
    fCategory,
    fProject,
    q,
    sortKey,
    asc,
  }
  const detailSuffix = (() => {
    const query = buildTaskQuery(currentFilter)
    return query ? `?${query}` : ''
  })()
  useEffect(() => {
    const query = buildTaskQuery(currentFilter)
    router.replace(query ? `/tasks?${query}` : '/tasks', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideDone, fStatus, fImportance, fCategory, fProject, q, sortKey, asc])

  // 마운트 시 1회: URL 에 필터가 없으면(기본값) 세션에 저장된 필터를 복원.
  // (URL 쿼리가 있으면 공유 링크 우선 → 복원 건너뜀.) 편집 왕복 등으로 쿼리가 사라져도 유지.
  useEffect(() => {
    if (isDefaultTaskFilter(init)) {
      const saved = readTaskFilter()
      if (saved && !isDefaultTaskFilter(saved)) {
        setHideDone(saved.hideDone)
        setFStatus(saved.fStatus)
        setFImportance(saved.fImportance)
        setFCategory(saved.fCategory)
        setFProject(saved.fProject)
        setQ(saved.q)
        setSortKey(saved.sortKey)
        setAsc(saved.asc)
      }
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 필터 변경을 세션에 저장(복원 완료 후부터). 탭 종료 전까지 유지, '모두 초기화' 시 제거.
  useEffect(() => {
    if (!restored) return
    saveTaskFilter(currentFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, hideDone, fStatus, fImportance, fCategory, fProject, q, sortKey, asc])

  // 데이터에 실제로 존재하는 값만 칩으로 노출
  const importanceOpts = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.importance).filter((n): n is number => !!n))).sort(
        (a, b) => b - a,
      ),
    [tasks],
  )
  const categoryOpts = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))).sort(),
    [tasks],
  )
  const projectOpts = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tasks) {
      if (t.project_id && t.projects?.title) map.set(t.project_id, t.projects.title)
    }
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    )
  }, [tasks])
  // 장소 일괄변경용: 데이터에 존재하는 distinct 장소(빠른선택 칩)
  const placeOpts = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.place_name).filter((p): p is string => !!p))).sort(),
    [tasks],
  )

  // 필터/정렬을 lib 순수함수에 위임 → 상세(tasks/[id]) ◀▶ 와 동일 정렬 공유.
  const filtered = useMemo(
    () => applyTaskFilter(tasks, currentFilter),
    [tasks, hideDone, fStatus, fImportance, fCategory, fProject, q, sortKey, asc],
  )

  // 넓은 화면: 선택이 비었거나 목록에서 사라지면 첫 항목 자동선택. 좁은 화면: 선택 해제.
  useEffect(() => {
    if (!wide) {
      setSelectedId(null)
      return
    }
    setSelectedId((cur) => {
      if (cur && filtered.some((t) => t.id === cur)) return cur
      return filtered[0]?.id ?? null
    })
  }, [wide, filtered])

  const selectedTask = useMemo(
    () => filtered.find((t) => t.id === selectedId) ?? null,
    [filtered, selectedId],
  )

  const activeCount =
    (hideDone ? 0 : 1) + fStatus.length + fImportance.length + fCategory.length + fProject.length
  const hasFilter = activeCount > 0
  const hasQuery = q.trim().length > 0
  const sortChanged = sortKey !== 'due' || !asc
  const canReset = hasFilter || sortChanged || hasQuery

  function resetAll() {
    setHideDone(true)
    setFStatus([])
    setFImportance([])
    setFCategory([])
    setFProject([])
    setQ('')
    setSortKey('due')
    setAsc(true)
    clearTaskFilter()
  }

  // ───── 일괄변경 액션 ─────
  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered])
  const allSelected =
    sel.count > 0 && filteredIds.length > 0 && filteredIds.every((id) => sel.selected.has(id))

  async function runBulk(patch: TaskBulkPatch) {
    if (busy || sel.count === 0) return
    setBusy(true)
    try {
      const ids = Array.from(sel.selected)
      const res = await bulkUpdateTasks(ids, patch)
      if (!res.ok) {
        alert(`변경 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      requestBadgeRefresh()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runDuplicate() {
    if (busy || sel.count === 0) return
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }
    if (!confirm(`${sel.count}개 할 일을 복제할까요?`)) return
    setBusy(true)
    try {
      const picked = tasks.filter((t) => sel.selected.has(t.id))
      // 기존 제목 + 생성분으로 자동번호(중복 방지).
      const existing = new Set(tasks.map((t) => t.title))
      const copies: TaskCopyInput[] = picked.map((t) => ({
        user_id: currentUserId,
        title: uniqueCopyTitle(baseTitle(t.title), existing),
        description: t.description,
        project_id: t.project_id,
        category: t.category,
        place_name: t.place_name,
        priority: t.priority,
        importance: t.importance,
        status: t.status === 'done' ? 'upcoming' : (t.status ?? 'upcoming'),
        due_date: t.due_date,
        due_time: t.due_time,
        done: false,
        completed_at: null,
      }))
      const res = await bulkDuplicateTasks(copies)
      if (!res.ok) {
        alert(`복제 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      requestBadgeRefresh()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runDelete() {
    if (busy || sel.count === 0) return
    if (!confirm(`${sel.count}개 할 일을 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setBusy(true)
    try {
      const ids = Array.from(sel.selected)
      const res = await bulkDeleteTasks(ids)
      if (!res.ok) {
        alert(`삭제 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      requestBadgeRefresh()
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
      {/* 컨트롤 바: 검색 + (필터 / 정렬 / 선택 / 모두 초기화) (sticky) */}
      <div
        className="sticky top-[64px] z-20 -mx-5 mb-3 space-y-2 px-5 py-2"
        style={{ background: 'var(--paper)' }}
      >
        {/* 검색 — 제목·설명·장소 부분일치 */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·설명·장소 검색"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-9 text-sm text-ink outline-none focus:border-primary"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="검색 지우기"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-faint transition hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 토글 바 */}
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {/* 필터 칩바 (접이식) */}
      {filterOpen && (
        <div className="mb-3 space-y-2 rounded-xl border border-line bg-surface-subtle p-3">
          {/* 완료 숨김 */}
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

          {/* 상태 */}
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

          {projectOpts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-faint">프로젝트</span>
              {projectOpts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFProject((a) => toggle(a, p.id))}
                  className={`${chip} ${fProject.includes(p.id) ? chipOn : ''}`}
                >
                  {p.title}
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
      {tasks.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 할 일이 없습니다.
          <br />첫 할 일을 만들어 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          조건에 맞는 할 일이 없습니다.
        </p>
      ) : (
        (() => {
          // 기본정렬(마감·오름차순)일 때만 기한 그룹 헤더 표시. 그 외엔 평면 리스트.
          const grouped = sortKey === 'due' && asc

          // 카드 내용(날짜·제목·설명·배지). TaskCheck 는 renderTask 의 li 직속 자식으로 분리(button 중첩 회피).
          // 카드 본문(메타칩 + 제목 + 설명) — 프로젝트 카드와 동일 레이아웃.
          function TaskBody({ t, reserveDone }: { t: TaskListRow; reserveDone?: boolean }) {
            return (
              <>
                <div className={`flex flex-wrap items-center gap-2 ${reserveDone ? 'pr-16' : ''}`}>
                  {t.importance > 0 && <ImportanceStars value={t.importance} size="md" />}
                  <StatusBadge value={t.status ?? 'upcoming'} />
                  {t.place_name && <MetaChip icon={taskMetaIcon.place} label={t.place_name} />}
                  {t.recurrence_id && <RecurrenceBadge freq={t.recurrence_freq} />}
                </div>
                <div className={`mt-1.5 font-bold ${t.done ? 'text-faint line-through' : 'text-ink'}`}>
                  {t.title}
                </div>
                {t.description && (
                  <MarkdownText text={t.description} className="mt-1 line-clamp-2 text-sm text-muted" />
                )}
              </>
            )
          }

          function renderTask(t: TaskListRow) {
            const isSel = wide && t.id === selectedId && !sel.selectMode
            const checked = sel.isSelected(t.id)
            const inSelectMode = sel.selectMode
            const overdue = !!t.due_date && !t.done && isOverdue(t.due_date)
            const soon = !!t.due_date && !t.done && !overdue && isSoon(t.due_date)
            const dueRed = overdue || soon

            return (
              <li key={t.id}>
                <div
                  className={`relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-[0_4px_18px_-6px_rgba(34,34,34,0.16)] ${
                    (inSelectMode && checked) || isSel ? 'border-primary border-2' : 'border-line'
                  } ${t.done ? 'opacity-60' : ''}`}
                >
                  {/* 좌측 긴급도 밴드 */}
                  <span
                    className="absolute inset-y-0 left-0 w-1.5"
                    style={{ background: bandColor(t) }}
                    aria-hidden="true"
                  />

                  {/* 완료(라벨+체크) — 우상단 고정(클릭영역과 분리). 선택모드 제외. */}
                  {!inSelectMode && (
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-accent">완료</span>
                      <TaskCheck id={t.id} done={t.done} />
                    </div>
                  )}

                  {/* 본문 — 제목·설명은 카드 전체 폭(메타칩 줄만 완료 자리 확보). */}
                  <div className="flex items-start gap-3">
                    {inSelectMode && <SelectionCheckbox checked={checked} />}
                    {inSelectMode ? (
                      <button type="button" onClick={() => sel.toggleId(t.id)} className="min-w-0 flex-1 text-left">
                        <TaskBody t={t} />
                      </button>
                    ) : wide ? (
                      <button type="button" onClick={() => setSelectedId(t.id)} className="min-w-0 flex-1 text-left">
                        <TaskBody t={t} reserveDone />
                      </button>
                    ) : (
                      <Link href={`/tasks/${t.id}${detailSuffix}`} className="min-w-0 flex-1">
                        <TaskBody t={t} reserveDone />
                      </Link>
                    )}
                  </div>

                  {/* 하단: Due Date(강조) | 연결 프로젝트 — 프로젝트 카드와 동일. */}
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-display text-[8px] font-bold uppercase tracking-[0.15em] text-faint">Due date</span>
                      <span className={`font-display text-[13px] font-bold tracking-wide ${t.due_date ? (dueRed ? 'text-accent' : 'text-ink') : 'text-faint'}`}>
                        {t.due_date ? (
                          <>
                            {fmtDueShort(t.due_date)}
                            {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
                            {overdue ? ' · 연체' : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    {t.projects?.title && (
                      <div className="flex min-w-0 flex-col items-end gap-1">
                        <span className="font-display text-[8px] font-bold uppercase tracking-[0.15em] text-faint">Project</span>
                        <span className="max-w-[150px] truncate font-display text-[12px] font-semibold text-ink">
                          {t.projects.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          }

          function renderList() {
            if (!grouped) {
              return <ul className="space-y-2">{filtered.map(renderTask)}</ul>
            }
            const buckets: Record<TaskGroupKey, TaskListRow[]> = {
              overdue: [],
              this_week: [],
              next_week: [],
              this_month: [],
              later: [],
              unset: [],
              done: [],
            }
            for (const t of filtered) buckets[taskGroupOf(t.due_date, t.done)].push(t)
            return (
              <div className="space-y-5">
                {TASK_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => (
                  <section key={k}>
                    <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold text-ink">
                      {TASK_GROUP_LABEL[k]}
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-bold text-muted">
                        {buckets[k].length}
                      </span>
                    </h2>
                    <ul className="space-y-2">{buckets[k].map(renderTask)}</ul>
                  </section>
                ))}
              </div>
            )
          }

          // sticky bar 가림 방지용 하단 여백(selectMode 일 때만)
          const bottomPad = sel.selectMode && sel.count > 0 ? 'pb-32' : ''

          // 좁은 화면: 기존처럼 목록만(탭=세부 직행 또는 selectMode 면 토글).
          if (!wide) {
            return (
              <div className={bottomPad}>
                {renderList()}
                {sel.selectMode && sel.count > 0 && (
                  <SelectionBar
                    count={sel.count}
                    onCancel={sel.exit}
                    onSelectAll={toggleAll}
                    allSelected={allSelected}
                  >
                    <BulkActionsRow
                      busy={busy}
                      categoryOpts={categoryOpts}
                      importanceOpts={importanceOpts}
                      placeOpts={placeOpts}
                      onStatus={(s) => runBulk({ status: s })}
                      onImportance={(n) => runBulk({ importance: n })}
                      onCategory={(c) => runBulk({ category: c })}
                      onPlace={(p) => runBulk({ place_name: p })}
                      onDoneToggle={(d) => runBulk({ done: d })}
                      onDuplicate={runDuplicate}
                      onDelete={runDelete}
                    />
                  </SelectionBar>
                )}
              </div>
            )
          }

          // 넓은 화면: 좌 목록 / 우(평소=요약 / selectMode=일괄변경 패널).
          return (
            <div className={`grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr] ${bottomPad}`}>
              <div className="min-w-0">{renderList()}</div>
              <div className="min-w-0">
                <div
                  className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
                  style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
                >
                  {sel.selectMode ? (
                    sel.count > 0 ? (
                      <TaskBulkPanel
                        count={sel.count}
                        busy={busy}
                        categoryOpts={categoryOpts}
                        importanceOpts={importanceOpts}
                        placeOpts={placeOpts}
                        onStatus={(s) => runBulk({ status: s })}
                        onImportance={(n) => runBulk({ importance: n })}
                        onCategory={(c) => runBulk({ category: c })}
                        onPlace={(p) => runBulk({ place_name: p })}
                        onDoneToggle={(d) => runBulk({ done: d })}
                        onDuplicate={runDuplicate}
                        onDelete={runDelete}
                      />
                    ) : (
                      <p className="py-10 text-center text-sm text-faint">
                        왼쪽에서 할 일을 선택하세요.
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
                  ) : selectedTask ? (
                    <TaskSummary
                      t={selectedTask}
                      canEdit={canEditEntry(selectedTask.user_id, currentUserId)}
                      editSuffix={detailSuffix}
                    />
                  ) : (
                    <p className="py-10 text-center text-sm text-faint">
                      왼쪽에서 할 일을 선택하세요.
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

// 좁은화면 SelectionBar 내부 액션 chip row. TaskBulkPanel 과 동일 액션을 컴팩트하게.
function BulkActionsRow({
  busy,
  categoryOpts,
  importanceOpts,
  placeOpts,
  onStatus,
  onImportance,
  onCategory,
  onPlace,
  onDoneToggle,
  onDuplicate,
  onDelete,
}: {
  busy: boolean
  categoryOpts: string[]
  importanceOpts: number[]
  placeOpts: string[]
  onStatus: (s: StatusValue) => void
  onImportance: (n: number) => void
  onCategory: (c: string | null) => void
  onPlace: (p: string | null) => void
  onDoneToggle: (done: boolean) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState<null | 'status' | 'imp' | 'cat' | 'done' | 'place'>(null)
  const [placeInput, setPlaceInput] = useState('')
  const Btn = ({ children, on, onClick }: { children: React.ReactNode; on?: boolean; onClick: () => void }) => (
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

  function tap(kind: 'status' | 'imp' | 'cat' | 'done' | 'place') {
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
      <Btn on={open === 'done'} onClick={() => tap('done')}>
        완료
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
      <Btn on={open === 'place'} onClick={() => tap('place')}>
        장소
      </Btn>
      <button
        type="button"
        onClick={onDuplicate}
        disabled={busy}
        className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted transition hover:border-primary disabled:opacity-50"
      >
        복제
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded-lg border border-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
      >
        삭제
      </button>

      {/* 펼침 패널: 액션 row 위에 떠 있는 작은 시트 (이 div 기준 absolute) */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div className="rounded-xl border border-line p-3 shadow-lg" style={{ background: 'var(--paper)' }}>
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
            {open === 'done' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">완료 변경</span>
                <Btn onClick={() => applyAndClose(onDoneToggle, true)}>완료</Btn>
                <Btn onClick={() => applyAndClose(onDoneToggle, false)}>미완료</Btn>
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
            {open === 'place' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-faint">장소 변경</span>
                  <input
                    value={placeInput}
                    onChange={(e) => setPlaceInput(e.target.value)}
                    placeholder="장소 입력"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
                  />
                  <Btn
                    onClick={() => {
                      const v = placeInput.trim()
                      if (!v) return
                      setPlaceInput('')
                      applyAndClose(onPlace, v)
                    }}
                  >
                    설정
                  </Btn>
                </div>
                {placeOpts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {placeOpts.map((p) => (
                      <Btn key={p} onClick={() => applyAndClose(onPlace, p)}>
                        {p}
                      </Btn>
                    ))}
                  </div>
                )}
                <Btn onClick={() => applyAndClose(onPlace, null)}>장소 제거</Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
