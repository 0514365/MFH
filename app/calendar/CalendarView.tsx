'use client'
// MFH-DND-V1
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
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

export default function CalendarView({ items: initialItems }: { items: CalItem[] }) {
  const router = useRouter()
  const today = todayKey()
  const t = parseKey(today)
  const [mode, setMode] = useState<Mode>('month')
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: t.y, m: t.m })
  const [weekKey, setWeekKey] = useState<DateKey>(today)
  const [selected, setSelected] = useState<DateKey>(today)

  // 낙관적 갱신을 위해 items 를 로컬 state 로 보유.
  const [items, setItems] = useState<CalItem[]>(initialItems)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [saving, setSaving] = useState(false)

  const weekRefs = useRef<(HTMLDivElement | null)[]>([])

  const byId = useMemo(() => {
    const m: Record<string, CalItem> = {}
    for (const it of items) m[it.id] = it
    return m
  }, [items])

  // 드래그 중인 항목의 미리보기(시프트 적용) 좌표를 계산.
  function previewRange(it: CalItem): { start: DateKey; end: DateKey } {
    if (!drag || drag.id !== it.id || drag.deltaDays === 0) return { start: it.start, end: it.end }
    if (drag.mode === 'move') {
      return { start: shiftKey(drag.originStart, drag.deltaDays), end: shiftKey(drag.originEnd, drag.deltaDays) }
    }
    if (drag.mode === 'resize-start') {
      let ns = shiftKey(drag.originStart, drag.deltaDays)
      if (ns > drag.originEnd) ns = drag.originEnd // start 가 end 넘지 못함
      return { start: ns, end: drag.originEnd }
    }
    // resize-end
    let ne = shiftKey(drag.originEnd, drag.deltaDays)
    if (ne < drag.originStart) ne = drag.originStart
    return { start: drag.originStart, end: ne }
  }

  // 막대 입력은 (시작일 → 시간) 순. 드래그 중이면 미리보기 좌표로 배치.
  const bars: BarItem[] = useMemo(() => {
    const withPv = items.map((it) => {
      const pv = previewRange(it)
      return { it, start: pv.start, end: pv.end }
    })
    const sorted = withPv.sort((a, b) =>
      a.start < b.start ? -1 : a.start > b.start ? 1 : (a.it.time ?? '').localeCompare(b.it.time ?? ''),
    )
    return sorted.map((x) => ({ id: x.it.id, start: x.start, end: x.end }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, drag])

  const weeks: Cell[][] =
    mode === 'month' ? chunkWeeks(monthGrid(cur.y, cur.m)) : [weekGrid(weekKey)]

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

  // ── 드래그 핸들러 ───────────────────────────────
  function onBarPointerDown(e: React.PointerEvent, it: CalItem, dmode: DragMode, weekIdx: number) {
    if (saving) return
    if (e.button !== undefined && e.button !== 0) return // 좌클릭만
    const wrap = weekRefs.current[weekIdx]
    if (!wrap) return
    const cellW = wrap.getBoundingClientRect().width / 7
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({
      id: it.id,
      type: it.type,
      mode: dmode,
      originStart: it.start,
      originEnd: it.end,
      startX: e.clientX,
      cellW: cellW > 0 ? cellW : 1,
      deltaDays: 0,
      moved: false,
    })
  }

  function onBarPointerMove(e: React.PointerEvent) {
    if (!drag) return
    const dx = e.clientX - drag.startX
    const moved = drag.moved || Math.abs(dx) >= DRAG_THRESHOLD
    const deltaDays = Math.round(dx / drag.cellW)
    if (deltaDays === drag.deltaDays && moved === drag.moved) return
    setDrag({ ...drag, deltaDays, moved })
  }

  async function onBarPointerUp(e: React.PointerEvent, it: CalItem) {
    if (!drag || drag.id !== it.id) {
      setDrag(null)
      return
    }
    const d = drag
    // 임계 미만 = 클릭으로 간주 → 네비게이트.
    if (!d.moved || d.deltaDays === 0) {
      setDrag(null)
      router.push(it.href)
      return
    }
    const pv = previewRange(it)
    setDrag(null)
    if (pv.start === it.start && pv.end === it.end) return

    // 낙관적 갱신
    const prevItems = items
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, start: pv.start, end: pv.end } : x)))
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
        // 할 일: due_date 만 이동(due_time 유지). task 는 span 없으므로 start=end.
        const { error } = await supabase.from('tasks').update({ due_date: pv.end }).eq('id', it.id)
        if (error) throw error
      }
      router.refresh()
    } catch (err) {
      console.error('calendar drag save failed', err)
      setItems(prevItems) // rollback
      alert('일정 변경 저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const baseMinH = mode === 'month' ? 'clamp(58px, 11vh, 116px)' : 'clamp(120px, 46vh, 460px)'

  return (
    <div className={saving ? 'pointer-events-none opacity-60' : ''}>
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
                  const canResize = it.type === 'project'
                  return (
                    <div
                      key={`${sg.id}-${sg.startCol}`}
                      onPointerDown={(e) => onBarPointerDown(e, it, 'move', wi)}
                      onPointerMove={onBarPointerMove}
                      onPointerUp={(e) => onBarPointerUp(e, it)}
                      style={{ left, width, top, height: `${BAR_H - 4}px` }}
                      className={`pointer-events-auto absolute mx-0.5 flex cursor-grab touch-none items-center gap-1 overflow-hidden border-l-[3px] px-1.5 active:cursor-grabbing ${round} ${barTone(
                        it.priority,
                      )} ${it.done ? 'opacity-50' : ''} ${isDragging ? 'opacity-80 ring-1 ring-inset ring-primary' : ''}`}
                    >
                      {/* 시작 핸들(프로젝트·이 주에 시작) */}
                      {canResize && sg.isStart && (
                        <span
                          onPointerDown={(e) => onBarPointerDown(e, it, 'resize-start', wi)}
                          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
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
                      {/* 끝 핸들(프로젝트·이 주에 끝) */}
                      {canResize && sg.isEnd && (
                        <span
                          onPointerDown={(e) => onBarPointerDown(e, it, 'resize-end', wi)}
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
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

      <p className="mt-2 text-center text-[10px] text-faint">
        막대를 끌어 날짜 이동 · 프로젝트는 양 끝을 끌어 기간 조절
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
