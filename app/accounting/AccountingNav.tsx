'use client'
// MFH-ACCOUNTING-NAV-V2
// 회계 브랜치 전용 하단 탭바 — 5버튼: [요약][기록] [홈(중앙·돌출)] [내역][분석].
// 중앙 홈 = 마룬 원형 FAB(탭바 위로 돌출) + 흰 집 아이콘, 라벨 없음 — 메인 홈 BottomNav 와 동일 패턴.
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

// 중앙 홈 기준 좌(요약·기록)·우(내역·분석) 2개씩.
const LEFT_TABS: Tab[] = [
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
]

const RIGHT_TABS: Tab[] = [
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

// 중앙 홈 버튼 아이콘(집) — 마룬 원형 위 흰 선(currentColor 상속, Feather home 기반).
function HomeIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9 l9 -7 l9 7 v11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function TabLink({ tab, pathname }: { tab: Tab; pathname: string }) {
  const active = isActive(pathname, tab.href)
  return (
    <li className="flex-1">
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
        <ul className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {LEFT_TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* 중앙 홈 — 마룬 원형 FAB, 탭바 위로 돌출(-translate-y). 라벨 없음. */}
          <li className="flex-1">
            <Link href="/" aria-label="메인홈" className="flex justify-center">
              <span className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-[#b61821] text-white shadow-lg transition active:scale-95">
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
