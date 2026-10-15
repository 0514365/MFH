'use client'
// MFH-ACCOUNTING-NAV-V4 — 기록 탭에 승인대기 건수 배지(pending prop, layout 서버 계산)
// MFH-ACCOUNTING-NAV-V3 — md 이상 하단 탭바 숨김 + AccountingSegments(상단 세그먼트) export(셸 e 단계).
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
  // 승인대기(/accounting/inbox)는 기록 탭 소속으로 표시.
  if (href === '/accounting/entry' && pathname.startsWith('/accounting/inbox')) return true
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

// 승인대기 배지 — 기록 탭(승인대기 화면이 기록 탭 소속)에만.
const BADGE_HREF = '/accounting/entry'
function CountBadge({ n, className = '' }: { n: number; className?: string }) {
  if (n <= 0) return null
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-display text-[10px] font-bold leading-none text-white ${className}`}
      aria-label={`승인대기 ${n}건`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

function TabLink({ tab, pathname, pending }: { tab: Tab; pathname: string; pending: number }) {
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
        <span className="relative">
          {tab.icon}
          {tab.href === BADGE_HREF && <CountBadge n={pending} className="absolute -right-2.5 -top-1.5" />}
        </span>
        <span className="text-[11px] font-semibold">{tab.label}</span>
      </Link>
    </li>
  )
}

export default function AccountingNav({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname() ?? '/accounting'
  return (
    <>
      {/* fixed 탭바 높이만큼 스페이서(safe-area 포함) */}
      <div
        className="h-[68px] md:hidden"
        style={{ height: 'calc(68px + env(safe-area-inset-bottom))' }}
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}
      >
        <ul className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {LEFT_TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} pending={pending} />
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
            <TabLink key={tab.href} tab={tab} pathname={pathname} pending={pending} />
          ))}
        </ul>
      </nav>
    </>
  )
}

// md 이상(셸 사이드바 있음): 같은 4탭을 헤더 아래 상단 세그먼트로. 중앙 홈 FAB 는 없음(사이드바가 홈 담당). <md 숨김.
export function AccountingSegments({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname() ?? ''
  const tabs = [...LEFT_TABS, ...RIGHT_TABS]
  return (
    <nav aria-label="Accounting 섹션" className="mb-4 hidden md:block">
      <ul className="flex gap-1 rounded-xl bg-surface-subtle p-1">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  active ? 'bg-surface text-primary shadow-soft' : 'text-muted hover:text-ink'
                }`}
              >
                <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{tab.icon}</span>
                {tab.label}
                {tab.href === BADGE_HREF && <CountBadge n={pending} />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
