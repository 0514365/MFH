// MFH-CARD-INBOX-BANNER-V3 — 2027(회계 잔여 a): 홈과 같은 상태 알약 한 줄(연회색 면 · 호박 글자 · →)
// MFH-CARD-INBOX-BANNER-V2 — 반복 기록 승인대기 건수 합산 표시
// MFH-CARD-INBOX-BANNER-V1
// 기록 탭 상단 '승인대기 N건' 배너 — 카드 문자 수집분이 있을 때만 표시, /accounting/inbox 로 이동. 서버 컴포넌트.
import Link from 'next/link'

export default function InboxBanner({ count, recurring = 0 }: { count: number; recurring?: number }) {
  if (count + recurring <= 0) return null
  return (
    <Link
      href="/accounting/inbox"
      className="mb-3 flex items-center justify-between gap-3 rounded-full bg-b27-card px-4 py-2.5 text-[13px] transition active:opacity-80"
    >
      <span className="min-w-0 truncate">
        <span className="font-medium text-b27-wait">
          승인대기 <span className="font-num tabular-nums">{count + recurring}</span>
        </span>
        <span className="ml-1.5 text-b27-muted">
          {[count > 0 ? `카드 ${count}` : '', recurring > 0 ? `반복 ${recurring}` : ''].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-b27-muted" aria-hidden="true">→</span>
    </Link>
  )
}
