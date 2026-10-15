// MFH-CARD-INBOX-BANNER-V2 — 반복 기록 승인대기 건수 합산 표시
// MFH-CARD-INBOX-BANNER-V1
// 기록 탭 상단 '승인대기 N건' 배너 — 카드 문자 수집분이 있을 때만 표시, /accounting/inbox 로 이동. 서버 컴포넌트.
import Link from 'next/link'

export default function InboxBanner({ count, recurring = 0 }: { count: number; recurring?: number }) {
  if (count + recurring <= 0) return null
  return (
    <Link
      href="/accounting/inbox"
      className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm transition active:scale-[0.99]"
    >
      <span className="text-ink">
        {count > 0 && (
          <>
            카드 문자 승인대기 <b className="font-display text-accent">{count}</b>건
          </>
        )}
        {count > 0 && recurring > 0 && <span className="mx-1.5 text-faint">·</span>}
        {recurring > 0 && (
          <>
            반복 기록 <b className="font-display text-accent">{recurring}</b>건
          </>
        )}
      </span>
      <span className="text-[12px] font-medium text-muted">확인 →</span>
    </Link>
  )
}
