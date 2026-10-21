// MFH-HOME-V2 — 2027 Minimal Block(3단계): theme-2027 스코프 · 승인대기 상태 알약 · 연 주제 요약 면 + 블록색 옆줄 목표 · QT/동향 요약 면
//   · 모듈 = 블록 격자(3열·직각·틈 3px, 파스텔 + 흰 글자 할로, 숫자 또는 아이콘 · 한글 이름 · 신호 한 줄) · 푸터 Manrope 회색.
import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import ModuleIcon from '@/components/ModuleIcon'
import SplashGate from '@/components/SplashGate'
import SignOutButton from '@/components/SignOutButton'
import type { ReadingPlan, YearTheme } from '@/lib/types'
import type { Highlight } from './honduras/BriefingView'
import BibleHomeCard, { type HomeDay } from './bible/BibleHomeCard'
import { projectSignals, taskSignals, type Signal } from '@/lib/signals'
import { blockColor, blockHalo } from '@/lib/palette'
import pkg from '@/package.json'
import { getInboxPendingCount } from '@/lib/card-inbox-db'
import { getRecurringDueCount } from '@/lib/recurring-db'

export const dynamic = 'force-dynamic'

// Facebook 은 ModuleIcon 에 없어 인라인 유지(페이퍼 비행기).
const FacebookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l18-5v12L3 14z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
)

const HeartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

// 후원자 — ModuleIcon 에 없어 인라인(Lucide users).
const SupportersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

// 회계 — ModuleIcon 에 없어 인라인(Lucide calculator).
const AccountingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10" />
    <line x1="12" y1="10" x2="12" y2="10" />
    <line x1="16" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="8" y2="14" />
    <line x1="12" y1="14" x2="12" y2="14" />
    <line x1="16" y1="14" x2="16" y2="18" />
    <line x1="8" y1="18" x2="12" y2="18" />
  </svg>
)

// 신호 한 줄 — 시급순(signals.ts 보장) 앞 2개만. 블록 위 흰 글자.
function signalLine(signals: Signal[]): string | null {
  if (signals.length === 0) return null
  return signals
    .slice(0, 2)
    .map((s) => `${s.label} ${s.count}`)
    .join(' · ')
}

// 모듈 블록 — 파스텔 면(blockColor n) + 흰 글자 할로(blockHalo n). 위 = 큰 숫자(value) 또는 흰 아이콘 / 아래 = 한글 이름 + 보조 한 줄(note).
// 아이콘은 같은 할로 색 drop-shadow 로 가장자리 대비 확보(원칙 6).
function ModuleBlock({
  href,
  n,
  label,
  value,
  icon,
  note,
  className = '',
}: {
  href: string
  n: number
  label: string
  value?: number | null
  icon: ReactNode
  note?: string | null
  className?: string
}) {
  const { bg, halo } = blockColor(n)
  return (
    <Link
      href={href}
      className={`flex h-24 min-w-0 flex-col justify-between p-3 text-white transition active:opacity-80 ${className}`}
      style={{ background: bg, textShadow: blockHalo(n) }}
    >
      {value != null ? (
        <span className="font-num text-[26px] font-semibold leading-none tabular-nums">{value}</span>
      ) : (
        <span style={{ filter: `drop-shadow(0 0 2px ${halo}) drop-shadow(0 0 5px ${halo})` }}>{icon}</span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-tight">{label}</span>
        {note && <span className="mt-0.5 block truncate font-num text-[11px] leading-tight opacity-95">{note}</span>}
      </span>
    </Link>
  )
}

export default async function Home() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!hasEnv) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl font-extrabold text-primary">MFH</h1>
        <p className="mt-4 text-sm text-muted">
          Supabase 환경변수가 설정되지 않았습니다. Vercel 환경변수를 등록한 뒤 다시 배포해 주세요.
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 회계 승인대기(카드 문자 + 반복 기록) — 재정 관리자만. 홈 상단 입구 배너 + Accounting 타일 배지.
  const [cardPending, recPending] = canManageFinance(user.id)
    ? await Promise.all([getInboxPendingCount(), getRecurringDueCount()])
    : [0, 0]
  const approvalPending = cardPending + recPending

  const year = new Date().getFullYear()
  // 신호 계산 기준일 — 온두라스 현지(다른 페이지와 동일 기준).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  // 이번 달(온두라스 현지) — 일지 블록 숫자. lib/aside.ts 와 같은 범위 계산.
  const [ty, tm] = today.split('-').map(Number)
  const monthStart = `${today.slice(0, 7)}-01`
  const nextMonth = `${tm === 12 ? ty + 1 : ty}-${String(tm === 12 ? 1 : tm + 1).padStart(2, '0')}-01`

  const [themeQ, prayerQ, newsQ, qtQ, projQ, taskQ, insightQ, bibleQ, journalQ] = await Promise.all([
    supabase.from('year_themes').select('*').eq('year', year).maybeSingle(),
    supabase.from('intercessions').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabase
      .from('honduras_news')
      .select('news_date,highlights,created_at')
      .order('news_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_qt')
      .select('qt_date,passage,key_verse,created_at')
      .order('qt_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('projects').select('status, due_date, importance, updated_at'),
    supabase.from('tasks').select('done, due_date, importance'),
    supabase
      .from('insights')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // 성경통독 — 본인 활성 계획 1개(RLS 본인 전용)
    supabase.from('reading_plans').select('*').eq('is_active', true).maybeSingle(),
    supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .gte('entry_date', monthStart)
      .lt('entry_date', nextMonth),
  ])

  // 통독 일정(활성 계획의 전체 일차 — 진행률·오늘 분량·밀림 계산용, 가벼운 컬럼만)
  const biblePlan = (bibleQ.data ?? null) as ReadingPlan | null
  const bibleDays: HomeDay[] = biblePlan
    ? (((
        await supabase
          .from('reading_plan_days')
          .select('id, day_no, read_date, done, chapters, chars, range_label, read_method, read_on, read_time, read_minutes')
          .eq('plan_id', biblePlan.id)
          .order('day_no', { ascending: true })
      ).data ?? []) as HomeDay[])
    : []

  const theme = themeQ.data as YearTheme | null
  const goals: string[] = theme && Array.isArray(theme.goals) ? (theme.goals as string[]) : []
  const unreadPrayers = prayerQ.count ?? 0

  const newsRow = newsQ.data as { highlights?: Highlight[] | null; created_at?: string } | null
  const topHl = ((newsRow?.highlights as Highlight[] | null) ?? [])[0] ?? null
  const newsTitle = (topHl?.title ?? '').trim() || '주요 뉴스 브리핑'
  const newsBody =
    (topHl?.body ?? '').trim() || '매일 아침 정치·경제·사회·문화 동향을 정리합니다.'
  const newsAt = newsRow?.created_at ?? null
  const newsTime = newsAt
    ? new Date(newsAt).toLocaleString('ko-KR', {
        timeZone: 'America/Tegucigalpa',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  const qtRow = qtQ.data as {
    passage?: { book?: string | null; range?: string | null; title?: string | null } | null
    key_verse?: { summary?: string | null } | null
    created_at?: string
  } | null
  const qtBook = (qtRow?.passage?.book ?? '').trim()
  const qtRange = (qtRow?.passage?.range ?? '').trim()
  const qtRef = qtBook && qtRange ? `${qtBook} ${qtRange}` : ''
  const qtSjTitle = (qtRow?.passage?.title ?? '').trim()
  const qtMain = qtSjTitle || qtRef || '오늘의 말씀 묵상'
  const qtRefRight = qtSjTitle ? qtRef : ''
  const qtAt = qtRow?.created_at ?? null
  const qtTime = qtAt
    ? new Date(qtAt).toLocaleString('ko-KR', {
        timeZone: 'America/Tegucigalpa',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  const projRows = (projQ.data ?? []) as { status: string; due_date: string | null; importance: number; updated_at: string }[]
  const taskRows = (taskQ.data ?? []) as { done: boolean; due_date: string | null; importance: number }[]
  const projSignals = projectSignals(projRows, today)
  const tSignals = taskSignals(taskRows, today)
  // 블록 숫자 — 진행 중 프로젝트 · 미완료 할 일 중 오늘 + 지남 · 이번 달 일지
  const projActive = projRows.filter((p) => p.status === 'in_progress').length
  const taskDue = taskRows.filter((t) => !t.done && t.due_date != null && t.due_date <= today).length
  const journalCount = journalQ.count ?? 0

  const insightAt = (insightQ.data as { created_at?: string } | null)?.created_at ?? null
  const insightTime = insightAt
    ? new Date(insightAt).toLocaleString('ko-KR', {
        timeZone: 'America/Tegucigalpa',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  const finance = canManageFinance(user.id)
  const goalColors = [1, 5, 3]

  return (
    <SplashGate>
      <main className="theme-2027 mx-auto max-w-md px-4 pb-10 pt-2 @xl:max-w-3xl @4xl:max-w-6xl @4xl:px-6">
        <header className="mb-4 flex items-center justify-between px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-primary.svg" alt="MFH — Mission for Honduras" className="h-9 w-auto" />
          <p className="text-[11px] text-b27-muted">{user.email}</p>
        </header>

        {/* 회계 승인대기 — 상태 알약(연회색 면 · 호박 글자 · →). 대기 있을 때만(재정 관리자). 레이아웃 그리드 밖(전폭). */}
        {approvalPending > 0 && (
          <Link
            href="/accounting/inbox"
            className="mb-3 flex items-center justify-between gap-3 rounded-full bg-b27-card px-4 py-2.5 text-[13px] transition active:opacity-80"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium text-b27-wait">
                회계 승인대기 <span className="font-num tabular-nums">{approvalPending}</span>
              </span>
              <span className="ml-1.5 text-b27-muted">
                {[cardPending > 0 ? `카드 ${cardPending}` : '', recPending > 0 ? `반복 ${recPending}` : ''].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-b27-muted" aria-hidden="true">→</span>
          </Link>
        )}

        {/* 와이드 레이아웃(셸 본문 열 기준 컨테이너 쿼리): 모바일=세로 스택, @xl=좌측 그룹 2열, @4xl=좌 5(오늘·sticky) : 우 7(모듈 블록 6열). */}
        <div className="flex flex-col gap-3 @4xl:grid @4xl:grid-cols-12 @4xl:gap-5">
          {/* 좌: 오늘의 정보 — 주제·QT·통독·동향. 뷰포트 lg 이상(보조 패널 표시)은 QT·동향이 패널로 가고 주제·통독만 남는다. */}
          <div className="flex flex-col gap-3 @xl:grid @xl:grid-cols-2 @4xl:sticky @4xl:top-4 @4xl:col-span-5 @4xl:flex @4xl:flex-col @4xl:self-start">
            {/* 연 주제 — 요약 면(큰 남색 면 금지). 목표 = 블록색 옆줄. */}
            <section className="flex flex-col rounded-2xl bg-b27-card p-5 @xl:order-1 @xl:col-span-2 @4xl:order-none">
              <div className="font-num text-[12px] font-medium tracking-[0.08em] text-b27-muted">{year} THEME</div>
              {theme?.theme ? (
                <h1 className="mt-1.5 text-[20px] font-semibold leading-snug text-b27-ink">{theme.theme}</h1>
              ) : (
                <Link href="/theme" className="mt-1.5 inline-block text-[15px] font-medium text-b27-ink underline">
                  올해의 주제·목표 설정하기
                </Link>
              )}
              {goals.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {goals.map((g, i) => (
                    <li
                      key={i}
                      className="border-l-[3px] pl-2.5 text-[13px] leading-snug text-b27-ink"
                      style={{ borderColor: blockColor(goalColors[i % goalColors.length]).bg }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              )}
              {theme?.theme && (
                <Link href="/theme" className="mt-3 self-start text-[12px] text-b27-muted">
                  수정
                </Link>
              )}
            </section>

            {/* 오늘의 QT — 요약 면. lg 이상은 우측 보조 패널(AsidePanel)이 담당 → 숨김 */}
            <Link
              href="/qt"
              className="flex flex-col rounded-2xl bg-b27-card p-4 transition active:opacity-80 @xl:order-3 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="font-num text-[12px] font-medium text-b27-muted">오늘의 QT</span>
                {qtTime ? (
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-num text-[11px] tabular-nums text-b27-muted">{qtTime}</span>
                ) : (
                  <span className="text-b27-muted" aria-hidden="true">→</span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-b27-ink">{qtMain}</div>
                {qtRefRight && <div className="shrink-0 text-[12px] text-b27-muted">{qtRefRight}</div>}
              </div>
            </Link>

            {/* 성경통독 — 오늘 분량·진행률·바로 체크. @xl 2열에서는 주제 바로 아래 wide. */}
            <div className="@xl:order-2 @xl:col-span-2 @4xl:order-none @4xl:col-auto">
              <BibleHomeCard plan={biblePlan} days={bibleDays} today={today} />
            </div>

            {/* 온두라스 동향 — 요약 면. lg 이상은 우측 보조 패널이 담당 → 숨김 */}
            <Link
              href="/honduras"
              className="flex flex-col rounded-2xl bg-b27-card p-4 transition active:opacity-80 @xl:order-4 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="font-num text-[12px] font-medium text-b27-muted">온두라스 동향</span>
                {newsTime ? (
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-num text-[11px] tabular-nums text-b27-muted">{newsTime}</span>
                ) : (
                  <span className="text-b27-muted" aria-hidden="true">→</span>
                )}
              </div>
              <div className="mt-1.5 text-[15px] font-semibold leading-tight text-b27-ink">{newsTitle}</div>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-b27-muted">{newsBody}</p>
            </Link>
          </div>

          {/* 우: 모듈 블록 격자 — 모바일 3열×4줄 · @xl 4열 · @4xl 6열×2줄. 직각 블록 · 틈 3px(흰) · 묶음 바깥만 둥글게.
              색 = 모듈 고정색(일지1 프로젝트5 할일3 인사이트8 달력4 중보6 성경7 회계2 / 보조: 사진1 Facebook8 포트폴리오5 후원자3) — 이웃 칸 같은 색 없음.
              재정 권한 없으면 10칸 → 포트폴리오가 마지막 줄을 채운다(3칸). */}
          <nav
            aria-label="모듈"
            className="grid grid-cols-3 gap-[3px] self-start overflow-hidden rounded-2xl bg-b27-paper @xl:grid-cols-4 @4xl:col-span-7 @4xl:grid-cols-6"
          >
            <ModuleBlock href="/journal" n={1} label="일지" value={journalCount} icon={<ModuleIcon name="log" size={22} />} note={`${tm}월`} />
            <ModuleBlock href="/projects" n={5} label="프로젝트" value={projActive} icon={<ModuleIcon name="projects" size={22} />} note={signalLine(projSignals) ?? '진행 중'} />
            <ModuleBlock href="/tasks" n={3} label="할 일" value={taskDue} icon={<ModuleIcon name="todo" size={22} />} note={signalLine(tSignals) ?? '오늘까지'} />
            <ModuleBlock href="/insights" n={8} label="인사이트" icon={<ModuleIcon name="insights" size={22} />} note={insightTime} />
            <ModuleBlock href="/calendar" n={4} label="캘린더" icon={<ModuleIcon name="calendar" size={22} />} />
            <ModuleBlock
              href="/intercessions"
              n={6}
              label="중보기도"
              value={unreadPrayers > 0 ? unreadPrayers : null}
              icon={<HeartIcon />}
              note={unreadPrayers > 0 ? '새 기도' : null}
            />
            <ModuleBlock href="/bible/study" n={7} label="성경" icon={<ModuleIcon name="bible" size={22} />} />
            <ModuleBlock href="/photos" n={1} label="사진" icon={<ModuleIcon name="photos" size={22} />} />
            <ModuleBlock href="/facebook" n={8} label="Facebook" icon={<FacebookIcon />} />
            <ModuleBlock
              href="/portfolio"
              n={5}
              label="포트폴리오"
              icon={<ModuleIcon name="portfolio" size={22} />}
              className={finance ? '' : 'col-span-3'}
            />
            {/* 후원자·회계 — 공개 전까지 우진(마스터)만 */}
            {finance && <ModuleBlock href="/supporters" n={3} label="후원자" icon={<SupportersIcon />} />}
            {finance && (
              <ModuleBlock
                href="/accounting"
                n={2}
                label="회계"
                value={approvalPending > 0 ? approvalPending : null}
                icon={<AccountingIcon />}
                note={approvalPending > 0 ? '승인대기' : null}
              />
            )}
          </nav>
        </div>

        {/* 마일스톤 (자매앱 WorshipFlow·Brew Journal 형식).
            버전 = package.json 의 version 을 그대로 자동 표기(SoT). 2026.5.29 13:49 = "the First Chapter" — 최초 공개 배포 마일스톤. */}
        <footer className="mt-8 text-center">
          <p className="font-num text-[11px] tabular-nums tracking-[0.08em] text-b27-muted">v {pkg.version} · 2026</p>
          <p className="mt-1 text-[11px] text-b27-muted">the First Chapter · 2026. 5. 29. 13:49</p>
          <div className="mt-5">
            <SignOutButton />
          </div>
        </footer>
      </main>
    </SplashGate>
  )
}
