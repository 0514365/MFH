// MFH-PAGE-HEADER-V4 — 2027 셸(2단계): 흰 바탕 52px · 로고마크 제거(홈 = 탭바·사이드바) · 제목 Manrope 17/600 남색 · 아이콘 버튼 테두리 없음(44 터치).
// MFH-PAGE-HEADER-V3
// 공통 페이지 헤더(서버 컴포넌트). 모든 모듈 페이지 상단에 사용.
// 좌: 제목 / 우: Calendar 아이콘 + 페이지별 action + (옵션)로그아웃.
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
    <div className="sticky top-0 z-30 -mx-5 mb-3 flex h-[52px] items-center justify-between gap-3 bg-b27-paper pl-5 pr-3">
      <h1 className="min-w-0 truncate font-num text-[17px] font-semibold leading-none text-b27-ink">{title}</h1>

      <div className="flex shrink-0 items-center gap-1">
        {/* Calendar — 현재 페이지가 캘린더가 아닐 때만(기존 인라인 SVG 유지) */}
        {!isCalendar && (
          <Link
            href="/calendar"
            aria-label="캘린더"
            className="flex h-11 w-11 items-center justify-center text-b27-ink transition active:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
              className="flex h-11 w-11 items-center justify-center text-b27-ink transition active:opacity-70"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
