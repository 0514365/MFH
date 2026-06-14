// MFH-PAGE-HEADER-V3
// 공통 페이지 헤더(서버 컴포넌트). 모든 모듈 페이지 상단에 사용.
// 좌: 로고마크(→홈) + 제목 / 우: Calendar 아이콘 + 페이지별 action + (옵션)로그아웃.
// (Insights·Photos 바로가기는 하단 탭바·홈 타일로 이동 → 헤더에서 제거.)
// - 각 바로가기는 현재 페이지면 숨김(중복 회피).
// - 로그아웃 = 홈에서만(showLogout). 서브페이지는 로고→홈 경유.
import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  title: string
  current?: 'journal' | 'projects' | 'tasks' | 'calendar' | 'insights' | 'photos' | 'home'
  action?: ReactNode
  showLogout?: boolean
}

export default function PageHeader({ title, current, action, showLogout = false }: Props) {
  const isCalendar = current === 'calendar'

  return (
    <div
      className="sticky top-0 z-30 -mx-5 mb-3 flex items-center justify-between gap-3 px-5 py-3"
      style={{ background: 'var(--paper)' }}
    >
      <div className="flex min-w-0 items-end gap-2">
        <Link href="/" aria-label="홈" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="홈" className="h-10 w-10" />
        </Link>
        <h1 className="truncate font-display text-2xl font-extrabold leading-none text-primary">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Calendar — 현재 페이지가 캘린더가 아닐 때만(기존 인라인 SVG 유지) */}
        {!isCalendar && (
          <Link
            href="/calendar"
            aria-label="캘린더"
            className="rounded-xl border border-line p-2 text-muted transition hover:border-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="16" y1="2" x2="16" y2="6" />
            </svg>
          </Link>
        )}

        {action}

        {showLogout && (
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="로그아웃"
              className="rounded-xl border border-line p-2 text-muted transition hover:border-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
