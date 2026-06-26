'use client'
// MFH-ACCOUNTING-TITLE-V1
// 회계 헤더 타이틀 — 현재 경로에 따라 섹션명 표시(중앙 정렬). layout 헤더에서 절대 중앙 배치.
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/accounting': '회계관리',
  '/accounting/entry': '기록',
  '/accounting/ledger': '거래내역',
  '/accounting/report': '분석',
}

export default function AccountingTitle() {
  const pathname = usePathname() ?? '/accounting'
  const title = TITLES[pathname] ?? '회계관리'
  return (
    <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[18px] font-bold tracking-tight text-ink">
      {title}
    </h1>
  )
}
