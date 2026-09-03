'use client'

// MFH-BIBLE-SCHEDULE-LIST-V2
// 전체 일정 — 월별 아코디언(오늘이 속한 달만 기본 펼침). 행 = 읽음 체크 + 날짜(일요일 빨강) + 범위 + 장수, 은혜 한 줄 미리보기.
import { useMemo, useState } from 'react'
import DayCheck from './DayCheck'
import { methodLabel } from '@/lib/bible/checkin'
import { shortDate, weekdayOf } from '@/lib/bible/plan'
import type { ReadingPlanDay } from '@/lib/types'

type MonthGroup = { key: string; label: string; days: ReadingPlanDay[]; done: number; chapters: number }

export default function ScheduleList({ days, today }: { days: ReadingPlanDay[]; today: string }) {
  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, MonthGroup>()
    for (const d of days) {
      const key = d.read_date.slice(0, 7)
      let g = map.get(key)
      if (!g) {
        const [y, m] = key.split('-')
        g = { key, label: `${y}년 ${Number(m)}월`, days: [], done: 0, chapters: 0 }
        map.set(key, g)
      }
      g.days.push(d)
      g.chapters += d.chapters
      if (d.done) g.done++
    }
    return Array.from(map.values())
  }, [days])

  const todayKey = today.slice(0, 7)
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.some((g) => g.key === todayKey) ? [todayKey] : groups[0] ? [groups[0].key] : []))
  const [allOpen, setAllOpen] = useState(false)

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-primary">일정</h3>
        <button
          type="button"
          onClick={() => {
            setAllOpen((v) => !v)
            setOpen(new Set(allOpen ? [todayKey] : groups.map((g) => g.key)))
          }}
          className="text-[12px] font-semibold text-accent"
        >
          {allOpen ? '이번 달만' : '전체 펼치기'}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const isOpen = open.has(g.key)
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-xl bg-surface-subtle px-3 py-2 text-[13px] font-semibold text-primary"
              >
                <span>{g.label}</span>
                <span className="text-[11px] font-medium text-muted">
                  {g.done}/{g.days.length}일 · {g.chapters}장 {isOpen ? '▴' : '▾'}
                </span>
              </button>
              {isOpen && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {g.days.map((d) => {
                    const isToday = d.read_date === today
                    const overdue = !d.done && d.read_date < today
                    const sun = weekdayOf(d.read_date) === 0
                    return (
                      <li
                        key={d.id}
                        className={`flex items-center gap-2.5 rounded-xl border bg-surface px-3 py-2 text-[13px] ${
                          isToday ? 'border-accent' : 'border-line'
                        } ${d.done ? 'opacity-60' : ''}`}
                      >
                        <DayCheck id={d.id} done={d.done} chars={d.chars} method={d.read_method} />
                        <span className={`w-[54px] shrink-0 text-[12px] ${sun ? 'text-accent' : 'text-muted'}`}>{shortDate(d.read_date)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">{d.range_label}</span>
                          {d.grace && <span className="block truncate text-[11px] text-muted">{d.grace}</span>}
                        </span>
                        <span className="shrink-0 text-[11px] text-faint">
                          {d.done && d.read_method && <span className="mr-1 text-[10px] text-muted">{methodLabel(d.read_method, true)}</span>}
                          {overdue && <span className="mr-1 rounded-full bg-[#FFF1E6] px-1.5 py-0.5 text-[10px] font-semibold text-[#B45309]">밀림</span>}
                          {d.chapters}장
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
