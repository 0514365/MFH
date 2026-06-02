// MFH-OWNER-BAR-V1
// 공개 포트폴리오(/p/*) 최상단 관리자 전용 바.
// 로그인한 멤버에게만 표시(userId 없으면 null → 일반 방문자에겐 안 보임 = 공개 페이지는 깔끔하게 유지).
// "← MFH 홈"은 모든 멤버(우진·진아), "포트폴리오 편집"은 소유자(PORTFOLIO_OWNER_ID=김우진)만 노출.
// 진아 등 다른 멤버는 홈 링크만 — 편집 페이지(/portfolio)는 라우트 가드로도 차단됨.
import Link from 'next/link'
import { PORTFOLIO_OWNER_ID } from '@/lib/members'

export default function OwnerBar({ userId }: { userId: string | null }) {
  // 일반 방문자(비로그인): 아무것도 표시하지 않음.
  if (!userId) return null

  const isOwner = userId === PORTFOLIO_OWNER_ID

  return (
    <div className="sticky top-0 z-50 border-b border-white/15 bg-primary text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 min-[740px]:px-6 min-[1100px]:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold transition hover:bg-white/10"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            MFH 홈
          </Link>
          <span className="hidden truncate text-[11px] font-medium tracking-wide text-white/60 min-[480px]:inline">
            관리자 미리보기
          </span>
        </div>

        {isOwner && (
          <Link
            href="/portfolio"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-white/30 px-2.5 py-1 text-sm font-semibold transition hover:bg-white/10"
          >
            포트폴리오 편집
          </Link>
        )}
      </div>
    </div>
  )
}
