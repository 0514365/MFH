import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SplashGate from './SplashGate'
import type { YearTheme } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!hasEnv) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl font-extrabold text-brand-primary">MFH</h1>
        <p className="mt-4 text-sm text-ink/70">
          Supabase 환경변수가 설정되지 않았습니다. Vercel 환경변수를 등록한 뒤 다시 배포해 주세요.
        </p>
      </main>
    )
  }

  const supabase = createClient()
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

  return (
    <SplashGate>
      <main className="mx-auto max-w-md px-5 py-8">
        <header className="mb-6">
          <p className="font-display text-[11px] font-semibold tracking-[0.25em] text-brand-accent">
            MISSION FOR HONDURAS
          </p>
          <h1 className="font-display text-4xl font-extrabold text-brand-primary">MFH</h1>
          <p className="mt-1 text-xs text-ink/50">{user.email}</p>
        </header>

        <section className="mb-7 rounded-2xl bg-brand-primary p-5 text-white">
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

        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/journal"
            className="rounded-2xl border border-line bg-white p-5 transition hover:border-brand-primary"
          >
            <div className="text-lg font-bold text-brand-primary">일지</div>
            <div className="mt-1 text-xs text-ink/60">일일 활동 기록</div>
          </Link>
          {[
            { label: '프로젝트', desc: '장·단기 관리' },
            { label: '할 일', desc: '실무 Task' },
            { label: '인사이트', desc: '분야별·종합 분석' },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-line bg-white/60 p-5">
              <div className="text-lg font-bold text-ink/40">{m.label}</div>
              <div className="mt-1 text-xs text-ink/40">준비 중</div>
            </div>
          ))}
        </section>

        <form action="/auth/signout" method="post" className="mt-10">
          <button className="text-xs text-muted underline">로그아웃</button>
        </form>
      </main>
    </SplashGate>
  )
}
