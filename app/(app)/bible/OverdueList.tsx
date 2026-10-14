'use client'

// MFH-BIBLE-OVERDUE-LIST-V1
// 밀린 분량 목록 — DayRow 재사용(체크 + 탭하면 인라인 편집). 한 행만 펼침.
import { useState } from 'react'
import DayRow from './DayRow'
import type { ReadingPlanDay } from '@/lib/types'

export default function OverdueList({ days, today }: { days: ReadingPlanDay[]; today: string }) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (days.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {days.map((d) => (
        <DayRow key={d.id} day={d} today={today} open={openId === d.id} onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))} />
      ))}
    </ul>
  )
}
