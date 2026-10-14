'use client'

// MFH-BOTTOM-NAV-V4 — 탭 구성·숨김 경로·활성 판정을 lib/nav.ts 단일 출처에서 읽음. md 이상(iPad 세로~)은 셸 사이드바가 대신하므로 숨김(md:hidden).
// MFH-BOTTOM-NAV-V3
// 하단 고정 탭바 — 5버튼: [Insights] [Log] [홈(중앙·돌출)] [Projects] [To-Do].
// 중앙 홈 = 마룬 원형 FAB(탭바 위로 돌출) + 흰 집 아이콘, 라벨 없음. 현재 홈이면 ring 강조.
// 양옆 4탭: 활성=text-accent / 비활성=text-muted. 색은 ModuleIcon currentColor 상속.
// 로그인·공개페이지(/p)·회계·후원자에서는 렌더 안 함(null). fixed 라 콘텐츠 가림 방지용 스페이서 자체 포함.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ModuleIcon from '@/components/ModuleIcon'
import {
  activeHref,
  BOTTOM_BAR_H,
  BOTTOM_FAB,
  BOTTOM_HIDDEN_PREFIXES,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  type NavItem,
} from '@/lib/nav'

const ALL: NavItem[] = [...BOTTOM_LEFT, BOTTOM_FAB, ...BOTTOM_RIGHT]

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center justify-center py-3.5 transition ${active ? 'text-accent' : 'text-muted'}`}
      >
        <ModuleIcon name={item.icon} size={28} strokeWidth={active ? 2.3 : 2.1} />
      </Link>
    </li>
  )
}

export default function BottomNav() {
  const pathname = usePathname() ?? '/'
  if (BOTTOM_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }
  const active = activeHref(pathname, ALL)
  const isHome = active === BOTTOM_FAB.href

  return (
    <>
      {/* fixed 탭바가 가리지 않도록 같은 높이 스페이서(safe-area 포함). 돌출 원형도 이 영역에 수용. */}
      <div
        className="md:hidden"
        style={{ height: `calc(${BOTTOM_BAR_H}px + env(safe-area-inset-bottom))` }}
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          // iPad/iOS 모멘텀 스크롤 중 fixed 탭바가 콘텐츠와 함께 밀리는 현상 방지 — 독립 합성 레이어로 고정.
          transform: 'translate3d(0, 0, 0)',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        <ul className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {BOTTOM_LEFT.map((it) => (
            <TabLink key={it.href} item={it} active={active === it.href} />
          ))}

          {/* 중앙 홈 — 마룬 원형 FAB, 탭바 위로 돌출(-translate-y). 라벨 없음. */}
          <li className="flex-1">
            <Link
              href={BOTTOM_FAB.href}
              aria-label={BOTTOM_FAB.label}
              aria-current={isHome ? 'page' : undefined}
              className="flex justify-center"
            >
              <span
                className={`flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-[#b61821] text-white shadow-lg transition active:scale-95 ${
                  isHome ? 'ring-4 ring-[#fae3e4]' : ''
                }`}
              >
                <ModuleIcon name="home" size={26} strokeWidth={2.2} />
              </span>
            </Link>
          </li>

          {BOTTOM_RIGHT.map((it) => (
            <TabLink key={it.href} item={it} active={active === it.href} />
          ))}
        </ul>
      </nav>
    </>
  )
}
