// MFH-ACCOUNTING-LAYOUT-V2
// 회계 브랜치 공통 셸 — 마스터 가드 + 공통 헤더(뒤로 · 중앙 섹션타이틀 · 메인홈·후원자 링크) + 4탭 하단 네비.
// 하위 페이지(요약·기록·내역·분석)는 자체 헤더 없이 콘텐츠만 반환한다.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import BackButton from '@/components/BackButton'
import AccountingNav from './AccountingNav'
import AccountingTitle from './AccountingTitle'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

const linkBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-subtle hover:text-primary'

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
        <div className="relative flex items-center">
          {/* 좌: 뒤로 */}
          <div className="shrink-0">
            <BackButton href="/" label="뒤로" variant="icon-accent" />
          </div>

          {/* 중앙: 섹션 타이틀(경로별, 절대 중앙) */}
          <AccountingTitle />

          {/* 우: 메인홈 · 후원자관리 링크 */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <Link href="/" aria-label="메인홈" className={linkBtn}>
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 9 l9 -7 l9 7 v11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </Link>
            <Link href="/supporters" aria-label="후원자관리" className={linkBtn}>
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {children}

      <AccountingNav />
    </main>
  )
}
