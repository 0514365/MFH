'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  monthGrid,
  weekGrid,
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
} from '@/lib/calendar'

export type CalItem = {
  id: string
  type: 'project' | 'task'
  title: string
  date: DateKey
  priority: string
  done: boolean
  href: string
}

type Mode = 'month' | 'week'

// 우선순위 → 점 색 (색-슬래시 opacity 미사용: var 매핑이라 동작 안 함)
function priDot(priority: string): string {
  return priority === 'high' ? 'bg-accent' : priority === 'low' ? 'bg-faint' : 'bg-primary'
}

// 타입 → 점 모양: 프로젝트=네모, 할 일=원
function shape(type: CalItem['type']): string {
  return type === 'project' ? 'rounded-sm' : 'rounded-full'
}

export default function CalendarView({ items }: { items: CalItem[] }) {
  const today = todayKey()
  const t = parseKey(today)
  const [mode, setMode] = useState<Mode>('month')
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: t.y, m: t.m })
  const [weekKey, setWeekKey] = useState<DateKey>(today)
  const [selected, setSelected] = useState<DateKey>(today)

  const byDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    for (const it of items) (map[it.date] ??= []).push(it)
    return map
  }, [items])

  const cells: Cell[] = mode === 'month' ? monthGrid(cur.y, cur.m) : weekGrid(weekKey)
  const selItems = byDate[selected] ?? []

  const title =
    mode === 'month'
      ? `${cur.y}년 ${MONTH_LABELS[cur.m - 1]}`
      : `${parseKey(weekKey).y}년 ${weekRangeLabel(cells)}`

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

  const cellMinH = mode === 'month' ? 'min-h-[46px]' : 'min-h-[72px]'

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
        <div className="font-display text-base font-bold text-ink">{title}</div>
        <button type="button" onClick={next} className="rounded-lg px-3 py-1 text-xl leading-none text-muted">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold">
        {DOW_LABELS.map((d, i) => (
          <div key={d} className={`py-1 ${i === 0 ? 'text-accent' : 'text-faint'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const dayItems = byDate[c.key] ?? []
          const isToday = c.key === today
          const isSel = c.key === selected
          const dow = new Date(c.year, c.month - 1, c.day).getDay()
          const cellCls = isSel
            ? 'border-primary bg-primary-soft'
            : isToday
              ? 'border-accent bg-surface'
              : 'border-line bg-surface'
          const numCls = isToday || dow === 0 ? 'text-accent' : 'text-muted'
          return (
            <button
              type="button"
              key={c.key}
              onClick={() => setSelected(c.key)}
              className={`${cellMinH} rounded-lg border p-1 text-left transition ${cellCls} ${
                c.inMonth ? '' : 'opacity-40'
              }`}
            >
              <div className={`text-[11px] font-semibold ${numCls}`}>{c.day}</div>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {dayItems.slice(0, 4).map((it) => (
                  <span
                    key={it.id}
                    className={`h-1.5 w-1.5 ${shape(it.type)} ${priDot(it.priority)} ${
                      it.done ? 'opacity-30' : ''
                    }`}
                  />
                ))}
                {dayItems.length > 4 && (
                  <span className="text-[9px] leading-none text-faint">+{dayItems.length - 4}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold text-muted">{fmtKey(selected)}</div>
        {selItems.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-xs text-faint">
            이 날짜에 마감 항목이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {selItems.map((it) => (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-primary"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 ${shape(it.type)} ${priDot(it.priority)} ${
                      it.done ? 'opacity-30' : ''
                    }`}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      it.done ? 'text-faint line-through' : 'text-ink'
                    }`}
                  >
                    {it.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] text-muted">
                    {it.type === 'project' ? '프로젝트' : '할 일'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
