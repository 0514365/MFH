'use client'

// MFH-BIBLE-DAY-ROW-V2
// 일정·밀린 분량 공용 행 — [체크] 날짜 | 범위·은혜 | 방법·밀림·장수. 본문을 탭하면 아래에 DayCard(record 모드: 요약 → 「수정」 → 「수정 완료」)가 펼쳐진다.
// 이전 기록 수정(읽은 날·시각·소요 분·방법·은혜·기도제목)은 모두 DayCard 가 담당 → 한 곳에서 같은 규칙.
import DayCard from './DayCard'
import DayCheck from './DayCheck'
import { methodLabel } from '@/lib/bible/checkin'
import { shortDate, weekdayOf } from '@/lib/bible/plan'
import type { ReadingPlanDay } from '@/lib/types'

type Props = {
  day: ReadingPlanDay
  today: string
  open: boolean
  onToggle: () => void
}

export default function DayRow({ day: d, today, open, onToggle }: Props) {
  const isToday = d.read_date === today
  const overdue = !d.done && d.read_date < today
  const sun = weekdayOf(d.read_date) === 0

  return (
    <li>
      <div
        className={`flex items-center gap-2.5 rounded-xl border bg-surface px-3 py-2 text-[13px] transition ${
          open ? 'border-primary' : isToday ? 'border-accent' : 'border-line'
        } ${d.done && !open ? 'opacity-60' : ''}`}
      >
        <DayCheck target={d} done={d.done} />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${shortDate(d.read_date)} ${d.range_label} 기록 ${open ? '닫기' : '수정'}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="mt-1.5 pl-2">
          <DayCard key={d.id} day={d} heading="기록" mode="record" />
        </div>
      )}
    </li>
  )
}
