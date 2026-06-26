// MFH-ACCOUNTING-LAYOUT-V1
// 회계 브랜치 공통 셸 — 마스터 가드 + 공통 헤더(← 홈) + 4탭 하단 네비(AccountingNav).
// 하위 페이지(요약·기록·내역·분석)는 자체 헤더 없이 콘텐츠만 반환한다.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import BackButton from '@/components/BackButton'
import AccountingNav from './AccountingNav'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMaster(user.id)) redirect('/')

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-4 pt-2 md:max-w-5xl md:px-6">
      <header
        className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line px-4 py-3 md:-mx-6 md:px-6"
        style={{ background: 'var(--paper)' }}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <BackButton href="/" label="홈" variant="icon-accent" />
          </div>
          <h1 className="flex-1 text-center text-[18px] font-bold tracking-tight text-ink md:text-left">
            회계관리
          </h1>
          <span className="w-10 shrink-0 md:hidden" aria-hidden="true" />
        </div>
      </header>

      {children}

      <AccountingNav />
    </main>
  )
}
