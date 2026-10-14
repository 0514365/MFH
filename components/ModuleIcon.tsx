// MFH-MODULE-ICON-V3 — 셸 내비용 아이콘 추가(home·qt·reading·heart·news·facebook·supporters·accounting·theme·signout). lib/nav.ts 가 참조.
// MFH-MODULE-ICON-V2 — bible(펼친 성경) 추가(/bible/study 홈 타일).
// MFH-MODULE-ICON-V1
// 5개 홈 모듈 인라인 SVG 아이콘. 색은 currentColor 상속(활성=text-primary / 비활성=text-muted / 다크모드 자동).
// 24×24 viewBox, line(outline), round. 날짜 점만 fill=currentColor.
import type { ReactElement, SVGProps } from 'react'

export type ModuleIconName =
  | 'log'
  | 'projects'
  | 'todo'
  | 'calendar'
  | 'insights'
  | 'portfolio'
  | 'photos'
  | 'bible'
  | 'home'
  | 'qt'
  | 'reading'
  | 'heart'
  | 'news'
  | 'facebook'
  | 'supporters'
  | 'accounting'
  | 'theme'
  | 'signout'

type Props = SVGProps<SVGSVGElement> & {
  name: ModuleIconName
  size?: number
  strokeWidth?: number
}

const PATHS: Record<ModuleIconName, ReactElement> = {
  log: (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <path d="M8 2.5 V21.5" />
      <path d="M11 8 H17" />
      <path d="M11 12 H17" />
      <path d="M11 16 H14.5" />
    </>
  ),
  projects: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <path d="M13.5 17.2 l2 2 l4 -4.6" />
    </>
  ),
  todo: (
    <>
      <path d="M3 6.5 l2 2 l3.4 -4" />
      <path d="M11 5 H21" />
      <path d="M3 13 l2 2 l3.4 -4" />
      <path d="M11 11.5 H21" />
      <path d="M3 19.5 l2 2 l3.4 -4" />
      <path d="M11 18 H21" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5 H21" />
      <path d="M8 3 V6.5" />
      <path d="M16 3 V6.5" />
      <circle cx="7.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  insights: (
    <>
      <path d="M12 2.5 a7 7 0 0 1 3.7 12.9 c-1.2 0.8 -1.7 1.6 -1.7 2.9 H10 c0 -1.3 -0.5 -2.1 -1.7 -2.9 A7 7 0 0 1 12 2.5 Z" />
      <path d="M9.5 21 H14.5" />
      <path d="M10.3 23 H13.7" />
    </>
  ),
  portfolio: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6 L15.4 6.4" />
      <path d="M8.6 13.4 L15.4 17.6" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16 l-5 -5 L5 19" />
    </>
  ),
  bible: (
    <>
      <path d="M12 6.5 C10 4.8 7 4.3 3 4.8 V19.3 C7 18.8 10 19.3 12 21 C14 19.3 17 18.8 21 19.3 V4.8 C17 4.3 14 4.8 12 6.5 Z" />
      <path d="M12 6.5 V21" />
    </>
  ),
  // 집(Feather home) — 하단 탭 FAB·사이드바 홈
  home: (
    <>
      <path d="M3 9 l9 -7 l9 7 v11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  // QT — 떠오르는 해(아침 묵상)
  qt: (
    <>
      <path d="M17 18 a5 5 0 0 0 -10 0" />
      <path d="M12 2 V9" />
      <path d="M4.2 10.2 l1.4 1.4" />
      <path d="M2 18 H4" />
      <path d="M20 18 H22" />
      <path d="M19.8 10.2 l-1.4 1.4" />
      <path d="M3 22 H21" />
      <path d="M8 6 l4 -4 l4 4" />
    </>
  ),
  // 통독 — 북마크 꽂힌 책
  reading: (
    <>
      <path d="M4 19.5 A2.5 2.5 0 0 1 6.5 17 H20" />
      <path d="M6.5 2 H20 v20 H6.5 a2.5 2.5 0 0 1 -2.5 -2.5 v-15 A2.5 2.5 0 0 1 6.5 2 Z" />
      <path d="M10 2 v8 l2.5 -2 l2.5 2 V2" />
    </>
  ),
  // 중보기도 — 하트
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  ),
  // 동향 — 신문
  news: (
    <>
      <path d="M4 22 h16 a2 2 0 0 0 2 -2 V4 a2 2 0 0 0 -2 -2 H8 a2 2 0 0 0 -2 2 v14 a2 2 0 0 1 -2 2 Z" />
      <path d="M6 20 a2 2 0 0 1 -4 0 V10 h4" />
      <rect x="10" y="6" width="8" height="5" rx="1" />
      <path d="M10 15 H18" />
      <path d="M10 18 H15" />
    </>
  ),
  // Facebook 게시 — 페이퍼 비행기
  facebook: (
    <>
      <path d="M3 11l18-5v12L3 14z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  // 후원자 — Lucide users
  supporters: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  // 회계 — Lucide calculator
  accounting: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </>
  ),
  // 연 주제·목표 — 깃발
  theme: (
    <>
      <path d="M4 22 V3" />
      <path d="M4 3 h12 l-2.5 4 l2.5 4 H4" />
    </>
  ),
  // 로그아웃 — Feather log-out
  signout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
}

export default function ModuleIcon({
  name,
  size = 24,
  strokeWidth = 2.1,
  ...rest
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
