'use client'
// MFH-SUPPORTERS-NAV-V1
// 후원자 브랜치 전용 하단 탭바 — 4탭 균등(현황·명단·등록·분석). 활성 = accent(#b61821).
// 전역 BottomNav 는 /supporters 하위에서 숨김(BottomNav HIDDEN_PREFIXES). fixed 라 layout main 이 pb 로 여백 확보.
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Tab = { href: string; label: string; sub: string; icon: JSX.Element }

const I = (path: JSX.Element) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
)

const TABS: Tab[] = [
  {
    href: '/supporters',
    label: '현황',
    sub: 'Summary',
    icon: I(
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>,
    ),
  },
  {
    href: '/supporters/list',
    label: '명단',
    sub: 'List',
    icon: I(
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>,
    ),
  },
  {
    href: '/supporters/new',
    label: '등록',
    sub: 'New',
    icon: I(
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </>,
    ),
  },
  {
    href: '/supporters/insights',
    label: '분석',
    sub: 'Insights',
    icon: I(
      <>
        <path d="M4 20h16" />
        <rect x="6" y="11" width="3" height="6" rx="0.5" />
        <rect x="11" y="7" width="3" height="10" rx="0.5" />
        <rect x="16" y="13" width="3" height="4" rx="0.5" />
      </>,
    ),
  },
]

// 활성 판정 — 현황 '/supporters' 은 하위 경로에 끌려가지 않게 exact, 나머지는 prefix.
function isActive(pathname: string, href: string): boolean {
  if (href === '/supporters') return pathname === '/supporters'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function SupportersNav() {
  const pathname = usePathname() ?? '/supporters'
  return (
    <>
      {/* fixed 탭바 높이만큼 스페이서(safe-area 포함) */}
      <div
        className="h-[68px]"
        style={{ height: 'calc(68px + env(safe-area-inset-bottom))' }}
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-1 transition ${
                    active ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[11px] font-semibold">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
