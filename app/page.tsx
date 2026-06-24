import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ModuleIcon from '@/components/ModuleIcon'
import SplashGate from './SplashGate'
import SignOutButton from '@/components/SignOutButton'
import type { YearTheme } from '@/lib/types'
import type { Highlight } from './honduras/BriefingView'
import { projectSignals, taskSignals, type Signal, type SignalKind } from '@/lib/signals'
import pkg from '../package.json'
import './p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

// Facebook 은 ModuleIcon 에 없어 인라인 유지(페이퍼 비행기).
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l18-5v12L3 14z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
)

const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

// 홈 타일용 신호 칩(SignalChips 와 동색, 더 작게). 시급순 정렬은 signals.ts 가 보장 → 앞 2개만.
const SIG_CLS: Record<SignalKind, string> = {
  overdue: 'bg-red-50 text-red-700',
  soon: 'bg-orange-50 text-orange-700',
  stalled: 'bg-slate-100 text-slate-600',
  important: 'bg-yellow-50 text-yellow-700',
}
function SignalBadges({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) return null
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {signals.slice(0, 2).map((s) => (
        <span key={s.kind} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SIG_CLS[s.kind]}`}>
          {s.label} {s.count}
        </span>
      ))}
    </div>
  )
}

// 벤토 모듈 타일 — 모듈별 색 칩 아이콘 + 영문 타이틀/서브타이틀. chipClass=칩 색(모듈별), topRight=배지/시각.
function ModuleTile({
  href,
  icon,
  title,
  sub,
  topRight,
  chipClass,
  className = '',
}: {
  href: string
  icon: ReactNode
  title: string
  sub: string
  topRight?: ReactNode
  chipClass: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface p-4 transition hover:border-primary active:scale-[0.99] ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chipClass}`}>{icon}</div>
        {topRight}
      </div>
      <div className="mt-3">
        <div className="font-display text-[15px] font-bold leading-tight text-primary">{title}</div>
        <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
      </div>
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

  const year = new Date().getFullYear()
  // 신호 계산 기준일 — 온두라스 현지(다른 페이지와 동일 기준).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  const [themeQ, prayerQ, newsQ, qtQ, projQ, taskQ, insightQ] = await Promise.all([
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
  ])

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

  const projSignals = projectSignals(
    (projQ.data ?? []) as { status: string; due_date: string | null; importance: number; updated_at: string }[],
    today,
  )
  const tSignals = taskSignals(
    (taskQ.data ?? []) as { done: boolean; due_date: string | null; importance: number }[],
    today,
  )

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

  return (
    <SplashGate>
      <main className="app-theme mx-auto max-w-md px-4 pb-10 pt-2">
        <header className="mb-4 flex items-center justify-between px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-primary.svg" alt="MFH — Mission for Honduras" className="h-9 w-auto" />
          <p className="text-[11px] text-faint">{user.email}</p>
        </header>

        <div className="grid grid-cols-2 gap-3 [grid-auto-rows:minmax(104px,auto)]">
          {/* 2026 주제 — hero. 딥 그라데이션(마룬레드→딥마룬)으로 단색 면 부담 분산 — brand 마룬 정체성 유지 */}
          <section
            className="col-span-2 flex flex-col justify-between overflow-hidden rounded-3xl p-6 text-white"
            style={{ background: 'linear-gradient(150deg, #B61821 0%, #661F20 100%)' }}
          >
            <div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                {year} 주제
              </div>
              {theme?.theme ? (
                <h1 className="mt-2 text-[22px] font-bold leading-snug">{theme.theme}</h1>
              ) : (
                <Link href="/theme" className="mt-2 inline-block text-base font-semibold underline">
                  올해의 주제·목표 설정하기
                </Link>
              )}
            </div>
            {goals.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {goals.map((g, i) => (
                  <li key={i} className="text-sm text-white/90">&ndash; {g}</li>
                ))}
              </ul>
            )}
            {theme?.theme && (
              <Link href="/theme" className="mt-3 inline-block text-xs text-white/60 underline">
                수정
              </Link>
            )}
          </section>

          {/* 오늘의 QT — wide + 본문·핵심절 미리보기 (아침 묵상 → 주제 아래 최상단) */}
          <Link
            href="/qt"
            className="col-span-2 flex flex-col overflow-hidden rounded-3xl bg-primary-soft p-5 transition active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
                오늘의 QT · Daily Bread
              </div>
              {qtTime ? (
                <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {qtTime}
                </span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary opacity-60">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1 truncate text-[19px] font-bold leading-tight text-ink">{qtMain}</div>
              {qtRefRight && <div className="shrink-0 text-[13px] font-medium text-muted">{qtRefRight}</div>}
            </div>
          </Link>

          {/* 온두라스 동향 — wide + 최신 브리핑 미리보기 */}
          <Link
            href="/honduras"
            className="col-span-2 flex flex-col overflow-hidden rounded-3xl bg-primary-soft p-5 transition active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
                온두라스 동향 · Today in Honduras
              </div>
              {newsTime ? (
                <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {newsTime}
                </span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary opacity-60">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              )}
            </div>
            <div className="mt-2 text-[15px] font-bold leading-tight text-ink">{newsTitle}</div>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{newsBody}</p>
          </Link>

          {/* Log — tall (좌) */}
          <ModuleTile
            href="/journal"
            icon={<ModuleIcon name="log" size={20} />}
            title="Log"
            sub="Today's grace"
            chipClass="bg-emerald-100 text-emerald-700"
            className="row-span-2"
          />

          {/* Insights — 우(상). 최종 업데이트 시각 */}
          <ModuleTile
            href="/insights"
            icon={<ModuleIcon name="insights" size={18} />}
            title="Insights"
            sub="Light on the path"
            chipClass="bg-amber-100 text-amber-700"
            topRight={
              insightTime ? (
                <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
                  {insightTime}
                </span>
              ) : null
            }
          />

          {/* Calendar — 우(하) */}
          <ModuleTile
            href="/calendar"
            icon={<ModuleIcon name="calendar" size={18} />}
            title="Calendar"
            sub="Times & seasons"
            chipClass="bg-sky-100 text-sky-700"
          />

          {/* Projects — 좌. 임박·정체 등 신호 배지 */}
          <ModuleTile
            href="/projects"
            icon={<ModuleIcon name="projects" size={18} />}
            title="Projects"
            sub="The calling's path"
            chipClass="bg-violet-100 text-violet-700"
            topRight={<SignalBadges signals={projSignals} />}
          />

          {/* To-Do — 우. 지남·임박 등 신호 배지 */}
          <ModuleTile
            href="/tasks"
            icon={<ModuleIcon name="todo" size={18} />}
            title="To-Do"
            sub="Entrusted work"
            chipClass="bg-teal-100 text-teal-700"
            topRight={<SignalBadges signals={tSignals} />}
          />

          {/* 중보기도 — 좌. 레드틴트 + 안 읽은 수 */}
          <ModuleTile
            href="/intercessions"
            icon={<HeartIcon />}
            title="중보기도"
            sub="Prayers & blessings"
            chipClass="bg-rose-100 text-rose-700"
            topRight={
              unreadPrayers > 0 ? (
                <span className="rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
                  {unreadPrayers} NEW
                </span>
              ) : null
            }
          />

          {/* Photos — 우 */}
          <ModuleTile
            href="/photos"
            icon={<ModuleIcon name="photos" size={18} />}
            title="Photos"
            sub="Moments of grace"
            chipClass="bg-fuchsia-100 text-fuchsia-700"
          />

          {/* Facebook — 좌 */}
          <ModuleTile
            href="/facebook"
            icon={<FacebookIcon />}
            title="Facebook"
            sub="This week's story"
            chipClass="bg-blue-100 text-blue-700"
          />

          {/* Portfolio — 우 */}
          <ModuleTile
            href="/portfolio"
            icon={<ModuleIcon name="portfolio" size={18} />}
            title="Portfolio"
            sub="Sharing our journey"
            chipClass="bg-indigo-100 text-indigo-700"
          />
        </div>

        {/* 마일스톤 (자매앱 WorshipFlow·Brew Journal 형식).
            버전 = package.json 의 version 을 그대로 자동 표기(SoT). 2026.5.29 13:49 = "the First Chapter" — 최초 공개 배포 마일스톤. */}
        <footer className="mt-8 text-center">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-faint">
            v {pkg.version} · 2026
          </p>
          <p className="mt-1 text-[11px] italic tracking-wide text-faint">
            the First Chapter · 2026. 5. 29. 13:49
          </p>
          <div className="mt-5">
            <SignOutButton />
          </div>
        </footer>
      </main>
    </SplashGate>
  )
}
