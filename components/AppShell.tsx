// MFH-APPSHELL-V5 — 2027(4-9): 셸 맨 바깥에 .theme-2027 한 번(앱 안 전 화면 브릿지 · 페이지별 부착 제거). /p·/login·/letters 는 셸 밖이라 그대로.
// MFH-APPSHELL-V4 — 2027 셸(2단계): 보조 패널 열 흰 바탕 · b27 선.
// MFH-APPSHELL-V3 — 본문 열에 @container(페이지의 @xl/@4xl 컨테이너 쿼리 기준, d 단계).
// MFH-APPSHELL-V2 — 보조 패널은 lg 이상에서만(본문 아래 중복 배치 제거 — 홈이 같은 정보를 담는다).
// MFH-APPSHELL-V1 — 3단 셸 골격(docs/MFH-WIDE-LAYOUT-DESIGN.md §1).
// <md: 본문 + 하단 탭바 / md: 레일 72 + 본문 / lg: 레일 72 + 본문 + 보조 패널 240 / xl: 사이드바 200 + 본문 + 보조 패널 260.
// 본문 폭은 각 페이지의 <main> 이 잡는다(mx-auto max-w-*). aside 가 없으면 우측 열을 그리지 않는다.
import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import SideNav from './SideNav'

export default function AppShell({
  finance,
  aside,
  children,
}: {
  finance: boolean
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="theme-2027 min-h-screen md:flex">
      <SideNav finance={finance} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex flex-1">
          <div className="@container min-w-0 flex-1">{children}</div>
          {aside && (
            <aside className="hidden w-[240px] shrink-0 border-l border-b27-line bg-b27-paper lg:block xl:w-[260px]">
              <div className="sticky top-0 max-h-screen overflow-y-auto p-5">{aside}</div>
            </aside>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
