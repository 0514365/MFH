'use client'
// MFH-ACCOUNTING-NAV-V9 — 실기 피드백: 하단 탭 = 아이콘 26px + 라벨 11px(높이 64) · 홈 = 중앙 돌출 남색 원 56px(V6 구조 복원)
//   · ＋ 기록 = 오른쪽 아래(V7 위치 복원, 터키석) · 승인대기 배지 = 내역 아이콘 우상단 남색 숫자(탭 → /accounting/inbox).
// MFH-ACCOUNTING-NAV-V8 — 2027 Minimal Block(b 단계): 하단 탭 글자 5개 · 활성 남색/비활성 회색 · 터키석 ＋ 하단 중앙. md 이상 세그먼트는 색만 2027 토큰(b27-*).
// MFH-ACCOUNTING-NAV-V7 — EntryFab 는 달력(/accounting)·내역(/accounting/ledger)에서만 표시
// MFH-ACCOUNTING-NAV-V6 — 중앙 = 메인홈(집) · 기록 ＋ 는 EntryFab(화면 오른쪽 아래 플로팅, 승인대기 배지 포함, 기록·승인대기 화면에선 숨김)
// MFH-ACCOUNTING-NAV-V5 — 위플형 재구성: [달력][통계] [＋(중앙·돌출)] [자산][내역]. 기록 탭 제거 → ＋ = /accounting/entry
//   (달력 홈에서 누르면 선택일 ?date= 프리필), 승인대기 배지는 ＋ 우상단(탭 → /accounting/inbox). 메인홈은 헤더 집 아이콘.
// MFH-ACCOUNTING-NAV-V4 — 승인대기 건수 배지(pending prop, layout 서버 계산)
// MFH-ACCOUNTING-NAV-V3 — md 이상 하단 탭바 숨김 + AccountingSegments(상단 세그먼트) export(셸 e 단계).
// 회계 브랜치 전용 하단 탭바. 전역 BottomNav 는 /accounting 하위에서 숨김(BottomNav HIDDEN_PREFIXES). fixed 라 스페이서로 여백 확보.
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

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

// 중앙 홈 기준 좌(달력·통계)·우(자산·내역) 2개씩.
const LEFT_TABS: Tab[] = [
  {
    href: '/accounting',
    label: '달력',
    sub: 'Calendar',
    icon: I(
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
      </>,
    ),
  },
  {
    href: '/accounting/report',
    label: '통계',
    sub: 'Stats',
    icon: I(
      <>
        <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
        <path d="M15 3.5A9 9 0 0 1 20.5 9H15Z" />
      </>,
    ),
  },
]

const RIGHT_TABS: Tab[] = [
  {
    href: '/accounting/assets',
    label: '자산',
    sub: 'Assets',
    icon: I(
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M16 15h2" />
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
]

// 활성 판정 — 달력 '/accounting' 은 exact, 나머지는 prefix. 기록·승인대기 화면은 어느 탭도 활성 아님.
function isActive(pathname: string, href: string): boolean {
  if (href === '/accounting') return pathname === '/accounting'
  return pathname === href || pathname.startsWith(href + '/')
}

// ＋ 이동 — 달력 홈이면 선택일(URL ?d=, CalendarHome 이 replaceState 로 갱신)을 기록 폼 날짜로 넘긴다.
function entryHref(pathname: string): string {
  if (pathname === '/accounting' && typeof window !== 'undefined') {
    const d = new URLSearchParams(window.location.search).get('d')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return `/accounting/entry?date=${d}`
  }
  return '/accounting/entry'
}

function PlusIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

// 승인대기 배지 — 남색 작은 숫자. 내역 탭 옆(모바일) · 승인대기 링크 옆(md 이상).
function CountBadge({ n, className = '' }: { n: number; className?: string }) {
  if (n <= 0) return null
  return (
    <span
      className={`inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-b27-ink px-1 font-num text-[9px] font-medium leading-none text-white ${className}`}
      aria-label={`승인대기 ${n}건`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

// 아이콘 탭 — 아이콘 26px + 라벨 11px. 활성 남색 500 / 비활성 회색. 내역 탭은 아이콘 우상단 승인대기 배지
// (배지 탭 → 승인대기 화면; <a> 중첩 금지라 span + router).
function TabLink({ tab, pathname, badge = 0 }: { tab: Tab; pathname: string; badge?: number }) {
  const active = isActive(pathname, tab.href)
  const router = useRouter()
  return (
    <li className="flex-1">
      <Link
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] transition ${
          active ? 'font-medium text-b27-ink' : 'text-b27-muted'
        }`}
      >
        <span className="relative [&>svg]:h-[26px] [&>svg]:w-[26px] [&>svg]:stroke-[1.8]">
          {tab.icon}
          {badge > 0 && (
            <span
              role="link"
              tabIndex={0}
              className="absolute -right-2.5 -top-1.5"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push('/accounting/inbox')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push('/accounting/inbox')
                }
              }}
            >
              <CountBadge n={badge} />
            </span>
          )}
        </span>
        {tab.label}
      </Link>
    </li>
  )
}

// 기록 ＋ 플로팅(모바일) — 오른쪽 아래, 탭바 위 16px. 터키석 원 + 흰 ＋(화면에서 유일한 터키석). 달력·내역 화면에서만 표시.
const FAB_PATHS = ['/accounting', '/accounting/ledger']
export function EntryFab() {
  const pathname = usePathname() ?? '/accounting'
  const router = useRouter()
  if (!FAB_PATHS.includes(pathname)) return null
  return (
    <div
      className="fixed right-4 z-40 md:hidden"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={() => router.push(entryHref(pathname))}
        aria-label="새 기록"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-b27-plus text-white shadow-[0_8px_18px_-6px_rgba(46,196,182,0.6)] transition active:scale-95"
      >
        <PlusIcon size={28} />
      </button>
    </div>
  )
}

export default function AccountingNav({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname() ?? '/accounting'
  return (
    <>
      {/* fixed 탭바 높이만큼 스페이서(safe-area 포함). 돌출 원형도 이 영역에 수용. */}
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

          {/* 중앙 = 메인홈 — 남색 원 56px, 탭바 위로 돌출. 기록 ＋ 는 EntryFab(오른쪽 아래). */}
          <li className="flex-1">
            <Link
              href="/"
              aria-label="메인홈"
              className="mx-auto flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-b27-ink text-white shadow-[0_8px_18px_-8px_rgba(43,49,96,0.5)] transition active:scale-95"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </Link>
          </li>

          {RIGHT_TABS.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} badge={tab.href === '/accounting/ledger' ? pending : 0} />
          ))}
        </ul>
      </nav>
    </>
  )
}

// md 이상(셸 사이드바 있음): 같은 4탭을 헤더 아래 상단 세그먼트로 + 우측 ＋ 기록 버튼 · 승인대기 배지. <md 숨김.
export function AccountingSegments({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const tabs = [...LEFT_TABS, ...RIGHT_TABS]
  return (
    <nav aria-label="Accounting 섹션" className="mb-4 hidden items-center gap-2 md:flex">
      <ul className="flex flex-1 gap-1 rounded-xl bg-b27-card p-1">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition ${
                  active ? 'bg-b27-paper font-medium text-b27-ink' : 'text-b27-muted hover:text-b27-ink'
                }`}
              >
                <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => router.push(entryHref(pathname))}
        className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-b27-plus px-4 text-[13px] font-medium text-white transition active:scale-[0.98]"
      >
        <PlusIcon size={16} />
        기록
      </button>
      {pending > 0 && (
        <Link
          href="/accounting/inbox"
          className="flex shrink-0 items-center gap-1 text-[12px] text-b27-muted hover:text-b27-ink"
        >
          승인대기 <CountBadge n={pending} />
        </Link>
      )}
    </nav>
  )
}
