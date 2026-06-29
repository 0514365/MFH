'use client'

// MFH-BOTTOM-NAV-V2
// 하단 고정 탭바 — 5버튼: [Insights] [Log] [홈(중앙·돌출)] [Projects] [To-Do].
// 중앙 홈 = 마룬 원형 FAB(탭바 위로 돌출) + 흰 집 아이콘, 라벨 없음. 현재 홈이면 ring 강조.
// 양옆 4탭: 활성=text-primary / 비활성=text-muted. 색은 ModuleIcon currentColor 상속.
// 로그인·공개페이지(/p)에서는 렌더 안 함(null). fixed 라 콘텐츠 가림 방지용 스페이서 자체 포함.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ModuleIcon, { type ModuleIconName } from '@/components/ModuleIcon'

type Tab = {
  href: string
  label: string
  icon: ModuleIconName
  match: (path: string) => boolean
}

// 중앙 홈 기준 좌(Insights·Log)·우(Projects·To-Do) 2개씩. Portfolio 는 탭바 제외(홈 타일·헤더로 접근).
const LEFT_TABS: Tab[] = [
  { href: '/insights', label: 'Insights', icon: 'insights', match: (p) => p.startsWith('/insights') },
  { href: '/journal', label: 'Log', icon: 'log', match: (p) => p.startsWith('/journal') },
]
const RIGHT_TABS: Tab[] = [
  { href: '/projects', label: 'Projects', icon: 'projects', match: (p) => p.startsWith('/projects') },
  { href: '/tasks', label: 'To-Do', icon: 'todo', match: (p) => p.startsWith('/tasks') },
]

// 탭바를 숨길 경로(로그인·공개페이지·회계·후원자 브랜치). 스플래시는 홈 내부 SplashGate 가 처리.
// '/p' 는 '/p/' 하위(공개 포트폴리오)만 매칭 — '/portfolio'·'/projects' 는 영향 없음.
// '/accounting'·'/supporters' 하위는 각자 전용 4탭 네비를 쓰므로 전역 탭바 숨김.
const HIDDEN_PREFIXES = ['/login', '/p', '/accounting', '/supporters']

// 중앙 홈 버튼 아이콘(집) — 마룬 원형 위 흰 선(currentColor 상속, Feather home 기반).
function HomeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9 l9 -7 l9 7 v11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function TabLink({ tab, pathname }: { tab: Tab; pathname: string }) {
  const isActive = tab.match(pathname)
  return (
    <li className="flex-1">
      <Link
        href={tab.href}
        aria-label={tab.label}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center justify-center py-3.5 transition ${
          isActive ? 'text-accent' : 'text-muted'
        }`}
      >
        <ModuleIcon name={tab.icon} size={28} strokeWidth={isActive ? 2.3 : 2.1} />
      </Link>
    </li>
  )
}

export default function BottomNav() {
  const pathname = usePathname() ?? '/'
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }
  const isHome = pathname === '/'

  return (
    <>
      {/* fixed 탭바가 가리지 않도록 같은 높이 스페이서(safe-area 포함). 돌출 원형도 이 영역에 수용. */}
      <div
        className="h-[76px]"
        style={{ height: 'calc(76px + env(safe-area-inset-bottom))' }}
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        <ul className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {LEFT_TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* 중앙 홈 — 마룬 원형 FAB, 탭바 위로 돌출(-translate-y). 라벨 없음. */}
          <li className="flex-1">
            <Link
              href="/"
              aria-label="홈"
              aria-current={isHome ? 'page' : undefined}
              className="flex justify-center"
            >
              <span
                className={`flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-[#b61821] text-white shadow-lg transition active:scale-95 ${
                  isHome ? 'ring-4 ring-[#fae3e4]' : ''
                }`}
              >
                <HomeIcon />
              </span>
            </Link>
          </li>

          {RIGHT_TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} />
          ))}
        </ul>
      </nav>
    </>
  )
}
