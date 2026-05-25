'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { statusLabel } from '@/lib/constants'
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
  status: string
  priority: string
  done: boolean
  href: string
}

type Mode = 'month' | 'week'

const BAR_H = 20 // 막대 1개 높이(+간격 포함 단위)
const NUM_H = 22 // 날짜 숫자 영역 높이

// 우선순위 → 막대 배경 틴트 + 좌측 색바
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

export default function CalendarView({ items }: { items: CalItem[] }) {
  const today = todayKey()
  const t = parseKey(today)
  const [mode, setMode] = useState<Mode>('month')
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: t.y, m: t.m })
  const [weekKey, setWeekKey] = useState<DateKey>(today)
  const [selected, setSelected] = useState<DateKey>(today)

  const byId = useMemo(() => {
    const m: Record<string, CalItem> = {}
    for (const it of items) m[it.id] = it
    return m
  }, [items])

  const bars: BarItem[] = useMemo(
    () => items.map((it) => ({ id: it.id, start: it.start, end: it.end })),
    [items],
  )

  const weeks: Cell[][] =
    mode === 'month' ? chunkWeeks(monthGrid(cur.y, cur.m)) : [weekGrid(weekKey)]

  const title =
    mode === 'month'
      ? `${cur.y}년 ${MONTH_LABELS[cur.m - 1]}`
      : `${parseKey(weekKey).y}년 ${weekRangeLabel(weeks[0])}`

  // 선택일에 걸치는 항목(기간 포함) → 프로젝트 먼저, 우선순위순
  const selItems = useMemo(() => {
    return items
      .filter((it) => it.start <= selected && selected <= it.end)
      .sort((a, b) => {
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

  // 반응형 셀 최소 높이: 가로/세로(vh)에 따라 유기적. 주 뷰는 더 크게.
  const baseMinH = mode === 'month' ? 'clamp(58px, 11vh, 116px)' : 'clamp(120px, 46vh, 460px)'

  return (
    <div>
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
                      onClick={() => setSelected(c.key)}
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

              <div className="pointer-events-none absolute inset-0">
                {segs.map((sg) => {
                  const it = byId[sg.id]
                  if (!it) return null
                  const left = `${(sg.startCol / 7) * 100}%`
                  const width = `${((sg.endCol - sg.startCol + 1) / 7) * 100}%`
                  const top = `${NUM_H + sg.lane * BAR_H}px`
                  const round = sg.isStart && sg.isEnd ? 'rounded' : sg.isStart ? 'rounded-l' : sg.isEnd ? 'rounded-r' : ''
                  return (
                    <Link
                      key={`${sg.id}-${sg.startCol}`}
                      href={it.href}
                      onClick={(e) => e.stopPropagation()}
                      style={{ left, width, top, height: `${BAR_H - 4}px` }}
                      className={`pointer-events-auto absolute mx-0.5 flex items-center gap-1 overflow-hidden border-l-[3px] px-1.5 ${round} ${barTone(
                        it.priority,
                      )} ${it.done ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`truncate text-[11px] font-semibold ${barText(it.priority)} ${
                          it.done ? 'line-through' : ''
                        }`}
                      >
                        {it.title}
                      </span>
                      {it.type === 'project' && (
                        <span className={`ml-auto hidden shrink-0 text-[10px] opacity-70 md:inline ${barText(it.priority)}`}>
                          {statusLabel(it.status)}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

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
                      {span && (
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {fmtKey(it.start)} – {fmtKey(it.end)}
                        </span>
                      )}
                    </span>
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
