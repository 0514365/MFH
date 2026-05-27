// MFH-BACK-BUTTON-V1
// 세부/편집 화면 → 목록 뒤로가기. 동그라미 배경 아이콘(헤더 캘린더·인사이트 아이콘과 통일).
import Link from 'next/link'

export default function BackButton({ href, label = '뒤로' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-primary"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </Link>
  )
}
