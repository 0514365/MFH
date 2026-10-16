'use client'
// MFH-ACCOUNTING-TITLE-V3 — 달력·통계는 헤더 중앙 = 페이지가 채우는 슬롯(월 이동, HeaderPortal) · 통계는 왼쪽 ‹ 옆에 「통계」(AccountingSideTitle)
// MFH-ACCOUNTING-TITLE-V2 — 위플형 탭: 달력(홈)·통계·자산·내역
// 회계 헤더 타이틀 — 현재 경로에 따라 섹션명 표시(중앙 정렬). layout 헤더에서 절대 중앙 배치.
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/accounting': '회계관리',
  '/accounting/entry': '기록',
  '/accounting/inbox': '승인대기',
  '/accounting/ledger': '거래내역',
  '/accounting/report': '통계',
  '/accounting/assets': '자산',
}

// 헤더 중앙을 페이지가 채우는 경로(월 이동 등) — 타이틀 대신 빈 슬롯.
const SLOT_PATHS = new Set(['/accounting', '/accounting/report'])
// 중앙 슬롯을 쓰면서 섹션명은 왼쪽(‹ 옆)에 두는 경로.
const SIDE_TITLES: Record<string, string> = { '/accounting/report': '통계' }

export const HEADER_SLOT_ID = 'acct-header-center'

export default function AccountingTitle() {
  const pathname = usePathname() ?? '/accounting'
  if (SLOT_PATHS.has(pathname)) {
    return <div id={HEADER_SLOT_ID} className="absolute left-1/2 -translate-x-1/2" />
  }
  const title = TITLES[pathname] ?? '회계관리'
  return (
    <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[18px] font-bold tracking-tight text-ink">
      {title}
    </h1>
  )
}

export function AccountingSideTitle() {
  const pathname = usePathname() ?? '/accounting'
  const t = SIDE_TITLES[pathname]
  return t ? <span className="ml-1 whitespace-nowrap text-[16px] font-bold tracking-tight text-ink">{t}</span> : null
}

// 페이지 → 헤더 중앙 슬롯으로 내용 렌더(슬롯이 없으면 아무것도 안 그림).
export function HeaderPortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById(HEADER_SLOT_ID)), [])
  return slot ? createPortal(children, slot) : null
}

// 헤더 중앙 월 이동 — ‹ 라벨 › (라벨 탭 = onLabel, 예: 오늘로).
export function HeaderMonthNav({
  label,
  onPrev,
  onNext,
  onLabel,
  labelTitle,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onLabel?: () => void
  labelTitle?: string
}) {
  const btn = 'flex h-8 w-7 items-center justify-center rounded-full text-[18px] text-muted hover:bg-surface-subtle hover:text-primary'
  return (
    <div className="flex items-center whitespace-nowrap">
      <button type="button" onClick={onPrev} aria-label="이전" className={btn}>
        ‹
      </button>
      <button type="button" onClick={onLabel} disabled={!onLabel} title={labelTitle} className="px-0.5 font-display text-[17px] font-bold text-ink disabled:cursor-default">
        {label}
      </button>
      <button type="button" onClick={onNext} aria-label="다음" className={btn}>
        ›
      </button>
    </div>
  )
}
