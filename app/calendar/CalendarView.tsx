'use client'
// MFH-DND-V1
// MFH-CAL-FILTER-V1
// MFH-CAL-PERF-V1
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { statusLabel, PRIORITIES, PROJECT_STATUSES, JOURNAL_CATEGORIES, IMPORTANCE_MAX } from '@/lib/constants'
import {
  monthGrid,
  weekGrid,
  chunkWeeks,
  layoutWeekBars,
  addMonth,
  addWeek,
  todayKey,
  parseKey,
  fmtKey,
  fmtTime,
  fmtTimeShort,
  shiftKey,
  weekRangeLabel,
  MONTH_LABELS,
  DOW_LABELS,
  type Cell,
  type DateKey,
  type BarItem,
} from '@/lib/calendar'

export type CalItem = {
  id: string
  type: 'project' | 'task'
  title: string
  start: DateKey
  end: DateKey
  time: string | null
  status: string
  priority: string
  importance: number
  category: string | null
  done: boolean
  href: string
}

type Mode = 'month' | 'week'
type DragMode = 'move' | 'resize-start' | 'resize-end'
type Drag = {
  id: string
  type: 'project' | 'task'
  mode: DragMode
  originStart: DateKey
  originEnd: DateKey
  startX: number
  cellW: number // 1칸 px (드래그 시작 시 캡처)
  deltaDays: number // 현재 미리보기 시프트
  moved: boolean // 임계 초과 여부(클릭/드래그 구분)
}

const BAR_H = 20 // 막대 1개 높이(+간격 포함 단위)
const NUM_H = 22 // 날짜 숫자 영역 높이
const DRAG_THRESHOLD = 4 // px

function barTone(priority: string): string {
  if (priority === 'high') return 'bg-accent-soft border-accent'
  if (priority === 'low') return 'bg-surface-subtle border-faint'
  return 'bg-primary-soft border-primary'
}
function barText(priority: string): string {
  if (priority === 'high') return 'text-accent'
  if (priority === 'low') return 'text-muted'
  return 'text-primary'
}
function dotColor(priority: string): string {
  if (priority === 'high') return 'bg-accent'
  if (priority === 'low') return 'bg-faint'
  return 'bg-primary'
}
function priRank(priority: string): number {
  return priority === 'high' ? 0 : priority === 'low' ? 2 : 1
}

// ── 필터 ───────────────────────────────────────
type Filters = {
  hideDone: boolean
  status: string[] // 빈 배열 = 전체
  priority: string[]
  importance: number[]
  category: string[]
}
const EMPTY_FILTERS: Filters = { hideDone: true, status: [], priority: [], importance: [], category: [] }

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

export default function CalendarView({ items: initialItems }: { items: CalItem[] }) {
  const router = useRouter()
  const today = todayKey()
  const t = parseKey(today)
  const [mode, setMode] = useState<Mode>('month')
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: t.y, m: t.m })
  const [weekKey, setWeekKey] = useState<DateKey>(today)
  const [selected, setSelected] = useState<DateKey>(today)

  // 낙관적 갱신을 위해 items 를 로컬 state 로 보유.
  const [allItems, setAllItems] = useState<CalItem[]>(initialItems)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [saving, setSaving] = useState(false)

  // 선택(데스크톱: 1클릭=선택, 더블클릭=상세). 모바일은 사용 안 함.
  const [selBar, setSelBar] = useState<string | null>(null)

  // 필터
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false) // 모바일 접이식

  const weekRefs = useRef<(HTMLDivElement | null)[]>([])

  // 드래그 성능: 진행 중 값은 ref 에 두고, deltaDays 가 칸 단위로 바뀔 때만 rAF 로 setState.
  const dragRef = useRef<Drag | null>(null)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    dragRef.current = drag
  }, [drag])
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // 사용 중인 사역분류만 칩으로 노출(데이터에 있는 것 우선, 순서는 상수 기준).
  const usedCategories = useMemo(() => {
    const set = new Set(allItems.map((it) => it.category).filter(Boolean) as string[])
    return JOURNAL_CATEGORIES.filter((c) => set.has(c))
  }, [allItems])

  const filterActiveAny =
    filters.status.length + filters.priority.length + filters.importance.length + filters.category.length > 0 ||
    !filters.hideDone

  // 필터 적용된 표시 대상.
  const items = useMemo(() => {
    return allItems.filter((it) => {
      if (filters.hideDone && it.done) return false
      if (filters.status.length && !filters.status.includes(it.status)) return false
      if (filters.priority.length && !filters.priority.includes(it.priority)) return false
      if (filters.importance.length && !filters.importance.includes(it.importance)) return false
      if (filters.category.length && !(it.category && filters.category.includes(it.category))) return false
      return true
    })
  }, [allItems, filters])

  const byId = useMemo(() => {
    const m: Record<string, CalItem> = {}
    for (const it of items) m[it.id] = it
    return m
  }, [items])

  // 드래그 중인 항목의 미리보기(시프트 적용) 좌표.
  const previewRange = useCallback(
    (it: CalItem): { start: DateKey; end: DateKey } => {
      if (!drag || drag.id !== it.id || drag.deltaDays === 0) return { start: it.start, end: it.end }
      if (drag.mode === 'move') {
        return { start: shiftKey(drag.originStart, drag.deltaDays), end: shiftKey(drag.originEnd, drag.deltaDays) }
      }
      if (drag.mode === 'resize-start') {
        let ns = shiftKey(drag.originStart, drag.deltaDays)
        if (ns > drag.originEnd) ns = drag.originEnd
        return { start: ns, end: drag.originEnd }
      }
      let ne = shiftKey(drag.originEnd, drag.deltaDays)
      if (ne < drag.originStart) ne = drag.originStart
      return { start: drag.originStart, end: ne }
    },
    [drag],
  )

  // 기본(드래그 무관) 막대 배열은 items 가 바뀔 때만 계산.
  const baseBars: BarItem[] = useMemo(() => {
    const sorted = [...items].sort((a, b) =>
      a.start < b.start ? -1 : a.start > b.start ? 1 : (a.time ?? '').localeCompare(b.time ?? ''),
    )
    return sorted.map((it) => ({ id: it.id, start: it.start, end: it.end }))
  }, [items])

  // 드래그 중에는 대상 1개의 좌표만 미리보기로 치환(전체 재정렬·재계산 회피 → 버벅임 완화).
  const bars: BarItem[] = useMemo(() => {
    if (!drag || drag.deltaDays === 0) return baseBars
    const it = byId[drag.id]
    if (!it) return baseBars
    const pv = previewRange(it)
    return baseBars.map((b) => (b.id === drag.id ? { id: b.id, start: pv.start, end: pv.end } : b))
  }, [baseBars, drag, byId, previewRange])

  const weeks: Cell[][] = mode === 'month' ? chunkWeeks(monthGrid(cur.y, cur.m)) : [weekGrid(weekKey)]

  const title =
    mode === 'month'
      ? `${cur.y}년 ${MONTH_LABELS[cur.m - 1]}`
      : `${parseKey(weekKey).y}년 ${weekRangeLabel(weeks[0])}`

  const selItems = useMemo(() => {
    return items
      .filter((it) => it.start <= selected && selected <= it.end)
      .sort((a, b) => {
        const ta = a.time ?? ''
        const tb = b.time ?? ''
        if (ta !== tb) return ta.localeCompare(tb)
        if (a.type !== b.type) return a.type === 'project' ? -1 : 1
        return priRank(a.priority) - priRank(b.priority)
      })
  }, [items, selected])

  function prev() {
    if (mode === 'month') setCur(addMonth(cur.y, cur.m, -1))
    else setWeekKey(addWeek(weekKey, -1))
  }
  function next() {
    if (mode === 'month') setCur(addMonth(cur.y, cur.m, 1))
    else setWeekKey(addWeek(weekKey, 1))
  }
  function goToday() {
    setCur({ y: t.y, m: t.m })
    setWeekKey(today)
    setSelected(today)
  }

  // ── 드래그 핸들러 (데스크톱 마우스 전용) ─────────────
  function onBarPointerDown(e: React.PointerEvent, it: CalItem, dmode: DragMode, weekIdx: number) {
    if (e.pointerType !== 'mouse') return // 모바일 유지
    if (saving) return
    if (e.button !== undefined && e.button !== 0) return
    const wrap = weekRefs.current[weekIdx]
    if (!wrap) return
    const cellW = wrap.getBoundingClientRect().width / 7
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const next: Drag = {
      id: it.id,
      type: it.type,
      mode: dmode,
      originStart: it.start,
      originEnd: it.end,
      startX: e.clientX,
      cellW: cellW > 0 ? cellW : 1,
      deltaDays: 0,
      moved: false,
    }
    dragRef.current = next
    setDrag(next)
  }

  function onBarPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || e.pointerType !== 'mouse') return
    const clientX = e.clientX
    if (rafRef.current != null) return // 이번 프레임은 이미 예약됨 → 스킵(스로틀)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const cur = dragRef.current
      if (!cur) return
      const dx = clientX - cur.startX
      const moved = cur.moved || Math.abs(dx) >= DRAG_THRESHOLD
      const deltaDays = Math.round(dx / cur.cellW)
      if (deltaDays === cur.deltaDays && moved === cur.moved) return // 변화 없으면 리렌더 안 함
      const updated = { ...cur, deltaDays, moved }
      dragRef.current = updated
      setDrag(updated)
    })
  }

  async function onBarPointerUp(e: React.PointerEvent, it: CalItem) {
    if (e.pointerType !== 'mouse') return // 모바일 유지
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const d = dragRef.current
    if (!d || d.id !== it.id) {
      dragRef.current = null
      setDrag(null)
      return
    }
    // 임계 미만 = 클릭 → 선택만(상세 이동은 더블클릭).
    if (!d.moved || d.deltaDays === 0) {
      dragRef.current = null
      setDrag(null)
      setSelBar(it.id)
      setSelected(it.start)
      return
    }
    const pv = previewRange(it)
    dragRef.current = null
    setDrag(null)
    if (pv.start === it.start && pv.end === it.end) return

    const prevItems = allItems
    setAllItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, start: pv.start, end: pv.end } : x)))
    setSaving(true)
    try {
      const supabase = createClient()
      if (it.type === 'project') {
        const { error } = await supabase
          .from('projects')
          .update({ start_date: pv.start, due_date: pv.end })
          .eq('id', it.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tasks').update({ due_date: pv.end }).eq('id', it.id)
        if (error) throw error
      }
      router.refresh()
    } catch (err) {
      console.error('calendar drag save failed', err)
      setAllItems(prevItems)
      alert('일정 변경 저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  // 모바일(터치)·더블클릭(데스크톱) 상세 이동.
  function onBarClick(e: React.MouseEvent, it: CalItem) {
    if (e.detail >= 2) {
      router.push(it.href)
      return
    }
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      router.push(it.href)
    }
  }

  const baseMinH = mode === 'month' ? 'clamp(58px, 11vh, 116px)' : 'clamp(120px, 46vh, 460px)'

  const FilterChip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        active ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-muted hover:border-primary'
      }`}
    >
      {children}
    </button>
  )

  // 필터 칩 묶음(데스크톱=가로 스크롤 한 줄 / 모바일 패널=줄바꿈).
  const FilterChips = ({ wrap }: { wrap: boolean }) => (
    <div className={wrap ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-nowrap items-center gap-1.5'}>
      <FilterChip active={filters.hideDone} onClick={() => setFilters((f) => ({ ...f, hideDone: !f.hideDone }))}>
        완료 숨김
      </FilterChip>
      <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
      {PROJECT_STATUSES.map((s) => (
        <FilterChip
          key={s.value}
          active={filters.status.includes(s.value)}
          onClick={() => setFilters((f) => ({ ...f, status: toggle(f.status, s.value) }))}
        >
          {s.label}
        </FilterChip>
      ))}
      <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
      {PRIORITIES.map((p) => (
        <FilterChip
          key={p.value}
          active={filters.priority.includes(p.value)}
          onClick={() => setFilters((f) => ({ ...f, priority: toggle(f.priority, p.value) }))}
        >
          {p.label}
        </FilterChip>
      ))}
      <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
      {Array.from({ length: IMPORTANCE_MAX }, (_, i) => i + 1).map((n) => (
        <FilterChip
          key={n}
          active={filters.importance.includes(n)}
          onClick={() => setFilters((f) => ({ ...f, importance: toggle(f.importance, n) }))}
        >
          {'★'.repeat(n)}
        </FilterChip>
      ))}
      {usedCategories.length > 0 && <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />}
      {usedCategories.map((c) => (
        <FilterChip
          key={c}
          active={filters.category.includes(c)}
          onClick={() => setFilters((f) => ({ ...f, category: toggle(f.category, c) }))}
        >
          {c}
        </FilterChip>
      ))}
    </div>
  )

  return (
    <div className={saving ? 'pointer-events-none opacity-60' : ''}>
      {/* 필터: 데스크톱(≥768px)=항상 노출 칩바 / 모바일=접이식 */}
      <div className="mb-3">
        {/* 모바일 토글 버튼 */}
        <div className="flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filterActiveAny ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-muted'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
            </svg>
            필터
            {filterActiveAny && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
          </button>
          {filterActiveAny && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[11px] font-semibold text-faint hover:text-accent"
            >
              초기화
            </button>
          )}
        </div>

        {/* 모바일 접이식 패널 */}
        {filterOpen && (
          <div className="mt-2 rounded-xl border border-line bg-surface-subtle p-2.5 md:hidden">
            <FilterChips wrap />
          </div>
        )}

        {/* 데스크톱/아이패드 칩바 */}
        <div className="hidden md:block">
          <div className="overflow-x-auto pb-1">
            <FilterChips wrap={false} />
          </div>
          {filterActiveAny && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-1 text-[11px] font-semibold text-faint underline-offset-2 hover:text-accent hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-line p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('month')}
            className={`rounded-lg px-3 py-1.5 font-semibold ${
              mode === 'month' ? 'bg-primary text-white' : 'text-muted'
            }`}
          >
            월
          </button>
          <button
            type="button"
            onClick={() => setMode('week')}
            className={`rounded-lg px-3 py-1.5 font-semibold ${
              mode === 'week' ? 'bg-primary text-white' : 'text-muted'
            }`}
          >
            주
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
        >
          오늘
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prev} className="rounded-lg px-3 py-1 text-xl leading-none text-muted">
          ‹
        </button>
        <div className="font-display text-base font-bold text-ink md:text-lg">{title}</div>
        <button type="button" onClick={next} className="rounded-lg px-3 py-1 text-xl leading-none text-muted">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold md:text-xs">
        {DOW_LABELS.map((d, i) => (
          <div key={d} className={`py-1 ${i === 0 ? 'text-accent' : 'text-faint'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const segs = layoutWeekBars(week, bars)
          const maxLane = segs.reduce((mx, s) => Math.max(mx, s.lane), -1)
          const minH = `max(${baseMinH}, ${NUM_H + (maxLane + 1) * BAR_H + 6}px)`
          return (
            <div key={wi} className="relative" style={{ minHeight: minH }}>
              <div className="grid h-full grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
                {week.map((c) => {
                  const isToday = c.key === today
                  const isSel = c.key === selected
                  const dow = new Date(c.year, c.month - 1, c.day).getDay()
                  const numCls = isToday || dow === 0 ? 'text-accent' : 'text-muted'
                  return (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => {
                        setSelected(c.key)
                        setSelBar(null)
                      }}
                      style={{ minHeight: minH }}
                      className={`relative text-left transition ${
                        isSel ? 'bg-primary-soft' : 'bg-surface'
                      } ${c.inMonth ? '' : 'opacity-45'} ${isToday ? 'ring-1 ring-inset ring-accent' : ''}`}
                    >
                      <span className={`absolute left-1 top-0.5 text-[11px] font-semibold md:text-xs ${numCls}`}>
                        {c.day}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div
                ref={(el) => {
                  weekRefs.current[wi] = el
                }}
                className="pointer-events-none absolute inset-0"
              >
                {segs.map((sg) => {
                  const it = byId[sg.id]
                  if (!it) return null
                  const left = `${(sg.startCol / 7) * 100}%`
                  const width = `${((sg.endCol - sg.startCol + 1) / 7) * 100}%`
                  const top = `${NUM_H + sg.lane * BAR_H}px`
                  const round =
                    sg.isStart && sg.isEnd ? 'rounded' : sg.isStart ? 'rounded-l' : sg.isEnd ? 'rounded-r' : ''
                  const showTime = it.type === 'task' && it.time
                  const isDragging = drag?.id === it.id
                  const isSelBar = selBar === it.id
                  const canResize = it.type === 'project'
                  return (
                    <div
                      key={`${sg.id}-${sg.startCol}`}
                      onPointerDown={(e) => onBarPointerDown(e, it, 'move', wi)}
                      onPointerMove={onBarPointerMove}
                      onPointerUp={(e) => onBarPointerUp(e, it)}
                      onClick={(e) => onBarClick(e, it)}
                      style={{ left, width, top, height: `${BAR_H - 4}px` }}
                      className={`pointer-events-auto absolute mx-0.5 flex cursor-pointer touch-none items-center gap-1 overflow-hidden border-l-[3px] px-1.5 md:cursor-grab md:active:cursor-grabbing ${round} ${barTone(
                        it.priority,
                      )} ${it.done ? 'opacity-50' : ''} ${
                        isDragging || isSelBar ? 'opacity-90 ring-2 ring-inset ring-primary' : ''
                      }`}
                    >
                      {canResize && sg.isStart && isSelBar && (
                        <span
                          onPointerDown={(e) => onBarPointerDown(e, it, 'resize-start', wi)}
                          className="absolute left-0 top-0 hidden h-full w-2 cursor-ew-resize bg-primary opacity-40 md:block"
                        />
                      )}
                      {showTime && (
                        <span className={`shrink-0 text-[10px] font-bold ${barText(it.priority)}`}>
                          {fmtTimeShort(it.time)}
                        </span>
                      )}
                      <span
                        className={`pointer-events-none truncate text-[11px] font-semibold ${barText(it.priority)} ${
                          it.done ? 'line-through' : ''
                        }`}
                      >
                        {it.title}
                      </span>
                      {it.type === 'project' && (
                        <span
                          className={`pointer-events-none ml-auto hidden shrink-0 text-[10px] opacity-70 md:inline ${barText(
                            it.priority,
                          )}`}
                        >
                          {statusLabel(it.status)}
                        </span>
                      )}
                      {canResize && sg.isEnd && isSelBar && (
                        <span
                          onPointerDown={(e) => onBarPointerDown(e, it, 'resize-end', wi)}
                          className="absolute right-0 top-0 hidden h-full w-2 cursor-ew-resize bg-primary opacity-40 md:block"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-2 hidden text-center text-[10px] text-faint md:block">
        막대 클릭=선택 · 끌어서 이동 · 더블클릭=상세 · 프로젝트는 선택 후 양 끝으로 기간 조절
      </p>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold text-muted">{fmtKey(selected)}</div>
        {selItems.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-xs text-faint">
            이 날짜에 항목이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {selItems.map((it) => {
              const span = it.start !== it.end
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-primary"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 ${it.type === 'project' ? 'rounded-sm' : 'rounded-full'} ${dotColor(
                        it.priority,
                      )} ${it.done ? 'opacity-30' : ''}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          it.done ? 'text-faint line-through' : 'text-ink'
                        }`}
                      >
                        {it.title}
                      </span>
                      {span ? (
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {fmtKey(it.start)} – {fmtKey(it.end)}
                        </span>
                      ) : it.time ? (
                        <span className="mt-0.5 block text-[11px] text-muted">{fmtTime(it.time)}</span>
                      ) : null}
                    </span>
                    {it.category && (
                      <span className="hidden shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary sm:inline">
                        {it.category}
                      </span>
                    )}
                    <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] text-muted">
                      {it.type === 'project' ? '프로젝트' : '할 일'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
