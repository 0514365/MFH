'use client'

// MFH-SIDENAV-V1 — md·lg 아이콘 레일 72(툴팁) · xl 사이드바 200(라벨). 항목·그룹은 lib/nav.ts SIDE_NAV. <md 숨김(하단 탭바가 대신).
// 상단 로고마크(→홈) · 그룹 사이 구분선 · 하단 고정 = 주제·목표 + 로그아웃(POST /auth/signout).
// 활성 = bg-primary-soft + on-primary-soft(Manna SideNav 와 같은 톤). 항목 수가 많아 nav 자체가 세로 스크롤.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ModuleIcon from '@/components/ModuleIcon'
import { activeHref, SIDE_NAV, THEME_NAV, visibleNav, type NavItem } from '@/lib/nav'

const itemBase =
  'relative flex items-center justify-center gap-2.5 rounded-[10px] px-2 py-2.5 text-[13.5px] transition xl:justify-start xl:px-3'

function Item({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`${itemBase} ${
          active ? 'bg-primary-soft font-bold text-on-primary-soft' : 'text-muted hover:bg-surface-subtle hover:text-ink'
        }`}
      >
        <ModuleIcon name={item.icon} size={22} strokeWidth={active ? 2.3 : 2} className="shrink-0" />
        <span className="hidden truncate xl:inline">{item.label}</span>
      </Link>
    </li>
  )
}

export default function SideNav({ finance }: { finance: boolean }) {
  const pathname = usePathname() ?? '/'
  const items = visibleNav(SIDE_NAV, finance)
  const active = activeHref(pathname, [...items, THEME_NAV])

  return (
    <nav
      aria-label="주 메뉴"
      className="sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col self-start overflow-y-auto border-r border-line bg-surface px-3 py-4 md:flex xl:w-[200px]"
    >
      <Link href="/" aria-label="홈" className="mb-4 flex items-center gap-2 px-1 xl:px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="MFH" className="h-9 w-9 shrink-0" />
        <span className="hidden font-display text-[15px] font-extrabold tracking-[0.08em] text-primary xl:inline">MFH</span>
      </Link>

      <ul className="flex flex-col gap-1">
        {items.map((it, i) => {
          const prev = items[i - 1]
          const divider = prev && prev.group !== it.group
          return (
            <li key={it.href} className={divider ? 'mt-2 border-t border-line pt-2' : undefined}>
              <ul>
                <Item item={it} active={active === it.href} />
              </ul>
            </li>
          )
        })}
      </ul>

      <ul className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
        <Item item={THEME_NAV} active={active === THEME_NAV.href} />
        <li>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="로그아웃"
              aria-label="로그아웃"
              className={`${itemBase} w-full text-muted hover:bg-surface-subtle hover:text-ink`}
            >
              <ModuleIcon name="signout" size={22} strokeWidth={2} className="shrink-0" />
              <span className="hidden truncate xl:inline">로그아웃</span>
            </button>
          </form>
        </li>
      </ul>
    </nav>
  )
}
