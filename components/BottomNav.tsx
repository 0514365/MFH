'use client'

// MFH-BOTTOM-NAV-V1
// 하단 고정 탭바 — 5개 모듈 이동. 색은 ModuleIcon currentColor 상속.
// 활성=text-primary / 비활성=text-muted / Insights(미개발)=text-faint + 클릭 비활성.
// 로그인 경로에서는 렌더 안 함(null). fixed 라 콘텐츠 가림 방지용 스페이서를 자체 포함.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ModuleIcon, { type ModuleIconName } from '@/components/ModuleIcon'

type Tab = {
  href: string
  label: string
  icon: ModuleIconName
  active: boolean // false = 미개발(인사이트). 흐리게 + 비활성.
  match: (path: string) => boolean
}

const TABS: Tab[] = [
  { href: '/journal', label: 'Log', icon: 'log', active: true, match: (p) => p.startsWith('/journal') },
  { href: '/projects', label: 'Projects', icon: 'projects', active: true, match: (p) => p.startsWith('/projects') },
  { href: '/tasks', label: 'To-Do', icon: 'todo', active: true, match: (p) => p.startsWith('/tasks') },
  { href: '/calendar', label: 'Calendar', icon: 'calendar', active: true, match: (p) => p.startsWith('/calendar') },
  { href: '/insights', label: 'Insights', icon: 'insights', active: false, match: (p) => p.startsWith('/insights') },
]

// 탭바를 숨길 경로(로그인 등). 스플래시는 홈 내부 SplashGate 가 처리.
const HIDDEN_PREFIXES = ['/login']

export default function BottomNav() {
  const pathname = usePathname() ?? '/'
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <>
      {/* fixed 탭바가 가리지 않도록 같은 높이 스페이서 */}
      <div className="h-[68px]" aria-hidden="true" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {TABS.map((tab) => {
            const isActive = tab.active && tab.match(pathname)

            if (!tab.active) {
              // 미개발(인사이트): 링크 없이 흐리게 표시
              return (
                <li key={tab.href} className="flex-1">
                  <div className="flex select-none flex-col items-center gap-0.5 py-2 text-faint opacity-60">
                    <ModuleIcon name={tab.icon} size={22} />
                    <span className="text-[10px] font-semibold">{tab.label}</span>
                  </div>
                </li>
              )
            }

            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 transition ${
                    isActive ? 'text-primary' : 'text-muted'
                  }`}
                >
                  <ModuleIcon name={tab.icon} size={22} strokeWidth={isActive ? 2.3 : 2.1} />
                  <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-semibold'}`}>
                    {tab.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
