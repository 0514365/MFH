// MFH-BACK-BUTTON-V4 — 2027 셸(2단계): 뒤로 화살표 = 빨강(b27-expense, 회계와 동일) · 원형/상자 테두리 제거(44 터치) · chip = 연회색 알약 · 라벨 Manrope 600 남색.
// MFH-BACK-BUTTON-V3
'use client'

// 세부/편집 화면 → 상위 화면(목록·상세) 이동.
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

  // icon-accent: 빨간 캐럿 아이콘만 — 강조 + 폭 절약.
  if (variant === 'icon-accent') {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label || '뒤로'}
        className="-ml-2 inline-flex h-11 w-11 items-center justify-center text-b27-expense transition active:opacity-70"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    )
  }

  // chip: 연회색 알약(빨간 ‹ + 라벨). text: 캐럿 + 라벨. icon: 동그라미 박스(기본).
  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label || '뒤로'}
        className="inline-flex items-center gap-0.5 rounded-full bg-b27-card py-1.5 pl-2 pr-3 text-[13px] font-medium text-b27-ink transition active:opacity-70"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-b27-expense">
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
        className="-ml-2 flex h-11 min-w-11 items-center justify-center gap-1 px-1 text-b27-ink transition active:opacity-70"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-b27-expense">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {label ? (
          <span className="font-num text-[17px] font-semibold">{label}</span>
        ) : null}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className="-ml-2 mb-2 inline-flex h-11 w-11 items-center justify-center text-b27-expense transition active:opacity-70"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}
