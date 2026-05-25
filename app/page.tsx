import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

const MODULES = [
  { label: '일지', desc: '일일 활동 기록' },
  { label: '프로젝트', desc: '장·단기 관리' },
  { label: '할 일', desc: '실무 Task' },
  { label: '인사이트', desc: '분야별·종합 분석' },
]

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

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <header className="mb-8">
        <p className="font-display text-xs font-semibold tracking-[0.25em] text-brand-accent">
          MISSION FOR HONDURAS
        </p>
        <h1 className="font-display text-4xl font-extrabold text-brand-primary">MFH</h1>
        <p className="mt-1 text-sm text-ink/60">{user.email}</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {MODULES.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-line bg-white p-5"
          >
            <div className="text-lg font-bold text-brand-primary">{m.label}</div>
            <div className="mt-1 text-xs text-ink/60">{m.desc}</div>
          </div>
        ))}
      </section>

      <form action="/auth/signout" method="post" className="mt-10">
        <button className="text-xs text-muted underline">로그아웃</button>
      </form>
    </main>
  )
}
