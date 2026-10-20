// MFH-ACCOUNTING-LAYOUT-V8 — 모바일: 헤더 집 아이콘 제거(하단 탭바 중앙으로) · 기록 ＋ = EntryFab(오른쪽 아래 플로팅)
// MFH-ACCOUNTING-LAYOUT-V7 — 모바일(<md) 헤더 압축(여백 축소) · 달력 헤더 L/$ 토글 · 후원자 아이콘은 md 이상만
// MFH-ACCOUNTING-LAYOUT-V6 — 헤더 중앙 슬롯(달력·통계 월 이동) · 왼쪽 ‹ 옆 섹션명(통계)
// MFH-ACCOUNTING-LAYOUT-V5 — 왼쪽 뒤로 = 회계 안에서 뒤로(AccountingBack). 메인홈은 오른쪽 홈 버튼
// MFH-ACCOUNTING-LAYOUT-V4 — 승인대기 건수 → 기록 탭 배지(AccountingNav·Segments)
// MFH-ACCOUNTING-LAYOUT-V3 — md 이상 상단 세그먼트 네비(셸 e 단계). 본문 폭은 컨테이너 쿼리(@2xl).
// MFH-ACCOUNTING-LAYOUT-V2
// 회계 브랜치 공통 셸 — 재정 관리자(부부) 가드 + 공통 헤더(뒤로 · 중앙 섹션타이틀 · 메인홈·후원자 링크) + 하단 네비(4탭 + 중앙 홈).
// 하위 페이지(요약·기록·내역·분석)는 자체 헤더 없이 콘텐츠만 반환한다.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import AccountingBack from './AccountingBack'
import AccountingNav, { AccountingSegments, EntryFab } from './AccountingNav'
import AccountingTitle, { AccountingSideTitle, HeaderCurToggle } from './AccountingTitle'
import { getInboxPendingCount } from '@/lib/card-inbox-db'
import { getRecurringDueCount } from '@/lib/recurring-db'
import '@/app/p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

const linkBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-subtle hover:text-primary'

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!canManageFinance(user.id)) redirect('/')
  const [cardPending, recPending] = await Promise.all([getInboxPendingCount(), getRecurringDueCount()])
  const pending = cardPending + recPending

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-4 pt-0 md:pt-2 @2xl:max-w-5xl @2xl:px-6">
      <header
        className="sticky top-0 z-30 -mx-4 mb-3 border-b border-line px-4 py-1.5 md:mb-4 md:py-3 @2xl:-mx-6 @2xl:px-6"
        style={{ background: 'var(--paper)' }}
      >
        <div className="relative flex items-center">
          {/* 좌: 뒤로 */}
          <div className="flex shrink-0 items-center">
            <AccountingBack />
            <AccountingSideTitle />
          </div>

          {/* 중앙: 섹션 타이틀(경로별, 절대 중앙) */}
          <AccountingTitle />

          {/* 우: 메인홈 · 후원자관리 링크 */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <HeaderCurToggle />
            <Link href="/" aria-label="메인홈" className={`${linkBtn} max-md:hidden`}>
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
            <Link href="/supporters" aria-label="후원자관리" className={`${linkBtn} max-md:hidden`}>
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

      {/* md 이상: 상단 세그먼트(하단 탭바 대체) */}
      <AccountingSegments pending={pending} />

      {children}

      <EntryFab pending={pending} />
      <AccountingNav />
    </main>
  )
}
