'use client'
// MFH-ACCOUNTING-TITLE-V6 — 달력 헤더 오른쪽 🔍(HeaderSearchLink → /accounting/search) · 「검색」 타이틀
// MFH-ACCOUNTING-TITLE-V5 — 달력 월 이동도 모든 폭에서 헤더 중앙(절대 배치)
// MFH-ACCOUNTING-TITLE-V4 — 모바일(<md) 달력: 월 이동 슬롯을 왼쪽 흐름 배치 + 헤더 L/$ 토글(HeaderCurToggle) · 월 라벨 22px · L/$ 크게
// MFH-ACCOUNTING-TITLE-V3 — 달력·통계는 헤더 중앙 = 페이지가 채우는 슬롯(월 이동, HeaderPortal) · 통계는 왼쪽 ‹ 옆에 「통계」(AccountingSideTitle)
// MFH-ACCOUNTING-TITLE-V2 — 위플형 탭: 달력(홈)·통계·자산·내역
// 회계 헤더 타이틀 — 현재 경로에 따라 섹션명 표시(중앙 정렬). layout 헤더에서 절대 중앙 배치.
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useShowCur, type ShowCur } from '@/lib/acct-display'

const TITLES: Record<string, string> = {
  '/accounting': '회계관리',
  '/accounting/entry': '기록',
  '/accounting/inbox': '승인대기',
  '/accounting/ledger': '거래내역',
  '/accounting/report': '통계',
  '/accounting/assets': '자산',
  '/accounting/search': '검색',
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
  const btn = 'flex h-10 w-8 items-center justify-center rounded-full text-[24px] text-muted hover:bg-surface-subtle hover:text-primary'
  return (
    <div className="flex items-center whitespace-nowrap">
      <button type="button" onClick={onPrev} aria-label="이전" className={btn}>
        ‹
      </button>
      <button type="button" onClick={onLabel} disabled={!onLabel} title={labelTitle} className="px-0.5 font-display text-[22px] font-bold text-ink disabled:cursor-default">
        {label}
      </button>
      <button type="button" onClick={onNext} aria-label="다음" className={btn}>
        ›
      </button>
    </div>
  )
}

// L/$ 표시 통화 토글(기기별 저장 · 화면 간 동기화) — 모바일 달력은 헤더 오른쪽, 그 외는 요약 카드 라벨 줄.
export function CurToggle({ className = '' }: { className?: string }) {
  const [cur, setCur] = useShowCur()
  return (
    <span className={`flex shrink-0 rounded-full bg-surface-subtle p-0.5 text-[13px] font-semibold ${className}`}>
      {(['HNL', 'USD'] as ShowCur[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCur(c)}
          aria-pressed={cur === c}
          className={`rounded-full px-3 py-1 leading-none transition ${cur === c ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
        >
          {c === 'HNL' ? 'L' : '$'}
        </button>
      ))}
    </span>
  )
}

// 헤더용 — 모바일(<md) 달력에서만 표시.
export function HeaderCurToggle() {
  const pathname = usePathname() ?? '/accounting'
  return pathname === '/accounting' ? <CurToggle className="mr-1 md:hidden" /> : null
}

// 헤더용 — 달력(/accounting)에서 검색 화면으로(모든 폭, L/$ 토글 왼쪽).
export function HeaderSearchLink() {
  const pathname = usePathname() ?? '/accounting'
  if (pathname !== '/accounting') return null
  return (
    <Link
      href="/accounting/search"
      aria-label="검색"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-subtle hover:text-primary"
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
    </Link>
  )
}
