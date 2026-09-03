// MFH-BIBLE-HOME-CARD-V2
// 홈 좌측(오늘의 정보) 통독 카드 — 서버 컴포넌트. 활성 계획의 오늘(또는 다음) 분량·진행률·상태 배지 + 바로 읽음 체크(DayCheck).
// 카드 본문은 /bible 링크, 체크 버튼은 별도(링크 안에 버튼 중첩 회피). 계획 없으면 계획 세우기 안내 카드.
import Link from 'next/link'
import { estimateMinutes, longDate, planProgress, progressBadge, shortDate } from '@/lib/bible/plan'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'
import DayCheck from './DayCheck'

export type HomeDay = Pick<ReadingPlanDay, 'id' | 'day_no' | 'read_date' | 'done' | 'chapters' | 'chars' | 'range_label' | 'read_method'>

const BADGE_CLS = {
  done: 'bg-status-done text-on-status-done',
  ok: 'bg-status-done text-on-status-done',
  warn: 'bg-[#FFF1E6] text-[#B45309]',
} as const

const Eyebrow = () => (
  <div className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-accent">성경통독 · Bible in a Year</div>
)

export default function BibleHomeCard({ plan, days, today }: { plan: ReadingPlan | null; days: HomeDay[]; today: string }) {
  if (!plan) {
    return (
      <Link href="/bible/new" className="flex flex-col overflow-hidden rounded-3xl bg-primary-soft p-5 transition active:scale-[0.99]">
        <div className="flex items-center justify-between">
          <Eyebrow />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary opacity-60">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </div>
        <div className="mt-2 text-[17px] font-bold leading-tight text-ink">통독 계획 세우기</div>
        <p className="mt-1 text-[13px] text-muted">1년 1독 · 기간과 요일을 정하면 하루 분량을 계산합니다.</p>
      </Link>
    )
  }

  const progress = planProgress(days, today)
  const badge = progressBadge(progress)
  const todayDay = progress.todayDayNo != null ? days.find((d) => d.day_no === progress.todayDayNo) ?? null : null
  const focus = todayDay ?? (progress.nextDayNo != null ? days.find((d) => d.day_no === progress.nextDayNo) ?? null : null)
  const lastDate = days.length ? days[days.length - 1].read_date : plan.end_date

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-primary-soft p-5">
      <Link href="/bible" className="flex items-center justify-between">
        <Eyebrow />
        <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-primary">
          {progress.doneDays} / {progress.totalDays}일 · {progress.pct}%
        </span>
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <Link href="/bible" className="min-w-0 flex-1">
          {focus ? (
            <>
              <div className="text-[11px] text-muted">
                {todayDay ? '오늘 읽을 분량' : '다음 분량'} · {shortDate(focus.read_date)}
              </div>
              <div className="mt-0.5 truncate text-[19px] font-bold leading-tight text-ink">{focus.range_label}</div>
              <div className="mt-0.5 text-[12px] text-muted">
                {focus.chapters}장 · {focus.chars.toLocaleString()}자 · 약 {estimateMinutes(focus.chars)}분
              </div>
            </>
          ) : (
            <div className="text-[17px] font-bold leading-tight text-ink">{progress.completed ? '완독' : '읽을 분량 없음'}</div>
          )}
        </Link>
        {focus && <DayCheck id={focus.id} done={focus.done} chars={focus.chars} method={focus.read_method} size="lg" />}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress.pct}%` }} />
      </div>
      <Link href="/bible" className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted">
          {plan.title} · {longDate(lastDate)} 완독 예정
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_CLS[badge.tone]}`}>{badge.label}</span>
      </Link>
    </div>
  )
}
