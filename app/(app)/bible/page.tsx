// MFH-BIBLE-PAGE-V5 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.
// MFH-BIBLE-PAGE-V4 (밀린 분량 「남은 기간 재분배」 버튼 — RebalanceButton/patch113)
// MFH-BIBLE-PAGE-V3 (통독 범위 배지: 전체면 읽기 순서, 구약만/신약만이면 범위)
// /bible — 성경통독 메인. 활성 계획의 진행 요약 + 오늘(또는 다음) 분량 카드 + 밀린 분량 + 월별 일정(행 탭 = 이전 기록 수정).
// 계획이 없으면 안내 카드(/bible/new). 데이터 = reading_plans(활성 1개) + reading_plan_days(전체).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import { longDate, planProgress, planScope, progressBadge, scopeOrderLabel, shortDate, SPLIT_MODE_LABEL, WEEKDAY_KR } from '@/lib/bible/plan'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'
import DayCard from './DayCard'
import OverdueList from './OverdueList'
import RebalanceButton from './RebalanceButton'
import ScheduleList from './ScheduleList'

export const dynamic = 'force-dynamic'

const BADGE_CLS = {
  done: 'bg-b27-tint-4 text-[#226C5A]',
  ok: 'bg-white text-b27-ink',
  warn: 'bg-b27-wait-soft text-b27-wait',
} as const

export default async function BiblePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  const { data: planRow } = await supabase.from('reading_plans').select('*').eq('is_active', true).maybeSingle()
  const plan = planRow as ReadingPlan | null

  const manageAction = (
    <Link href="/bible/plans" className="rounded-xl border border-b27-line px-3 py-2 text-[12px] font-medium text-b27-muted transition hover:border-b27-muted">
      계획 관리
    </Link>
  )

  if (!plan) {
    return (
      <main className="theme-2027 mx-auto max-w-md px-5 pb-8">
        <PageHeader title="성경통독" action={manageAction} />
        <div className="rounded-3xl border border-b27-line bg-b27-paper p-6 text-center">
          <p className="text-base font-semibold text-b27-ink">활성 통독 계획이 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-b27-muted">
            1년 1독을 기본으로 기간·제외 요일·읽기 순서·배분 방식을 정하면
            <br />
            하루 분량이 자동으로 계산됩니다.
          </p>
          <Link href="/bible/new" className="mt-5 inline-block rounded-xl bg-b27-ink px-5 py-3 text-sm font-semibold text-white">
            통독 계획 세우기
          </Link>
        </div>
      </main>
    )
  }

  const { data: dayRows } = await supabase
    .from('reading_plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_no', { ascending: true })
  const days = (dayRows ?? []) as ReadingPlanDay[]

  const progress = planProgress(days, today)
  const badge = progressBadge(progress)

  // 오늘 카드: 오늘이 읽는 날이면 그 날, 아니면 오늘 이후 첫 미완료 날(다음).
  const todayDay = progress.todayDayNo != null ? days.find((d) => d.day_no === progress.todayDayNo) ?? null : null
  const focusDay = todayDay ?? (progress.nextDayNo != null ? days.find((d) => d.day_no === progress.nextDayNo) ?? null : null)
  const heading = todayDay ? '오늘' : focusDay ? '다음' : ''
  const overdueDays = days.filter((d) => !d.done && d.read_date < today)

  const excluded = [1, 2, 3, 4, 5, 6, 0].filter((d) => plan.exclude_weekdays.includes(d)).map((d) => WEEKDAY_KR[d])
  const lastDate = days.length ? days[days.length - 1].read_date : plan.end_date

  return (
    <main className="theme-2027 mx-auto max-w-md px-5 pb-8 @xl:max-w-2xl">
      <PageHeader title="성경통독" action={manageAction} />

      {/* 진행 요약 — 통독 틴트 면(5 라벤더) */}
      <section className="rounded-2xl bg-b27-tint-5 px-4 py-4 text-b27-ink">
        <div className="flex items-center gap-1.5 font-num text-[12px] font-medium" style={{ color: 'var(--b27-deep-5)' }}>
          <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-5" aria-hidden="true" />
          {plan.title}
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="leading-none">
            <span className="font-num text-[34px] font-semibold tabular-nums">{progress.doneDays}</span>
            <span className="font-num text-[15px] text-b27-muted"> / {progress.totalDays}일</span>
          </div>
          <div className="text-right font-num text-[12px] leading-snug text-b27-muted">
            읽은 장 <b>{progress.doneChapters.toLocaleString()}</b> / {plan.total_chapters.toLocaleString()} · {progress.pct}%
            <br />
            완독 예정 {longDate(lastDate)}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-b27-paper">
          <div className="h-full rounded-full bg-b27-block-5" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${BADGE_CLS[badge.tone]}`}>{badge.label}</span>
          <span className="rounded-full bg-b27-paper px-2.5 py-0.5 text-[11.5px] text-b27-ink">
            {shortDate(plan.start_date)} 시작{excluded.length ? ` · ${excluded.join('·')} 제외` : ''}
          </span>
          <span className="rounded-full bg-b27-paper px-2.5 py-0.5 text-[11.5px] text-b27-ink">
            {scopeOrderLabel(planScope(plan), plan.read_order)} · {SPLIT_MODE_LABEL[plan.split_mode]}
          </span>
        </div>
      </section>

      {/* 오늘 / 다음 분량 */}
      {focusDay ? (
        <div className="mt-5">
          <DayCard key={focusDay.id} day={focusDay} heading={heading} />
        </div>
      ) : (
        progress.completed && (
          <div className="mt-5 rounded-2xl bg-b27-tint-4 p-5 text-center">
            <p className="text-base font-semibold text-b27-ink">완독을 축하합니다</p>
            <p className="mt-1 text-sm text-b27-muted">「계획 관리」에서 다음 계획을 세워 보세요.</p>
          </div>
        )
      )}

      {/* 밀린 분량 */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-num text-[13px] font-semibold text-b27-ink"><span className="inline-block h-2 w-2 rounded-[2px] bg-b27-wait" aria-hidden="true" />밀린 분량</h3>
          <span className="flex items-center gap-2 text-[12px] text-b27-muted">
            {overdueDays.length > 0 && <RebalanceButton plan={plan} days={days} today={today} />}
            {overdueDays.length === 0 ? '없음' : `${overdueDays.length}일`}
          </span>
        </div>
        <OverdueList days={overdueDays} today={today} />
      </div>

      {/* 전체 일정 */}
      <div className="mt-6">
        <ScheduleList days={days} today={today} />
      </div>
    </main>
  )
}
