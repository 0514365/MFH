'use client'
// MFH-ACCOUNTING-NAV-V1
// 회계 브랜치 전용 하단 탭바 — 4탭 균등(요약·기록·내역·분석). 활성 = accent(#b61821).
// 전역 BottomNav 는 /accounting 하위에서 숨김(BottomNav HIDDEN_PREFIXES). fixed 라 layout main 이 pb 로 여백 확보.
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
    href: '/accounting',
    label: '요약',
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
    href: '/accounting/entry',
    label: '기록',
    sub: 'Entry',
    icon: I(
      <>
        <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12l-1.88-1.88a1.5 1.5 0 0 0-2.12 0L4 16v4Z" />
        <path d="M13.5 6.5l4 4" />
      </>,
    ),
  },
  {
    href: '/accounting/ledger',
    label: '내역',
    sub: 'Ledger',
    icon: I(
      <>
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </>,
    ),
  },
  {
    href: '/accounting/report',
    label: '분석',
    sub: 'Report',
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

// 활성 판정 — 정확 매칭(요약 '/accounting' 은 하위 경로에 끌려가지 않게 exact, 나머지는 prefix).
function isActive(pathname: string, href: string): boolean {
  if (href === '/accounting') return pathname === '/accounting'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AccountingNav() {
  const pathname = usePathname() ?? '/accounting'
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
