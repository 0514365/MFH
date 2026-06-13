// MFH-BACK-BUTTON-V2
'use client'

// 세부/편집 화면 → 목록 뒤로가기. 동그라미 배경 아이콘(헤더 캘린더·인사이트 아이콘과 통일).
// router.back() 으로 직전 URL(필터 쿼리 포함)로 정확히 복귀한다.
// 히스토리가 없을 때(상세 URL 직접 진입·북마크·새 탭)는 fallback href 로 이동.
import { useRouter } from 'next/navigation'

export default function BackButton({
  href,
  label = '뒤로',
  variant = 'icon',
}: {
  href: string
  label?: string
  variant?: 'icon' | 'text'
}) {
  const router = useRouter()

  function goBack() {
    // 앱 내 내비게이션으로 진입했으면 직전 URL(필터 쿼리 포함)로 복귀.
    // 히스토리가 없으면(상세 URL 직접 진입·북마크·새 탭) 목록으로 push.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(href)
  }

  // text: 캐럿 + 라벨(상세 상단바용). icon: 동그라미 박스(기본).
  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label}
        className="flex items-center gap-1.5 text-ink transition hover:opacity-70"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.15em]">{label}</span>
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
