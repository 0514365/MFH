// MFH-BIBLE-HOME-CARD-V5 — 브랜드 색 변주(D3): 면 = 틴트 5(라벤더).
// MFH-BIBLE-HOME-CARD-V4 — 라벨 앞 8px 색 사각형(블록 5 라벤더).
// MFH-BIBLE-HOME-CARD-V3 — 2027(홈 3단계): 연회색 요약 면 · 라벨 Manrope 회색 · 제목 17/600 남색 · 진행 막대 남색 · 상태 배지 2027(완료/정상 흰 알약 · 밀림 waitSoft·호박).
// MFH-BIBLE-HOME-CARD-V2
// 홈 좌측(오늘의 정보) 통독 카드 — 서버 컴포넌트. 활성 계획의 오늘(또는 다음) 분량·진행률·상태 배지 + 바로 읽음 체크(DayCheck).
// 카드 본문은 /bible 링크, 체크 버튼은 별도(링크 안에 버튼 중첩 회피). 계획 없으면 계획 세우기 안내 카드.
import Link from 'next/link'
import { estimateMinutes, longDate, planProgress, progressBadge, shortDate } from '@/lib/bible/plan'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'
import DayCheck from './DayCheck'
import { blockColor } from '@/lib/palette'

export type HomeDay = Pick<ReadingPlanDay, 'id' | 'day_no' | 'read_date' | 'done' | 'chapters' | 'chars' | 'range_label' | 'read_method' | 'read_on' | 'read_time' | 'read_minutes'>

const BADGE_CLS = {
  done: 'bg-white text-b27-ink',
  ok: 'bg-white text-b27-ink',
  warn: 'bg-b27-wait-soft text-b27-wait',
} as const

const Eyebrow = () => (
  <div className="flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted">
    <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: blockColor(5).bg }} aria-hidden="true" />
    성경통독
  </div>
)

export default function BibleHomeCard({ plan, days, today }: { plan: ReadingPlan | null; days: HomeDay[]; today: string }) {
  if (!plan) {
    return (
      <Link href="/bible/new" className="flex flex-col overflow-hidden rounded-2xl bg-b27-tint-5 p-4 transition active:opacity-80">
        <div className="flex items-center justify-between">
          <Eyebrow />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-b27-muted" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </div>
        <div className="mt-1.5 text-[15px] font-semibold leading-tight text-b27-ink">통독 계획 세우기</div>
        <p className="mt-1 text-[13px] text-b27-muted">1년 1독 · 기간과 요일을 정하면 하루 분량을 계산합니다.</p>
      </Link>
    )
  }

  const progress = planProgress(days, today)
  const badge = progressBadge(progress)
  const todayDay = progress.todayDayNo != null ? days.find((d) => d.day_no === progress.todayDayNo) ?? null : null
  const focus = todayDay ?? (progress.nextDayNo != null ? days.find((d) => d.day_no === progress.nextDayNo) ?? null : null)
  const lastDate = days.length ? days[days.length - 1].read_date : plan.end_date

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-b27-tint-5 p-4">
      <Link href="/bible" className="flex items-center justify-between">
        <Eyebrow />
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-num text-[11px] tabular-nums text-b27-muted">
          {progress.doneDays} / {progress.totalDays}일 · {progress.pct}%
        </span>
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <Link href="/bible" className="min-w-0 flex-1">
          {focus ? (
            <>
              <div className="text-[11px] text-b27-muted">
                {todayDay ? '오늘 읽을 분량' : '다음 분량'} · {shortDate(focus.read_date)}
              </div>
              <div className="mt-0.5 truncate text-[17px] font-semibold leading-tight text-b27-ink">{focus.range_label}</div>
              <div className="mt-0.5 text-[12px] text-b27-muted">
                {focus.chapters}장 · {focus.chars.toLocaleString()}자 · 약 {estimateMinutes(focus.chars)}분
              </div>
            </>
          ) : (
            <div className="text-[17px] font-semibold leading-tight text-b27-ink">{progress.completed ? '완독' : '읽을 분량 없음'}</div>
          )}
        </Link>
        {focus && <DayCheck target={focus} done={focus.done} size="lg" />}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-b27-ink" style={{ width: `${progress.pct}%` }} />
      </div>
      <Link href="/bible" className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-b27-muted">
          {plan.title} · {longDate(lastDate)} 완독 예정
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_CLS[badge.tone]}`}>{badge.label}</span>
      </Link>
    </div>
  )
}
