// MFH-BACK-BUTTON-V3
'use client'

// 세부/편집 화면 → 상위 화면(목록·상세) 이동. 동그라미 배경 아이콘(헤더 캘린더·인사이트 아이콘과 통일).
// 항상 href 로 push 한다 — router.back() 은 편집 저장 후·이전/다음 이동 후에 직전 화면(편집 폼·이전 항목)으로
// 되돌아가 "상위로 나가기" 와 어긋났다. 목록 필터를 유지하려면 호출부가 href 에 쿼리를 붙인다.
import { useRouter } from 'next/navigation'

export default function BackButton({
  href,
  label = '뒤로',
  variant = 'icon',
}: {
  href: string
  label?: string
  variant?: 'icon' | 'text' | 'chip' | 'icon-accent'
}) {
  const router = useRouter()

  function goBack() {
    router.push(href)
  }

  // icon-accent: 마룬 캐럿 아이콘만(연마룬 원형) — 강조 + 폭 절약.
  if (variant === 'icon-accent') {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label || '뒤로'}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:opacity-80"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    )
  }

  // chip: 아웃라인 알약(‹ + 라벨). text: 캐럿 + 라벨. icon: 동그라미 박스(기본).
  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label || '뒤로'}
        className="inline-flex items-center gap-0.5 rounded-full border border-line py-1.5 pl-2 pr-3 text-[12px] font-medium text-ink transition hover:border-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {label}
      </button>
    )
  }

  // text: 캐럿 + 라벨(상세 상단바용). icon: 동그라미 박스(기본).
  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label || '뒤로'}
        className="-ml-1 flex items-center gap-1 px-1 py-1.5 text-ink transition hover:opacity-70"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {label ? (
          <span className="font-display text-[17px] font-extrabold uppercase tracking-[0.1em]">{label}</span>
        ) : null}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-primary"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  )
}
