// MFH-APP-LAYOUT-V2 — 보조 패널(AsidePanel) 데이터를 lib/aside.ts 로 조회해 AppShell aside 에 전달(c 단계).
// MFH-APP-LAYOUT-V1 — 셸 라우트 그룹: 로그인 멤버 전용(비로그인 → /login). 재정 관리자 여부를 읽어 AppShell(사이드바·레일·하단 탭)에 전달.
// /login /p /letters/view /api /auth 는 이 그룹 밖(셸 없음).
// 주의: App Router 레이아웃은 클라이언트 내비게이션에서 재렌더되지 않으므로 패널 수치는 revalidatePath/router.refresh/전체 로드 때 갱신된다.
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import AppShell from '@/components/AppShell'
import AsidePanel from '@/components/AsidePanel'
import { loadAside } from '@/lib/aside'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 신호·통독 기준일 — 온두라스 현지(홈과 동일).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const aside = await loadAside(supabase, today)

  return (
    <AppShell finance={canManageFinance(user.id)} aside={<AsidePanel data={aside} />}>
      {children}
    </AppShell>
  )
}
