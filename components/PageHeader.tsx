// MFH-PAGE-HEADER-V1
// 공통 페이지 헤더(서버 컴포넌트). 모든 모듈 페이지 상단에 사용.
// 좌: 로고마크(→홈) + 제목 / 우: Calendar·Insights 아이콘 + 페이지별 action + (옵션)로그아웃.
// - Calendar 아이콘 = 기존 인라인 SVG 그대로(요청). 현재 페이지가 calendar 면 숨김.
// - Insights 아이콘 = 미개발 → 흐리게, 링크 없음.
// - 로그아웃 = 홈에서만(showLogout). 서브페이지는 로고→홈 경유.
import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  title: string
  current?: 'journal' | 'projects' | 'tasks' | 'calendar' | 'insights' | 'home'
  action?: ReactNode
  showLogout?: boolean
}

export default function PageHeader({ title, current, action, showLogout = false }: Props) {
  const isCalendar = current === 'calendar'

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
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

        {/* Insights — 미개발: 흐리게, 비활성 */}
        <span
          aria-label="인사이트(준비 중)"
          aria-disabled="true"
          className="rounded-xl border border-line p-2 text-faint opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5 a7 7 0 0 1 3.7 12.9 c-1.2 0.8 -1.7 1.6 -1.7 2.9 H10 c0 -1.3 -0.5 -2.1 -1.7 -2.9 A7 7 0 0 1 12 2.5 Z" />
            <path d="M9.5 21 H14.5" />
            <path d="M10.3 23 H13.7" />
          </svg>
        </span>

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
