import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ModuleIcon from '@/components/ModuleIcon'
import SplashGate from './SplashGate'
import SignOutButton from '@/components/SignOutButton'
import type { YearTheme } from '@/lib/types'

export const dynamic = 'force-dynamic'

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
  const { data: themeRow } = await supabase
    .from('year_themes')
    .select('*')
    .eq('year', year)
    .maybeSingle()
  const theme = themeRow as YearTheme | null
  const goals: string[] = theme && Array.isArray(theme.goals) ? (theme.goals as string[]) : []

  // 안 읽은 중보기도 수(멤버만 RLS 통과). 홈 카드 배지.
  const { count: unreadPrayers } = await supabase
    .from('intercessions')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  return (
    <SplashGate>
      <main className="mx-auto max-w-md px-5 py-8">
        <header className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-primary.svg"
            alt="MFH — Mission for Honduras"
            className="h-14 w-auto"
          />
          <p className="mt-2 text-xs text-faint">{user.email}</p>
        </header>

        <section className="mb-7 rounded-2xl bg-primary p-5 text-white">
          <div className="text-[11px] font-semibold tracking-widest text-white/70">{year} 주제</div>
          {theme?.theme ? (
            <>
              <div className="mt-1 text-xl font-bold">{theme.theme}</div>
              {goals.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {goals.map((g, i) => (
                    <li key={i} className="text-sm text-white/90">
                      &ndash; {g}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/theme" className="mt-3 inline-block text-xs text-white/70 underline">
                수정
              </Link>
            </>
          ) : (
            <Link href="/theme" className="mt-2 inline-block text-sm font-semibold text-white underline">
              올해의 주제·목표 설정하기
            </Link>
          )}
        </section>

        <section className="space-y-3">
          <Link
            href="/journal"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Log</div>
              <div className="mt-0.5 text-xs text-muted">Today&apos;s grace</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;이 날은 여호와의 정하신 것&rdquo;</span> 시 118:24
              </div>
            </div>
            <ModuleIcon name="log" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/projects"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Projects</div>
              <div className="mt-0.5 text-xs text-muted">The calling&apos;s path</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;여호와께서 집을 세우지 아니하시면&rdquo;</span> 시 127:1
              </div>
            </div>
            <ModuleIcon name="projects" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/tasks"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">To-Do</div>
              <div className="mt-0.5 text-xs text-muted">Entrusted work</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;작은 것에 충성된 자&rdquo;</span> 눅 16:10
              </div>
            </div>
            <ModuleIcon name="todo" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/calendar"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Calendar</div>
              <div className="mt-0.5 text-xs text-muted">Times &amp; seasons</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;내 시간이 주의 손에 있사오니&rdquo;</span> 시 31:15
              </div>
            </div>
            <ModuleIcon name="calendar" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/insights"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Insights</div>
              <div className="mt-0.5 text-xs text-muted">Light on the path</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;주의 말씀은 내 발의 등&rdquo;</span> 시 119:105
              </div>
            </div>
            <ModuleIcon name="insights" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/photos"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Photos</div>
              <div className="mt-0.5 text-xs text-muted">Moments of grace</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">월·사역별 사진 모아보기</span>
              </div>
            </div>
            <ModuleIcon name="photos" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/facebook"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Facebook</div>
              <div className="mt-0.5 text-xs text-muted">This week&apos;s story</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">이번 주 게시 추천 (AI)</span>
              </div>
            </div>
            <svg
              width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0 text-primary"
            >
              <path d="M3 11l18-5v12L3 14z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </Link>
          <Link
            href="/portfolio"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-primary">Portfolio</div>
              <div className="mt-0.5 text-xs text-muted">Sharing our journey</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;땅끝까지 이르러 내 증인이 되리라&rdquo;</span> 행 1:8
              </div>
            </div>
            <ModuleIcon name="portfolio" size={32} className="shrink-0 text-primary" />
          </Link>
          <Link
            href="/intercessions"
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-primary">중보기도</div>
                {!!unreadPrayers && unreadPrayers > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                    {unreadPrayers}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted">Prayers &amp; blessings</div>
              <div className="mt-1 text-[11px] leading-snug text-faint">
                <span className="truncate">&ldquo;서로를 위하여 기도하라&rdquo;</span> 약 5:16
              </div>
            </div>
            <svg
              width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0 text-primary"
            >
              <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3C18 5.5 19.5 9 21.5 12.5 19 16.65 12 21 12 21z" />
            </svg>
          </Link>
        </section>

        {/* 마일스톤 (자매앱 WorshipFlow·Brew Journal 형식).
            v2.0 = 현재 버전. 2026.5.29 13:49 = "the First Chapter" — 우진이 이 앱을
            가족에게 처음으로 공개 배포한 날·시각(최초 공개 배포 마일스톤). */}
        <footer className="mt-10 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-faint">v 2.0 · 2026. 6. 6</p>
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
