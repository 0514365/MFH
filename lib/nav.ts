// MFH-NAV-V1 — 내비게이션 정의 단일 출처(사이드바·레일·하단 탭 공용). docs/MFH-WIDE-LAYOUT-DESIGN.md §2.
// finance 플래그 항목(후원자·회계)은 canManageFinance(부부) 일 때만 노출.
import type { ModuleIconName } from '@/components/ModuleIcon'

export type NavGroup = 'home' | 'record' | 'word' | 'insight' | 'manage'

export type NavItem = {
  href: string
  label: string
  icon: ModuleIconName
  group: NavGroup
  finance?: boolean
}

// 사이드바·레일 순서. 그룹이 바뀌는 지점에 구분선.
export const SIDE_NAV: NavItem[] = [
  { href: '/', label: '홈', icon: 'home', group: 'home' },
  // 기록
  { href: '/journal', label: '일지', icon: 'log', group: 'record' },
  { href: '/projects', label: '프로젝트', icon: 'projects', group: 'record' },
  { href: '/tasks', label: '할 일', icon: 'todo', group: 'record' },
  { href: '/calendar', label: '캘린더', icon: 'calendar', group: 'record' },
  { href: '/photos', label: '사진', icon: 'photos', group: 'record' },
  // 말씀
  { href: '/qt', label: 'QT', icon: 'qt', group: 'word' },
  { href: '/bible', label: '통독', icon: 'reading', group: 'word' },
  { href: '/bible/study', label: '성경', icon: 'bible', group: 'word' },
  { href: '/intercessions', label: '중보기도', icon: 'heart', group: 'word' },
  // 분석·소통
  { href: '/insights', label: '인사이트', icon: 'insights', group: 'insight' },
  { href: '/honduras', label: '동향', icon: 'news', group: 'insight' },
  { href: '/facebook', label: 'Facebook', icon: 'facebook', group: 'insight' },
  { href: '/portfolio', label: '포트폴리오', icon: 'portfolio', group: 'insight' },
  // 관리(부부)
  { href: '/supporters', label: '후원자', icon: 'supporters', group: 'manage', finance: true },
  { href: '/accounting', label: '회계', icon: 'accounting', group: 'manage', finance: true },
]

// 사이드바 하단 고정(연 주제·목표). 로그아웃은 SideNav 가 폼으로 직접 렌더.
export const THEME_NAV: NavItem = { href: '/theme', label: '주제·목표', icon: 'theme', group: 'manage' }

// 모바일 하단 탭(<md): [Insights] [Log] [홈 FAB] [Projects] [To-Do]. 라벨은 탭바가 영문 유지(아이콘만 표시).
const byHref = (href: string): NavItem => {
  const it = SIDE_NAV.find((n) => n.href === href)
  if (!it) throw new Error(`nav item missing: ${href}`)
  return it
}
export const BOTTOM_FAB: NavItem = byHref('/')
export const BOTTOM_LEFT: NavItem[] = [byHref('/insights'), byHref('/journal')]
export const BOTTOM_RIGHT: NavItem[] = [byHref('/projects'), byHref('/tasks')]

// 하단 탭 높이(safe-area 제외). globals.css main.bible-study-main 의 76px 과 같이 맞춘다.
export const BOTTOM_BAR_H = 76

// 셸(사이드바·탭바) 밖 경로. '/p' 는 '/p/' 하위(공개 포트폴리오)만 매칭.
export const SHELL_HIDDEN_PREFIXES = ['/login', '/p']
export function isShellHidden(pathname: string): boolean {
  return SHELL_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// 전역 하단 탭바를 숨길 경로 — 셸 밖 + 자체 4탭 네비를 쓰는 회계·후원자 브랜치.
export const BOTTOM_HIDDEN_PREFIXES = [...SHELL_HIDDEN_PREFIXES, '/accounting', '/supporters']

export function visibleNav(items: NavItem[], finance: boolean): NavItem[] {
  return items.filter((it) => !it.finance || finance)
}

// 현재 경로에 해당하는 항목 href — 가장 긴 prefix 매치('/bible' 과 '/bible/study' 충돌 방지). 없으면 null.
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null
  for (const it of items) {
    const hit = it.href === '/' ? pathname === '/' : pathname === it.href || pathname.startsWith(it.href + '/')
    if (hit && (best === null || it.href.length > best.length)) best = it.href
  }
  return best
}
