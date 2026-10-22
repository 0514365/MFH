'use client'
// MFH-CAL-IOS-V2 — 2027(4-4): 회계 달력 문법(칸 테두리 없음 · 숫자 · 오늘 남색 원 · 선택 민트 원 · 일 빨강/토 터키석) · 점 = 할 일 살구/지남 빨강/완료 민트 ·
//   이번 주 프로젝트 = 로즈 틴트 막대(연회색 면) · 선택일 = 2줄 행(+ 그날 걸친 프로젝트) · 범례 한글 · 넓은 화면 2단(달력 · 목록).
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

// 점 종류 — 할 일 = 살구 · 지남(미완료 · 오늘 이전) = 빨강 · 완료 = 민트.
type DotKind = 'todo' | 'overdue' | 'done'
const DOT_CLS: Record<DotKind, string> = {
  todo: 'bg-b27-block-3',
  overdue: 'bg-b27-expense',
  done: 'bg-b27-block-4',
}
const DOT_ORDER: DotKind[] = ['overdue', 'todo', 'done']
function priRank(priority: string): number {
  return priority === 'high' ? 0 : priority === 'low' ? 2 : 1
}
// 막대용 짧은 기간 'M.D – M.D' (하루면 'M.D')
function fmtRange(start: DateKey, end: DateKey): string {
  const s = parseKey(start)
  const e = parseKey(end)
  if (start === end) return `${s.m}.${s.d}`
  return `${s.m}.${s.d} – ${e.m}.${e.d}`
}

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

  // 그리드 점: 할 일만. 할 일 1건 = 점 1개(지남 → 할 일 → 완료 순, 최대 MAX_DOTS).
  const dayDots = useMemo(() => {
    const m: Record<DateKey, DotKind[]> = {}
    for (const it of items) {
      if (it.type !== 'task') continue
      const kind: DotKind = it.done ? 'done' : it.start < today ? 'overdue' : 'todo'
      ;(m[it.start] ||= []).push(kind)
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => DOT_ORDER.indexOf(a) - DOT_ORDER.indexOf(b))
    return m
  }, [items, today])

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

  // 선택 날짜에 걸친 프로젝트(기간 안) — 목록 아래 로즈 행.
  const selProjects = useMemo(
    () => items.filter((it) => it.type === 'project' && it.start <= selected && selected <= it.end),
    [items, selected],
  )

  // 선택 날짜 목록 = 그날 할 일(시간 → 우선순위 순)
  const selItems = useMemo(() => {
    return items
      .filter((it) => it.type === 'task' && it.start === selected)
      .sort((a, b) => {
        const ta = a.time ?? ''
        const tb = b.time ?? ''
        if (ta !== tb) return ta.localeCompare(tb)
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
      className={`shrink-0 rounded-full px-3 py-1 text-[12px] transition active:opacity-70 ${
        active ? 'bg-b27-ink font-medium text-white' : 'bg-b27-paper text-b27-muted'
      }`}
    >
      {children}
    </button>
  )

  const sepCls = 'mx-0.5 h-4 w-px shrink-0 bg-b27-paper'
  const pillHead = 'inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[13px] font-semibold'

  // 이번 주 프로젝트(로즈 막대, 연회색 면)
  const weekBlock = (
    <section className="flex flex-col gap-2">
      <h3 className={pillHead} style={{ background: 'var(--b27-tint-6)', color: 'var(--b27-deep-6)' }}>
        <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-6" aria-hidden="true" />
        이번 주 프로젝트
        <span className="font-num font-medium text-b27-muted">{weekRangeLabel(selWeek)}</span>
      </h3>
      {selWeekSegs.length === 0 ? (
        <p className="rounded-2xl bg-b27-card px-4 py-3 text-center text-[12px] text-b27-muted">이 주에 진행 중인 프로젝트가 없습니다.</p>
      ) : (
        <div className="rounded-2xl bg-b27-card p-2.5">
          {/* 요일 칸 헤더(선택일 · 오늘 강조) */}
          <div className="grid grid-cols-7 text-center">
            {selWeek.map((c) => {
              const isSel = c.key === selected
              const isToday = c.key === today
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setSelected(c.key)}
                  className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full font-num text-[11px] transition ${
                    isToday ? 'bg-b27-ink font-semibold text-white' : isSel ? 'font-semibold text-[#226C5A]' : 'text-b27-muted'
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
              const round = sg.isStart && sg.isEnd ? 'rounded-md' : sg.isStart ? 'rounded-l-md' : sg.isEnd ? 'rounded-r-md' : ''
              return (
                <Link
                  key={`${sg.id}-${sg.startCol}`}
                  href={it.href}
                  style={{ left, width, top, height: `${BAR_H - 4}px`, color: 'var(--b27-deep-6)', boxShadow: 'inset 0 0 0 1px rgba(240,127,138,0.35)' }}
                  className={`absolute flex items-center overflow-hidden bg-b27-tint-6 px-2 ${round} ${it.done ? 'opacity-50' : ''}`}
                >
                  <span className={`truncate text-[11.5px] font-medium ${it.done ? 'line-through' : ''}`}>
                    {it.title} <span className="font-num font-normal opacity-70">{fmtRange(it.start, it.end)}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )

  // 선택 날짜 목록(2줄 행) — 할 일(살구) + 그날 걸친 프로젝트(로즈)
  const dayBlock = (
    <section className="flex flex-col gap-1">
      <h3 className={pillHead} style={{ background: 'var(--b27-tint-4)', color: 'var(--b27-deep-4)' }}>
        <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-4" aria-hidden="true" />
        {fmtKey(selected)}
        <span className="font-num font-medium text-b27-muted">{selItems.length + selProjects.length}</span>
      </h3>
      {selItems.length + selProjects.length === 0 ? (
        <p className="mt-1 rounded-2xl bg-b27-card px-4 py-4 text-center text-[12px] text-b27-muted">이 날짜에 일정이 없습니다.</p>
      ) : (
        <ul>
          {selItems.map((it) => {
            const overdue = !it.done && it.start < today
            const st = normalizeStatus(it.status)
            const sub = [it.time ? fmtTime(it.time) : null, st === 'in_progress' ? STATUS_META[st].label : null, it.category].filter(Boolean).join(' · ')
            return (
              <li key={it.id} className="border-b border-b27-line last:border-b-0">
                <Link href={it.href} className="flex items-start gap-3 px-1 py-[11px] transition active:opacity-70">
                  <span className={`mt-[6px] inline-block h-[9px] w-[9px] shrink-0 rounded-[3px] bg-b27-block-3 ${it.done ? 'opacity-40' : ''}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] font-medium ${it.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>{it.title}</span>
                    {(overdue || sub) && (
                      <span className="mt-0.5 block truncate font-num text-[12px] text-b27-muted">
                        {overdue && <span className="font-semibold text-b27-expense">지남{sub ? ' · ' : ''}</span>}
                        {sub}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
          {selProjects.map((it) => (
            <li key={it.id} className="border-b border-b27-line last:border-b-0">
              <Link href={it.href} className="flex items-start gap-3 px-1 py-[11px] transition active:opacity-70">
                <span className="mt-[6px] inline-block h-[9px] w-[9px] shrink-0 rounded-[3px] bg-b27-block-6" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-medium ${it.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}>{it.title}</span>
                  <span className="mt-0.5 block truncate font-num text-[12px] text-b27-muted">프로젝트 · {fmtRange(it.start, it.end)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  return (
    <div className="flex flex-col gap-4 @4xl:grid @4xl:grid-cols-[1.4fr_1fr] @4xl:items-start @4xl:gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        {/* 머리: 오늘 · ‹ 년월 › · 필터 */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="justify-self-start rounded-full bg-b27-card px-3.5 py-1.5 text-xs font-medium text-b27-ink transition active:opacity-70"
          >
            오늘
          </button>
          <div className="flex items-center justify-self-center gap-1">
            <button type="button" onClick={prevMonth} aria-label="이전 달" className="flex h-9 w-9 items-center justify-center text-xl leading-none text-b27-muted transition active:opacity-60">
              ‹
            </button>
            <h2 className="whitespace-nowrap font-num text-[19px] font-semibold text-b27-ink">{title}</h2>
            <button type="button" onClick={nextMonth} aria-label="다음 달" className="flex h-9 w-9 items-center justify-center text-xl leading-none text-b27-muted transition active:opacity-60">
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            className={`justify-self-end rounded-full px-3.5 py-1.5 text-xs font-medium transition active:opacity-70 ${
              filterOpen || filterActiveAny ? 'bg-b27-ink text-white' : 'bg-b27-card text-b27-muted'
            }`}
          >
            필터
          </button>
        </div>

        {filterOpen && (
          <div className="rounded-2xl bg-b27-card p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip active={filters.hideDone} onClick={() => setFilters((f) => ({ ...f, hideDone: !f.hideDone }))}>
                완료 숨김
              </FilterChip>
              <span className={sepCls} />
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
              <span className={sepCls} />
              {PRIORITIES.map((p) => (
                <FilterChip
                  key={p.value}
                  active={filters.priority.includes(p.value)}
                  onClick={() => setFilters((f) => ({ ...f, priority: toggle(f.priority, p.value) }))}
                >
                  {p.label}
                </FilterChip>
              ))}
              <span className={sepCls} />
              {Array.from({ length: IMPORTANCE_MAX }, (_, i) => i + 1).map((n) => (
                <FilterChip
                  key={n}
                  active={filters.importance.includes(n)}
                  onClick={() => setFilters((f) => ({ ...f, importance: toggle(f.importance, n) }))}
                >
                  {'★'.repeat(n)}
                </FilterChip>
              ))}
              {usedCategories.length > 0 && <span className={sepCls} />}
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
                  className="ml-auto shrink-0 px-2 py-1 text-[11px] text-b27-muted"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        )}

        {/* 달력 — 칸 테두리 없음 · 숫자만 · 오늘 남색 원 · 선택 민트 원 · 일요일 빨강 · 토요일 터키석 · 점 = 할 일 */}
        <div>
          <div className="grid grid-cols-7 text-center">
            {DOW_LABELS.map((d, i) => (
              <div key={d} className={`py-1 font-num text-[11px] ${i === 0 ? 'text-b27-sun' : i === 6 ? 'text-b27-sat' : 'text-b27-muted'}`}>
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((c, ci) => {
                const isToday = c.key === today
                const isSel = c.key === selected
                const dots = dayDots[c.key] ?? []
                const numColor = isToday
                  ? 'text-white'
                  : isSel
                    ? 'text-[#226C5A]'
                    : !c.inMonth
                      ? 'text-[#C9CDD8]'
                      : ci === 0
                        ? 'text-b27-sun'
                        : ci === 6
                          ? 'text-b27-sat'
                          : 'text-b27-ink'
                return (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setSelected(c.key)}
                    aria-label={fmtKey(c.key)}
                    aria-pressed={isSel}
                    className="flex h-[46px] flex-col items-center gap-[3px] pt-1 transition active:opacity-70 @4xl:h-[68px]"
                  >
                    <span
                      className={`flex h-[30px] w-[30px] items-center justify-center rounded-full font-num text-[14px] font-medium ${numColor} ${
                        isToday ? 'bg-b27-ink' : isSel ? 'bg-b27-tint-4' : ''
                      }`}
                    >
                      {c.day}
                    </span>
                    <span className="flex h-[5px] items-center gap-[3px]">
                      {dots.slice(0, MAX_DOTS).map((k, i) => (
                        <span key={i} className={`h-[5px] w-[5px] rounded-full ${DOT_CLS[k]}`} />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-b27-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-[5px] w-[5px] rounded-full bg-b27-block-3" />할 일</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[5px] w-[5px] rounded-full bg-b27-expense" />지남</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[5px] w-[5px] rounded-full bg-b27-block-4" />완료</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-[3px] bg-b27-tint-6" />프로젝트 기간</span>
        </div>
      </div>

      {/* 모바일: 이번 주 → 선택일 / 넓은 화면(우): 선택일 → 이번 주 */}
      <div className="flex min-w-0 flex-col gap-4 @4xl:sticky @4xl:top-[64px]">
        <div className="order-2 @4xl:order-1">{dayBlock}</div>
        <div className="order-1 @4xl:order-2">{weekBlock}</div>
      </div>
    </div>
  )
}
