// MFH-MODULE-ICON-V1
// 5개 홈 모듈 인라인 SVG 아이콘. 색은 currentColor 상속(활성=text-primary / 비활성=text-muted / 다크모드 자동).
// 24×24 viewBox, line(outline), round. 날짜 점만 fill=currentColor.
import type { ReactElement, SVGProps } from 'react'

export type ModuleIconName = 'log' | 'projects' | 'todo' | 'calendar' | 'insights'

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
