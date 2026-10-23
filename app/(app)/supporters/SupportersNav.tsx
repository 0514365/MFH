'use client'
// MFH-SUPPORTERS-NAV-V4 — 2027(4-7): theme-2027 · 남색 글자 · 연회색/살구 면 · 강조 = 진한 살구 · 굵기 600 이하.
// MFH-SUPPORTERS-NAV-V3 — md 이상 하단 탭바 숨김 + SupportersSegments(상단 세그먼트) export(셸 e 단계).
// MFH-SUPPORTERS-NAV-V2
// 후원자 브랜치 전용 하단 탭바 — 5버튼: [현황][명단] [홈(중앙·돌출)] [등록][분석].
// 중앙 홈 = 남색 원형(탭바 위로 돌출) + 흰 집 아이콘, 라벨 없음 — 회계 탭바와 동일 패턴.
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

// 중앙 홈 기준 좌(현황·명단)·우(등록·분석) 2개씩.
const LEFT_TABS: Tab[] = [
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
]

const RIGHT_TABS: Tab[] = [
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
        className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] transition ${
          active ? 'font-medium text-b27-ink' : 'text-b27-muted'
        }`}
      >
        <span className="[&>svg]:h-[26px] [&>svg]:w-[26px] [&>svg]:stroke-[1.8]">{tab.icon}</span>
        {tab.label}
      </Link>
    </li>
  )
}

export default function SupportersNav() {
  const pathname = usePathname() ?? '/supporters'
  return (
    <>
      {/* fixed 탭바 높이만큼 스페이서(safe-area 포함) */}
      <div
        className="h-[64px] md:hidden"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-b27-line bg-b27-paper md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}
      >
        <ul className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {LEFT_TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* 중앙 홈 — 남색 원 56px, 탭바 위로 돌출(회계 탭바와 동일). 라벨 없음. */}
          <li className="flex-1">
            <Link href="/" aria-label="메인홈" className="flex justify-center">
              <span className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-b27-ink text-white shadow-[0_8px_18px_-8px_rgba(43,49,96,0.5)] transition active:scale-95">
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

// md 이상(셸 사이드바 있음): 같은 4탭을 헤더 아래 상단 세그먼트로. 중앙 홈 FAB 는 없음(사이드바가 홈 담당). <md 숨김.
export function SupportersSegments() {
  const pathname = usePathname() ?? ''
  const tabs = [...LEFT_TABS, ...RIGHT_TABS]
  return (
    <nav aria-label="Supporters 섹션" className="mb-4 hidden md:block">
      <ul className="flex gap-1 rounded-full bg-b27-card p-1">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] transition ${
                  active ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted hover:text-b27-ink'
                }`}
              >
                <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
