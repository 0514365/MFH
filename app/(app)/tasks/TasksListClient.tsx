'use client'

// MFH-TASKS-LIST-V9 — 2027(4-2): 요약 3칸(지남·이번 주·진행 중, 탭 = 그룹으로 이동/진행 필터) · 연회색 필터 면(흰 검색·알약) ·
//   기한 그룹 = 타이틀 알약(지남 빨강 · 이번 주 살구 · 다음 주 페리윙클 · 이번 달 라벤더 · 완료 민트) ·
//   모바일 = 흰 카드(원형 체크 · 제목 · 설명 1줄 · 마감 알약 · 프로젝트 로즈 · 장소 · 반복 · 별 · 상태) / 넓은 화면 = 2줄 행 + 요약(마감 살구 면 · 프로젝트 로즈 면).
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
import MarkdownText, { stripMarkdown } from '@/components/MarkdownText'
import { blockColor } from '@/lib/palette'
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
// 마감 알약 — 지남 = 연한 빨강 · 임박(오늘~+2일) = 호박 · 그 외 = 연회색. 완료 항목은 회색.
function DuePill({ t }: { t: TaskListRow }) {
  if (!t.due_date) return null
  const overdue = !t.done && isOverdue(t.due_date)
  const soon = !t.done && !overdue && isSoon(t.due_date)
  const cls = overdue
    ? 'bg-b27-expense-soft text-b27-expense'
    : soon
      ? 'bg-b27-wait-soft text-b27-wait'
      : 'bg-b27-card text-b27-ink'
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-num text-[12px] font-semibold tabular-nums ${cls}`}>
      {fmtDueShort(t.due_date)}
      {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
      {overdue ? ' · 지남' : ''}
    </span>
  )
}
// 메타 칩(프로젝트·장소) — 연회색 알약, color 가 있으면 8px 색 사각형.
function MetaChip({ label, color }: { label: string; color?: string }) {
  return (
    <span className="inline-flex max-w-[160px] items-center gap-1.5 rounded-full bg-b27-card px-2.5 py-0.5 text-[11.5px] text-b27-ink">
      {color && <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </span>
  )
}
// 기한 그룹 타이틀 알약 색(면 · 글자 · 사각형)
const GROUP_PILL: Record<TaskGroupKey, { bg: string; fg: string; sq: string }> = {
  overdue: { bg: 'var(--b27-expense-soft)', fg: 'var(--b27-expense)', sq: 'var(--b27-expense)' },
  this_week: { bg: 'var(--b27-tint-3)', fg: 'var(--b27-deep-3)', sq: 'var(--b27-block-3)' },
  next_week: { bg: 'var(--b27-tint-8)', fg: 'var(--b27-deep-8)', sq: 'var(--b27-block-8)' },
  this_month: { bg: 'var(--b27-tint-5)', fg: 'var(--b27-deep-5)', sq: 'var(--b27-block-5)' },
  later: { bg: 'var(--b27-card)', fg: 'var(--b27-ink)', sq: 'var(--b27-muted)' },
  unset: { bg: 'var(--b27-card)', fg: 'var(--b27-muted)', sq: 'var(--b27-line)' },
  done: { bg: 'var(--b27-tint-4)', fg: 'var(--b27-deep-4)', sq: 'var(--b27-block-4)' },
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

// 요약 패널(읽기전용). 넓은 화면 우측 — 상세와 같은 구성(메타 · 제목 · 마감 살구 면 · 설명 · 프로젝트 로즈 면).
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <ImportanceStars value={t.importance} size="md" />
            <StatusBadge value={t.status ?? 'upcoming'} />
            <CategoryBadge value={t.category} />
            {t.recurrence_id && <RecurrenceBadge freq={t.recurrence_freq} />}
          </div>
          <h2 className={`mt-2 text-lg font-semibold leading-snug ${t.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>
            {t.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={`/tasks/new?from=${t.id}`}
            className="rounded-full bg-b27-card px-3.5 py-2 text-xs font-medium text-b27-ink transition active:opacity-70"
          >
            복제
          </Link>
          {canEdit && (
            <Link
              href={`/tasks/${t.id}/edit${editSuffix}`}
              className="rounded-full bg-b27-ink px-4 py-2 text-xs font-medium text-white transition active:opacity-80"
            >
              편집
            </Link>
          )}
        </div>
      </div>

      {t.due_date && (
        <div className="rounded-2xl bg-b27-tint-3 px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 font-num text-[12px] font-medium" style={{ color: 'var(--b27-deep-3)' }}>
            <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-3" aria-hidden="true" />
            마감{overdue ? ' · 지남' : ''}
          </div>
          <span className={`font-num text-[22px] font-semibold tabular-nums ${overdue ? 'text-b27-expense' : 'text-b27-ink'}`}>
            {fmtDueShort(t.due_date)}
            {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
          </span>
        </div>
      )}

      {t.description && (
        <div>
          <div className="mb-1 font-num text-[12px] font-medium text-b27-muted">설명</div>
          <MarkdownText text={t.description} className="break-keep text-sm leading-relaxed text-b27-ink" />
        </div>
      )}

      {t.place_name && (
        <div className="flex">
          <MetaChip label={t.place_name} />
        </div>
      )}

      {t.projects?.title && (
        <div className="rounded-2xl bg-b27-tint-6 px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-6" aria-hidden="true" />
            상위 프로젝트
          </div>
          <span className="text-[15px] font-medium text-b27-ink">{t.projects.title}</span>
        </div>
      )}
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

  // 요약 3칸 — 완료 제외 전체 기준(필터와 무관).
  const stats = (() => {
    let overdue = 0
    let thisWeek = 0
    let inProgress = 0
    for (const tk of tasks) {
      if (tk.done) continue
      const g = taskGroupOf(tk.due_date, tk.done)
      if (g === 'overdue') overdue += 1
      if (g === 'this_week') thisWeek += 1
      if (tk.status === 'in_progress') inProgress += 1
    }
    return { overdue, thisWeek, inProgress }
  })()
  const filterCount = fStatus.length + fImportance.length + fCategory.length + fProject.length
  const pillBtn = 'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:opacity-70'
  const pillOff = 'bg-b27-paper text-b27-muted'
  const pillOn = 'bg-b27-ink text-white'

  return (
    <>
      {/* 요약 3칸 — 지남 · 이번 주(탭 = 그 그룹으로 이동) · 진행 중(탭 = 진행 필터 토글). 완료 제외. */}
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => document.getElementById('task-grp-overdue')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="flex flex-col items-start gap-0.5 rounded-2xl bg-b27-expense-soft px-3 py-2.5 text-b27-expense transition active:opacity-70"
        >
          <span className="font-num text-[24px] font-semibold leading-none tabular-nums">{stats.overdue}</span>
          <span className="text-[12px] font-medium">지남</span>
        </button>
        <button
          type="button"
          onClick={() => document.getElementById('task-grp-this_week')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="flex flex-col items-start gap-0.5 rounded-2xl bg-b27-tint-3 px-3 py-2.5 transition active:opacity-70"
          style={{ color: 'var(--b27-deep-3)' }}
        >
          <span className="font-num text-[24px] font-semibold leading-none tabular-nums">{stats.thisWeek}</span>
          <span className="text-[12px] font-medium">이번 주</span>
        </button>
        <button
          type="button"
          onClick={() => setFStatus((a) => (a.length === 1 && a[0] === 'in_progress' ? [] : ['in_progress']))}
          aria-pressed={fStatus.length === 1 && fStatus[0] === 'in_progress'}
          className={`flex flex-col items-start gap-0.5 rounded-2xl bg-b27-tint-8 px-3 py-2.5 transition active:opacity-70 ${
            fStatus.length === 1 && fStatus[0] === 'in_progress' ? 'ring-2 ring-b27-ink' : ''
          }`}
          style={{ color: 'var(--b27-deep-8)' }}
        >
          <span className="font-num text-[24px] font-semibold leading-none tabular-nums">{stats.inProgress}</span>
          <span className="text-[12px] font-medium">진행 중</span>
        </button>
      </div>

      {/* 컨트롤 바: 연회색 필터 면 — 흰 검색 알약 + 완료 숨김·필터·정렬·선택(·전체선택/초기화) 흰 알약 (sticky, 헤더 52px 아래) */}
      <div className="sticky top-[52px] z-20 -mx-5 mb-2 bg-b27-paper px-5 pb-2 pt-1">
        <div className="space-y-2.5 rounded-2xl bg-b27-card p-2.5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-b27-muted">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·설명·장소 검색"
              className="w-full rounded-full bg-b27-paper py-2 pl-9 pr-9 text-sm text-b27-ink outline-none placeholder:text-b27-muted"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label="검색 지우기"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-b27-muted"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

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
            {canReset && !sel.selectMode && (
              <button type="button" onClick={resetAll} className={`${pillBtn} ml-auto bg-transparent text-b27-muted`}>
                초기화
              </button>
            )}
          </div>

          {/* 필터 (접이식) */}
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
                  <span className="mr-1 w-12 font-num text-[11px] font-medium text-b27-muted">프로젝트</span>
                  {projectOpts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFProject((a) => toggle(a, p.id))}
                      className={`${chip} ${fProject.includes(p.id) ? chipOn : ''}`}
                    >
                      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: blockColor(6).bg }} aria-hidden="true" />
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 정렬 (접이식) */}
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
      {tasks.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          아직 할 일이 없습니다.
          <br />첫 할 일을 만들어 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          조건에 맞는 할 일이 없습니다.
        </p>
      ) : (
        (() => {
          // 기본정렬(마감·오름차순)일 때만 기한 그룹 헤더 표시. 그 외엔 평면 리스트.
          const grouped = sortKey === 'due' && asc

          // 모바일 카드 본문 — 제목 · 설명 1줄 · 메타 줄(마감 알약 · 프로젝트 · 장소 · 반복 · 별 · 상태).
          function TaskCardBody({ t }: { t: TaskListRow }) {
            const showStatus = (t.status ?? 'upcoming') !== 'upcoming'
            return (
              <span className="block min-w-0">
                <span className={`block text-[15.5px] font-semibold leading-snug ${t.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>
                  {t.title}
                </span>
                {t.description && (
                  <span className="mt-0.5 block truncate text-[13px] text-[#4A5072]">{stripMarkdown(t.description)}</span>
                )}
                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  <DuePill t={t} />
                  {t.projects?.title && <MetaChip label={t.projects.title} color={blockColor(6).bg} />}
                  {t.place_name && <MetaChip label={t.place_name} />}
                  {t.recurrence_id && <RecurrenceBadge freq={t.recurrence_freq} />}
                  <ImportanceStars value={t.importance} size="md" />
                  {showStatus && <StatusBadge value={t.status ?? 'upcoming'} />}
                </span>
              </span>
            )
          }

          // 넓은 화면 행 본문 — 제목 / 마감(색) · 프로젝트 · 장소 · 반복.
          function TaskRowBody({ t }: { t: TaskListRow }) {
            const overdue = !!t.due_date && !t.done && isOverdue(t.due_date)
            const soon = !!t.due_date && !t.done && !overdue && isSoon(t.due_date)
            const rest = [t.projects?.title, t.place_name].filter(Boolean).join(' · ')
            return (
              <span className="block min-w-0 flex-1">
                <span className={`block truncate text-[15px] font-medium leading-snug ${t.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>
                  {t.title}
                </span>
                <span className="mt-0.5 block truncate font-num text-[12px] text-b27-muted">
                  {t.due_date && (
                    <span className={`font-semibold ${overdue ? 'text-b27-expense' : soon ? 'text-b27-wait' : 'text-b27-ink'}`}>
                      {fmtDueShort(t.due_date)}
                      {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
                      {overdue ? ' 지남' : ''}
                    </span>
                  )}
                  {t.due_date && rest ? ' · ' : ''}
                  {rest}
                  {t.recurrence_id ? ' · ↻' : ''}
                </span>
              </span>
            )
          }

          function renderTask(t: TaskListRow) {
            const isSel = wide && t.id === selectedId && !sel.selectMode
            const checked = sel.isSelected(t.id)
            const inSelectMode = sel.selectMode
            const emphasized = (inSelectMode && checked) || isSel

            // ── 모바일: 흰 카드 + 왼쪽 원형 체크 ──
            if (!wide) {
              return (
                <li
                  key={t.id}
                  className={`flex items-start gap-3 rounded-[18px] bg-b27-paper p-3.5 ${
                    emphasized ? 'ring-2 ring-b27-ink' : 'ring-1 ring-b27-line'
                  }`}
                >
                  {inSelectMode ? (
                    <button type="button" onClick={() => sel.toggleId(t.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <span className="mt-0.5 shrink-0">
                        <SelectionCheckbox checked={checked} />
                      </span>
                      <TaskCardBody t={t} />
                    </button>
                  ) : (
                    <>
                      <TaskCheck id={t.id} done={t.done} />
                      <Link href={`/tasks/${t.id}${detailSuffix}`} className="min-w-0 flex-1 active:opacity-80">
                        <TaskCardBody t={t} />
                      </Link>
                    </>
                  )}
                </li>
              )
            }

            // ── 넓은 화면: 2줄 행 + 오른쪽 별·상태 ──
            const showStatus = (t.status ?? 'upcoming') !== 'upcoming'
            return (
              <li key={t.id} className="border-b border-b27-line last:border-b-0">
                <div className={`flex items-start gap-3 rounded-xl px-2 py-[11px] ${emphasized ? 'bg-b27-card' : ''}`}>
                  {inSelectMode ? (
                    <span className="mt-0.5 shrink-0">
                      <SelectionCheckbox checked={checked} />
                    </span>
                  ) : (
                    <TaskCheck id={t.id} done={t.done} />
                  )}
                  <button
                    type="button"
                    onClick={() => (inSelectMode ? sel.toggleId(t.id) : setSelectedId(t.id))}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left active:opacity-70"
                  >
                    <TaskRowBody t={t} />
                    <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                      <ImportanceStars value={t.importance} size="md" />
                      {showStatus && <StatusBadge value={t.status ?? 'upcoming'} />}
                    </span>
                  </button>
                </div>
              </li>
            )
          }

          function renderList() {
            if (!grouped) {
              return <ul className={wide ? '' : 'flex flex-col gap-2'}>{filtered.map(renderTask)}</ul>
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
              <div className="space-y-4">
                {TASK_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => (
                  <section key={k} id={`task-grp-${k}`} className="scroll-mt-40">
                    <h2
                      className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold"
                      style={{ background: GROUP_PILL[k].bg, color: GROUP_PILL[k].fg }}
                    >
                      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: GROUP_PILL[k].sq }} aria-hidden="true" />
                      {TASK_GROUP_LABEL[k]}
                      <span className="font-num font-medium tabular-nums text-b27-muted">{buckets[k].length}</span>
                    </h2>
                    <ul className={wide ? '' : 'flex flex-col gap-2'}>{buckets[k].map(renderTask)}</ul>
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
            <div className={`grid grid-cols-1 gap-5 @xl:grid-cols-[1fr_1.1fr] ${bottomPad}`}>
              <div className="min-w-0">{renderList()}</div>
              <div className="min-w-0">
                <div
                  className="sticky top-[150px] rounded-2xl bg-b27-paper p-1"
                  style={{ maxHeight: 'calc(100vh - 170px)', overflowY: 'auto' }}
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
                      <p className="py-10 text-center text-sm text-b27-muted">
                        왼쪽에서 할 일을 선택하세요.
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
                  ) : selectedTask ? (
                    <TaskSummary
                      t={selectedTask}
                      canEdit={canEditEntry(selectedTask.user_id, currentUserId)}
                      editSuffix={detailSuffix}
                    />
                  ) : (
                    <p className="py-10 text-center text-sm text-b27-muted">
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
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition active:opacity-70 disabled:opacity-50 ${
        on ? 'bg-b27-ink text-white' : 'bg-b27-card text-b27-ink'
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
        className="rounded-full bg-b27-card px-3 py-1.5 text-[11px] font-medium text-b27-ink transition active:opacity-70 disabled:opacity-50"
      >
        복제
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded-full bg-b27-expense-soft px-3 py-1.5 text-[11px] font-medium text-b27-expense transition active:opacity-70 disabled:opacity-50"
      >
        삭제
      </button>

      {/* 펼침 패널: 액션 row 위에 떠 있는 작은 시트 (이 div 기준 absolute) */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div className="rounded-2xl bg-b27-paper p-3 shadow-[0_8px_28px_-8px_rgba(43,49,96,0.25)]">
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
            {open === 'done' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">완료 변경</span>
                <Btn onClick={() => applyAndClose(onDoneToggle, true)}>완료</Btn>
                <Btn onClick={() => applyAndClose(onDoneToggle, false)}>미완료</Btn>
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
            {open === 'place' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-num text-[11px] font-medium text-b27-muted">장소 변경</span>
                  <input
                    value={placeInput}
                    onChange={(e) => setPlaceInput(e.target.value)}
                    placeholder="장소 입력"
                    className="min-w-0 flex-1 rounded-full bg-b27-card px-3 py-1.5 text-[11px] text-b27-ink outline-none"
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
