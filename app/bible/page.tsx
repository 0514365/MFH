// MFH-BIBLE-PAGE-V1
// /bible — 성경통독 메인. 활성 계획의 진행 요약 + 오늘(또는 다음) 분량 카드 + 밀린 분량 + 월별 일정.
// 계획이 없으면 안내 카드(/bible/new). 데이터 = reading_plans(활성 1개) + reading_plan_days(전체).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import { longDate, planProgress, progressBadge, READ_ORDER_LABEL, shortDate, SPLIT_MODE_LABEL, WEEKDAY_KR } from '@/lib/bible/plan'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'
import DayCard from './DayCard'
import DayCheck from './DayCheck'
import ScheduleList from './ScheduleList'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

const BADGE_CLS = {
  done: 'bg-status-done text-on-status-done',
  ok: 'bg-white/20 text-white',
  warn: 'bg-[#FFF1E6] text-[#B45309]',
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
    <Link href="/bible/plans" className="rounded-xl border border-line px-3 py-2 text-[12px] font-medium text-muted transition hover:border-primary">
      계획 관리
    </Link>
  )

  if (!plan) {
    return (
      <main className="app-theme mx-auto max-w-md px-5 pb-8">
        <PageHeader title="성경통독" action={manageAction} />
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">활성 통독 계획이 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            1년 1독을 기본으로 기간·제외 요일·읽기 순서·배분 방식을 정하면
            <br />
            하루 분량이 자동으로 계산됩니다.
          </p>
          <Link href="/bible/new" className="mt-5 inline-block rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">
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
    <main className="app-theme mx-auto max-w-md px-5 pb-8 min-[740px]:max-w-2xl">
      <PageHeader title="성경통독" action={manageAction} />

      {/* 진행 요약 — 홈 주제 hero 와 같은 마룬 그라데이션 */}
      <section className="rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(150deg, #B61821 0%, #661F20 100%)' }}>
        <div className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">{plan.title}</div>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="leading-none">
            <span className="font-display text-[30px] font-extrabold">{progress.doneDays}</span>
            <span className="text-[14px] text-white/70"> / {progress.totalDays}일</span>
          </div>
          <div className="text-right text-[12px] leading-snug text-white/85">
            읽은 장 <b>{progress.doneChapters.toLocaleString()}</b> / {plan.total_chapters.toLocaleString()} · {progress.pct}%
            <br />
            완독 예정 {longDate(lastDate)}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_CLS[badge.tone]}`}>{badge.label}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
            {shortDate(plan.start_date)} 시작{excluded.length ? ` · ${excluded.join('·')} 제외` : ''}
          </span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
            {READ_ORDER_LABEL[plan.read_order]} · {SPLIT_MODE_LABEL[plan.split_mode]}
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
          <div className="mt-5 rounded-3xl border border-line bg-surface p-5 text-center">
            <p className="text-base font-semibold text-primary">완독을 축하합니다</p>
            <p className="mt-1 text-sm text-muted">「계획 관리」에서 다음 계획을 세워 보세요.</p>
          </div>
        )
      )}

      {/* 밀린 분량 */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-primary">밀린 분량</h3>
          <span className="text-[12px] text-faint">{overdueDays.length === 0 ? '없음' : `${overdueDays.length}일`}</span>
        </div>
        {overdueDays.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {overdueDays.map((d) => (
              <li key={d.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13px]">
                <DayCheck id={d.id} done={d.done} chars={d.chars} />
                <span className="w-[54px] shrink-0 text-[12px] text-muted">{shortDate(d.read_date)}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{d.range_label}</span>
                <span className="shrink-0 text-[11px] text-faint">{d.chapters}장</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 전체 일정 */}
      <div className="mt-6">
        <ScheduleList days={days} today={today} />
      </div>
    </main>
  )
}
