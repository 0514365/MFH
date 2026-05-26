'use client'
// MFH-DND-V1
// MFH-CAL-FILTER-V1
// MFH-CAL-PERF-V1
// MFH-CAL-STATUS-V1
// MFH-CAL-DRAG-V2
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  STATUSES,
  STATUS_META,
  normalizeStatus,
  PRIORITIES,
  JOURNAL_CATEGORIES,
  IMPORTANCE_MAX,
} from '@/lib/constants'
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

const BAR_H = 20
const NUM_H = 22
const DRAG_THRESHOLD = 4
const DESKTOP_MAX_CARDS = 3

// 드래그 진행 상태(모두 ref — 리렌더 유발 안 함)
type DragState = {
  id: string
  type: 'project' | 'task'
  mode: DragMode
  originStart: DateKey
  originEnd: DateKey
  startX: number
  cellW: number
  el: HTMLElement // 드래그 중인 막대 DOM
  baseLeftPx: number // 막대의 시작 left(px, 부모 기준)
  baseWidthPx: number // 막대의 시작 width(px)
  deltaDays: number // 현재 스냅된 칸 델타
  moved: boolean
}

function statusBarCls(status: string): string {
  const s = normalizeStatus(status)
  if (s === 'in_progress') return 'bg-status-progress border-on-status-progress text-on-status-progress'
  if (s === 'done') return 'bg-status-done border-on-status-done text-on-status-done'
  return 'bg-status-upcoming border-on-status-upcoming text-on-status-upcoming'
}
function statusDotCls(status: string): string {
  const s = normalizeStatus(status)
  if (s === 'in_progress') return 'bg-status-progress'
  if (s === 'done') return 'bg-status-done'
  return 'bg-status-upcoming'
}
function statusBadgeCls(status: string): string {
  const s = normalizeStatus(status)
  if (s === 'in_progress') return 'bg-status-progress text-on-status-progress'
  if (s === 'done') return 'bg-status-done text-on-status-done'
  return 'bg-status-upcoming text-on-status-upcoming'
}
function priRank(priority: string): number {
  return priority === 'high' ? 0 : priority === 'low' ? 2 : 1
}

type Filters = {
  hideDone: boolean
  status: string[]
  priority: string[]
  importance: number[]
  category: string[]
}
const EMPTY_FILTERS: Filters = { hideDone: true, status: [], priority: [], importance: [], category: [] }

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

// ── 할 일 카드(데스크톱) — memo 로 드래그 중 불필요 리렌더 차단 ──
const TaskCard = memo(function TaskCard({ it }: { it: CalItem }) {
  return (
    <Link
      href={it.href}
      onClick={(e) => e.stopPropagation()}
      className="block select-none rounded-md border border-line bg-surface px-2 py-1.5 transition hover:border-primary"
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className={`truncate text-[11px] font-semibold ${it.done ? 'text-faint line-through' : 'text-ink'}`}>
          {it.title}
        </span>
        {it.time && <span className="shrink-0 text-[10px] text-faint">{fmtTime(it.time)}</span>}
      </div>
      <div className="mt-1 flex items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusBadgeCls(
            it.status,
          )}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotCls(it.status)}`} />
          {STATUS_META[normalizeStatus(it.status)].label}
        </span>
        {it.category && (
          <span className="truncate rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] text-primary">
            {it.category}
          </span>
        )}
      </div>
    </Link>
  )
})

export default function CalendarView({ items: initialItems }: { items: CalItem[] }) {
  const router = useRouter()
  const today = todayKey()
  const t = parseKey(today)
  const [mode, setMode] = useState<Mode>('month')
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: t.y, m: t.m })
  const [weekKey, setWeekKey] = useState<DateKey>(today)
  const [selected, setSelected] = useState<DateKey>(today)

  const [allItems, setAllItems] = useState<CalItem[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [selBar, setSelBar] = useState<string | null>(null)

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)

  const [isDesktop, setIsDesktop] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Set<DateKey>>(new Set())

  const weekRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // initialItems 가 바뀌면(라우터 refresh 후) 동기화
  useEffect(() => {
    setAllItems(initialItems)
  }, [initialItems])

  const usedCategories = useMemo(() => {
    const set = new Set(allItems.map((it) => it.category).filter(Boolean) as string[])
    return JOURNAL_CATEGORIES.filter((c) => set.has(c))
  }, [allItems])

  const filterActiveAny =
    filters.status.length + filters.priority.length + filters.importance.length + filters.category.length > 0 ||
    !filters.hideDone

  const items = useMemo(() => {
    return allItems.filter((it) => {
      if (filters.hideDone && it.done) return false
      if (filters.status.length && !filters.status.includes(normalizeStatus(it.status))) return false
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

  // 막대: 데스크톱은 프로젝트만, 모바일은 전부.
  const bars: BarItem[] = useMemo(() => {
    const src = isDesktop ? items.filter((it) => it.type === 'project') : items
    const sorted = [...src].sort((a, b) =>
      a.start < b.start ? -1 : a.start > b.start ? 1 : (a.time ?? '').localeCompare(b.time ?? ''),
    )
    return sorted.map((it) => ({ id: it.id, start: it.start, end: it.end }))
  }, [items, isDesktop])

  const tasksByDay = useMemo(() => {
    const m: Record<DateKey, CalItem[]> = {}
    if (!isDesktop) return m
    for (const it of items) {
      if (it.type !== 'task') continue
      ;(m[it.start] ||= []).push(it)
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    }
    return m
  }, [items, isDesktop])

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
  function toggleExpand(key: DateKey) {
    setExpandedDays((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  // ── 막대 드래그 (데스크톱 마우스 전용, transform 직접 조작 → 리렌더 0) ──
  function onBarPointerDown(e: React.PointerEvent, it: CalItem, dmode: DragMode, weekIdx: number) {
    if (e.pointerType !== 'mouse') return // 모바일은 드래그 없음(탭=상세)
    if (saving) return
    if (e.button !== undefined && e.button !== 0) return
    const wrap = weekRefs.current[weekIdx]
    if (!wrap) return
    // 드래그 대상은 막대 본체(.cal-bar). 핸들에서 시작하면 closest 로 본체를 찾는다.
    const barEl = (e.currentTarget as HTMLElement).closest('.cal-bar') as HTMLElement | null
    const el = barEl ?? (e.currentTarget as HTMLElement)
    const cellW = wrap.getBoundingClientRect().width / 7
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = {
      id: it.id,
      type: it.type,
      mode: dmode,
      originStart: it.start,
      originEnd: it.end,
      startX: e.clientX,
      cellW: cellW > 0 ? cellW : 1,
      el,
      baseLeftPx: el.offsetLeft,
      baseWidthPx: el.offsetWidth,
      deltaDays: 0,
      moved: false,
    }
    el.style.willChange = 'transform'
    el.style.zIndex = '20'
  }

  function onBarPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || e.pointerType !== 'mouse') return
    const dx = e.clientX - d.startX
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return
    d.moved = true
    // 칸 스냅된 델타(저장용)
    d.deltaDays = Math.round(dx / d.cellW)
    // 화면은 픽셀로 부드럽게(transform/width 직접) — setState 없음.
    const el = d.el
    if (d.mode === 'move') {
      el.style.transform = `translateX(${dx}px)`
    } else if (d.mode === 'resize-end') {
      const w = Math.max(d.cellW * 0.5, d.baseWidthPx + dx)
      el.style.width = `${w}px`
    } else {
      // resize-start: left 이동 + width 보정
      const w = Math.max(d.cellW * 0.5, d.baseWidthPx - dx)
      el.style.transform = `translateX(${dx}px)`
      el.style.width = `${w}px`
    }
  }

  async function onBarPointerUp(e: React.PointerEvent, it: CalItem) {
    if (e.pointerType !== 'mouse') return
    const d = dragRef.current
    dragRef.current = null
    if (!d || d.id !== it.id) return

    // DOM 인라인 스타일 원복(렌더는 곧 state 로 다시 그림)
    const el = d.el
    el.style.transform = ''
    el.style.width = ''
    el.style.willChange = ''
    el.style.zIndex = ''

    // 클릭(임계 미만) = 선택만
    if (!d.moved || d.deltaDays === 0) {
      setSelBar(it.id)
      setSelected(it.start)
      return
    }

    // 새 날짜 계산
    let ns = it.start
    let ne = it.end
    if (d.mode === 'move') {
      ns = shiftKey(d.originStart, d.deltaDays)
      ne = shiftKey(d.originEnd, d.deltaDays)
    } else if (d.mode === 'resize-start') {
      ns = shiftKey(d.originStart, d.deltaDays)
      if (ns > d.originEnd) ns = d.originEnd
      ne = d.originEnd
    } else {
      ne = shiftKey(d.originEnd, d.deltaDays)
      if (ne < d.originStart) ne = d.originStart
      ns = d.originStart
    }
    if (ns === it.start && ne === it.end) return

    const prevItems = allItems
    setAllItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, start: ns, end: ne } : x)))
    setSaving(true)
    try {
      const supabase = createClient()
      if (it.type === 'project') {
        const { error } = await supabase.from('projects').update({ start_date: ns, due_date: ne }).eq('id', it.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tasks').update({ due_date: ne }).eq('id', it.id)
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

  const FilterChips = ({ wrap }: { wrap: boolean }) => (
    <div className={wrap ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-nowrap items-center gap-1.5'}>
      <FilterChip active={filters.hideDone} onClick={() => setFilters((f) => ({ ...f, hideDone: !f.hideDone }))}>
        완료 숨김
      </FilterChip>
      <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
      {STATUSES.map((s) => (
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
      <div className="mb-3">
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

        {filterOpen && (
          <div className="mt-2 rounded-xl border border-line bg-surface-subtle p-2.5 md:hidden">
            <FilterChips wrap />
          </div>
        )}

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
          const barsH = NUM_H + (maxLane + 1) * BAR_H + (maxLane >= 0 ? 6 : 0)
          const minH = `max(${baseMinH}, ${barsH + 6}px)`
          return (
            <div key={wi} className="relative" style={{ minHeight: minH }}>
              <div className="grid h-full grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
                {week.map((c) => {
                  const isToday = c.key === today
                  const isSel = c.key === selected
                  const dow = new Date(c.year, c.month - 1, c.day).getDay()
                  const numCls = isToday || dow === 0 ? 'text-accent' : 'text-muted'
                  const dayTasks = tasksByDay[c.key] ?? []
                  const expanded = expandedDays.has(c.key)
                  const shown = expanded ? dayTasks : dayTasks.slice(0, DESKTOP_MAX_CARDS)
                  const hidden = dayTasks.length - shown.length
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={c.key}
                      onClick={() => {
                        setSelected(c.key)
                        setSelBar(null)
                      }}
                      style={{ minHeight: minH }}
                      className={`relative block cursor-pointer select-none text-left align-top transition ${
                        isSel ? 'bg-primary-soft' : 'bg-surface'
                      } ${c.inMonth ? '' : 'opacity-45'} ${isToday ? 'ring-1 ring-inset ring-accent' : ''}`}
                    >
                      <span className={`absolute left-1 top-0.5 text-[11px] font-semibold md:text-xs ${numCls}`}>
                        {c.day}
                      </span>
                      {isDesktop && (
                        <div
                          className="space-y-1 px-1 pb-1"
                          style={{ paddingTop: `${barsH}px` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {shown.map((it) => (
                            <TaskCard key={it.id} it={it} />
                          ))}
                          {hidden > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(c.key)
                              }}
                              className="w-full rounded-md px-2 py-0.5 text-left text-[10px] font-semibold text-muted hover:text-primary"
                            >
                              + {hidden} 더보기
                            </button>
                          )}
                          {expanded && dayTasks.length > DESKTOP_MAX_CARDS && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(c.key)
                              }}
                              className="w-full rounded-md px-2 py-0.5 text-left text-[10px] font-semibold text-faint hover:text-primary"
                            >
                              접기
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
                  const isTaskBar = it.type === 'task'
                  const showTime = isTaskBar && it.time
                  const isSelBar = selBar === it.id
                  const canResize = it.type === 'project'
                  const shapeRound = isTaskBar ? 'rounded-full' : round
                  return (
                    <div
                      key={`${sg.id}-${sg.startCol}`}
                      onPointerDown={(e) => onBarPointerDown(e, it, 'move', wi)}
                      onPointerMove={onBarPointerMove}
                      onPointerUp={(e) => onBarPointerUp(e, it)}
                      onClick={(e) => onBarClick(e, it)}
                      style={{ left, width, top, height: `${BAR_H - 4}px`, WebkitTouchCallout: 'none' }}
                      className={`cal-bar pointer-events-auto absolute mx-0.5 flex cursor-pointer touch-none select-none items-center gap-1 overflow-hidden border-l-[3px] px-1.5 md:cursor-grab md:active:cursor-grabbing ${shapeRound} ${statusBarCls(
                        it.status,
                      )} ${it.done ? 'opacity-50' : ''} ${isSelBar ? 'opacity-90 ring-2 ring-inset ring-primary' : ''}`}
                    >
                      {canResize && sg.isStart && isSelBar && (
                        <span
                          onPointerDown={(e) => onBarPointerDown(e, it, 'resize-start', wi)}
                          onPointerMove={onBarPointerMove}
                          onPointerUp={(e) => onBarPointerUp(e, it)}
                          className="absolute left-0 top-0 hidden h-full w-2 cursor-ew-resize bg-primary opacity-40 md:block"
                        />
                      )}
                      {showTime && <span className="shrink-0 text-[10px] font-bold">{fmtTimeShort(it.time)}</span>}
                      <span className={`pointer-events-none truncate text-[11px] font-semibold ${it.done ? 'line-through' : ''}`}>
                        {it.title}
                      </span>
                      {canResize && sg.isEnd && isSelBar && (
                        <span
                          onPointerDown={(e) => onBarPointerDown(e, it, 'resize-end', wi)}
                          onPointerMove={onBarPointerMove}
                          onPointerUp={(e) => onBarPointerUp(e, it)}
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
        프로젝트 막대: 클릭=선택 · 끌어서 이동 · 더블클릭=상세 · 선택 후 양 끝으로 기간 조절 / 할 일 카드: 클릭=상세
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
                      className={`h-2.5 w-2.5 shrink-0 ${it.type === 'project' ? 'rounded-sm' : 'rounded-full'} ${statusDotCls(
                        it.status,
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
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${statusBadgeCls(
                        it.status,
                      )}`}
                    >
                      {STATUS_META[normalizeStatus(it.status)].label}
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
