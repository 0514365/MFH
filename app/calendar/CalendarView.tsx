'use client'
// MFH-CAL-IOS-V1
// iOS 목록형 캘린더: 월 그리드(할 일=점만) + 주간 프로젝트 막대 띠 + 선택 날짜 목록.
// 프로젝트는 그리드에 표시하지 않고, 선택 주(일~토) 막대 구역에만 표기. 드래그 없음(보기 전용).
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  STATUSES,
  STATUS_META,
  normalizeStatus,
  PRIORITIES,
  JOURNAL_CATEGORIES,
  IMPORTANCE_MAX,
  type StatusValue,
} from '@/lib/constants'
import { statusChipCls, toggle } from '@/lib/statusChip'
import {
  monthGrid,
  weekGrid,
  chunkWeeks,
  layoutWeekBars,
  addMonth,
  todayKey,
  parseKey,
  fmtKey,
  fmtTime,
  weekRangeLabel,
  MONTH_LABELS,
  DOW_LABELS,
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

const BAR_H = 22
const MAX_DOTS = 3

// 점·도트 = 진한 on-status 색(파스텔 배경 위에서도 잘 보이게).
function dotCls(status: string): string {
  const s = normalizeStatus(status)
  if (s === 'in_progress') return 'bg-on-status-progress'
  if (s === 'done') return 'bg-on-status-done'
  return 'bg-on-status-upcoming'
}
function statusBarCls(status: string): string {
  const s = normalizeStatus(status)
  if (s === 'in_progress') return 'bg-status-progress border-on-status-progress text-on-status-progress'
  if (s === 'done') return 'bg-status-done border-on-status-done text-on-status-done'
  return 'bg-status-upcoming border-on-status-upcoming text-on-status-upcoming'
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
const STATUS_ORDER: StatusValue[] = ['in_progress', 'upcoming', 'done']

type Filters = {
  hideDone: boolean
  status: string[]
  priority: string[]
  importance: number[]
  category: string[]
}
const EMPTY_FILTERS: Filters = { hideDone: true, status: [], priority: [], importance: [], category: [] }

export default function CalendarView({ items: allItems }: { items: CalItem[] }) {
  const today = todayKey()
  const t = parseKey(today)
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: t.y, m: t.m })
  const [selected, setSelected] = useState<DateKey>(today)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)

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

  // 그리드 점: 할 일만. 날짜별 상태 집합(중복 제거, 표시 순서 고정).
  const dayDots = useMemo(() => {
    const m: Record<DateKey, Set<StatusValue>> = {}
    for (const it of items) {
      if (it.type !== 'task') continue
      ;(m[it.start] ||= new Set()).add(normalizeStatus(it.status))
    }
    const out: Record<DateKey, StatusValue[]> = {}
    for (const k of Object.keys(m)) out[k] = STATUS_ORDER.filter((s) => m[k].has(s))
    return out
  }, [items])

  // 프로젝트 막대(주간 띠용)
  const bars: BarItem[] = useMemo(() => {
    return items
      .filter((it) => it.type === 'project')
      .map((it) => ({ id: it.id, start: it.start, end: it.end }))
  }, [items])
  const byId = useMemo(() => {
    const m: Record<string, CalItem> = {}
    for (const it of items) m[it.id] = it
    return m
  }, [items])

  const weeks = chunkWeeks(monthGrid(cur.y, cur.m))

  // 선택 주(일~토) + 그 주 프로젝트 막대
  const selWeek = useMemo(() => weekGrid(selected), [selected])
  const selWeekSegs = useMemo(() => layoutWeekBars(selWeek, bars), [selWeek, bars])
  const selWeekMaxLane = selWeekSegs.reduce((mx, s) => Math.max(mx, s.lane), -1)

  // 선택 날짜에 걸친 항목(프로젝트+할 일) 목록
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

  const title = `${cur.y}년 ${MONTH_LABELS[cur.m - 1]}`

  function prevMonth() {
    setCur(addMonth(cur.y, cur.m, -1))
  }
  function nextMonth() {
    setCur(addMonth(cur.y, cur.m, 1))
  }
  function goToday() {
    setCur({ y: t.y, m: t.m })
    setSelected(today)
  }

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

  return (
    <div>
      {/* 헤더: 월 제목 + 네비 + 오늘 + 필터 */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-xl font-bold text-ink md:text-2xl">{title}</h2>
        <div className="ml-1 flex items-center">
          <button type="button" onClick={prevMonth} aria-label="이전 달" className="rounded-lg px-2 py-1 text-xl leading-none text-muted transition hover:text-primary">
            ‹
          </button>
          <button type="button" onClick={nextMonth} aria-label="다음 달" className="rounded-lg px-2 py-1 text-xl leading-none text-muted transition hover:text-primary">
            ›
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="필터"
            className={`relative inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 transition ${
              filterOpen || filterActiveAny ? 'border-primary text-primary' : 'border-line bg-surface text-muted hover:border-primary'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
            </svg>
            {filterActiveAny && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />}
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mb-3 rounded-xl border border-line bg-surface-subtle p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={filters.hideDone} onClick={() => setFilters((f) => ({ ...f, hideDone: !f.hideDone }))}>
              완료 숨김
            </FilterChip>
            <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
            {STATUSES.map((s) => {
              const active = filters.status.includes(s.value)
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, status: toggle(f.status, s.value) }))}
                  className={`shrink-0 ${statusChipCls(s.value, active)}`}
                >
                  {s.label}
                </button>
              )
            })}
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
            {filterActiveAny && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-auto shrink-0 rounded-full border border-accent px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent-soft"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold md:text-xs">
        {DOW_LABELS.map((d, i) => (
          <div key={d} className={`py-1.5 ${i === 0 ? 'text-accent' : i === 6 ? 'text-on-status-progress' : 'text-faint'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 월 그리드 — 할 일 점만 */}
      <div className="overflow-hidden rounded-2xl border border-line">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${wi > 0 ? 'border-t border-line' : ''}`}>
            {week.map((c, ci) => {
              const isToday = c.key === today
              const isSel = c.key === selected
              const dots = dayDots[c.key] ?? []
              const dow = ci
              const numColor = isToday
                ? 'text-white'
                : !c.inMonth
                  ? 'text-faint/60'
                  : dow === 0
                    ? 'text-accent'
                    : dow === 6
                      ? 'text-on-status-progress'
                      : 'text-ink'
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setSelected(c.key)}
                  className={`flex min-h-[60px] flex-col items-center gap-1 py-1.5 transition md:min-h-[72px] ${
                    ci > 0 ? 'border-l border-line' : ''
                  } ${isSel && !isToday ? 'bg-primary-soft' : ''} ${!c.inMonth ? 'bg-surface-subtle/40' : ''}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold md:text-sm ${numColor} ${
                      isToday ? 'bg-primary' : isSel ? 'ring-1 ring-primary' : ''
                    }`}
                  >
                    {c.day}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {dots.slice(0, MAX_DOTS).map((s) => (
                      <span key={s} className={`h-1.5 w-1.5 rounded-full ${dotCls(s)}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* 주간 프로젝트 막대 띠 — 선택 주(일~토) */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold text-muted">이번 주 프로젝트</h3>
          <span className="text-[10px] text-faint">{weekRangeLabel(selWeek)}</span>
        </div>
        {selWeekSegs.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-4 text-center text-[11px] text-faint">
            이 주에 진행 중인 프로젝트가 없습니다.
          </p>
        ) : (
          <div className="rounded-xl border border-line bg-surface p-2">
            {/* 요일 칸 헤더(선택일 강조) */}
            <div className="grid grid-cols-7 text-center">
              {selWeek.map((c, ci) => {
                const isSel = c.key === selected
                const isToday = c.key === today
                return (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setSelected(c.key)}
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                      isToday ? 'bg-primary text-white' : isSel ? 'ring-1 ring-primary text-primary' : ci === 0 ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {c.day}
                  </button>
                )
              })}
            </div>
            {/* 막대 레인 */}
            <div className="relative mt-1.5" style={{ height: `${(selWeekMaxLane + 1) * BAR_H}px` }}>
              {selWeekSegs.map((sg) => {
                const it = byId[sg.id]
                if (!it) return null
                const left = `${(sg.startCol / 7) * 100}%`
                const width = `${((sg.endCol - sg.startCol + 1) / 7) * 100}%`
                const top = `${sg.lane * BAR_H}px`
                const round =
                  sg.isStart && sg.isEnd ? 'rounded' : sg.isStart ? 'rounded-l' : sg.isEnd ? 'rounded-r' : ''
                return (
                  <Link
                    key={`${sg.id}-${sg.startCol}`}
                    href={it.href}
                    style={{ left, width, top, height: `${BAR_H - 4}px` }}
                    className={`absolute mx-0.5 flex items-center overflow-hidden border-l-[3px] px-1.5 ${round} ${statusBarCls(
                      it.status,
                    )} ${it.done ? 'opacity-50' : ''}`}
                  >
                    <span className={`truncate text-[11px] font-semibold ${it.done ? 'line-through' : ''}`}>
                      {it.title}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 선택 날짜 목록 */}
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
                      className={`h-2.5 w-2.5 shrink-0 ${it.type === 'project' ? 'rounded-sm' : 'rounded-full'} ${dotCls(
                        it.status,
                      )} ${it.done ? 'opacity-30' : ''}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-semibold ${it.done ? 'text-faint line-through' : 'text-ink'}`}>
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
