// MFH-CARD-INBOX-BANNER-V1
// 기록 탭 상단 '승인대기 N건' 배너 — 카드 문자 수집분이 있을 때만 표시, /accounting/inbox 로 이동. 서버 컴포넌트.
import Link from 'next/link'

export default function InboxBanner({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <Link
      href="/accounting/inbox"
      className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm transition active:scale-[0.99]"
    >
      <span className="text-ink">
        카드 문자 승인대기 <b className="font-display text-accent">{count}</b>건
      </span>
      <span className="text-[12px] font-medium text-muted">확인 →</span>
    </Link>
  )
}
