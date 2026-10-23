// MFH-SUPPORTERS-LAYOUT-V3 — 2027(4-7): theme-2027 · 남색 글자 · 연회색/살구 면 · 강조 = 진한 살구 · 굵기 600 이하.
// MFH-SUPPORTERS-LAYOUT-V2 — md 이상 상단 세그먼트 네비(셸 e 단계). 본문 폭은 컨테이너 쿼리(@2xl).
// MFH-SUPPORTERS-LAYOUT-V1
// 후원자 브랜치 공통 셸 — 재정 관리자(부부) 가드 + 공통 헤더(뒤로 · 중앙 섹션타이틀 · 메인홈·회계 링크) + 하단 네비(4탭 + 중앙 홈).
// 하위 페이지(현황·명단·등록·분석·상세·수정)는 자체 헤더 없이 콘텐츠만 반환한다.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import SupportersBack from './SupportersBack'
import SupportersNav, { SupportersSegments } from './SupportersNav'
import SupportersTitle from './SupportersTitle'

export const dynamic = 'force-dynamic'

const linkBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-full text-b27-muted transition hover:bg-b27-card hover:text-b27-ink'

export default async function SupportersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!canManageFinance(user.id)) redirect('/')

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-2 @2xl:max-w-5xl @2xl:px-6">
      <header className="sticky top-0 z-30 -mx-4 mb-3 flex h-[52px] items-center bg-b27-paper px-3 @2xl:-mx-6 @2xl:px-6">
        <div className="relative flex w-full items-center">
          {/* 좌: 뒤로(경로 맥락) */}
          <div className="shrink-0">
            <SupportersBack />
          </div>

          {/* 중앙: 섹션 타이틀(경로별, 절대 중앙) */}
          <SupportersTitle />

          {/* 우: 메인홈 · 회계관리 링크 */}
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
            <Link href="/accounting" aria-label="회계관리" className={linkBtn}>
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
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="10" y2="10" />
                <line x1="14" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="10" y2="14" />
                <line x1="14" y1="14" x2="16" y2="14" />
                <line x1="8" y1="18" x2="10" y2="18" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* md 이상: 상단 세그먼트(하단 탭바 대체) */}
      <SupportersSegments />

      {children}

      <SupportersNav />
    </main>
  )
}
