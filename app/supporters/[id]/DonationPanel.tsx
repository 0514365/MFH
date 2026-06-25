// MFH-DONATION-PANEL-V3
// 헌금 이력 — 읽기전용. 헌금 입력/관리 SoT 는 노션 회계로 이전(A방향).
// Total(USD): 노션 헌금합계(notionTotal) 우선, 미연동 시 앱 기록 합계로 폴백.
// 개별 목록은 앱 잔존 기록(참고용). 추가/수정/삭제 없음.
import type { SupporterDonation, DonationType } from '@/lib/types'
import { DONATION_TYPE_LABEL, donationTotalUsd, formatMoney, formatUsd } from '@/lib/supporters'

const METHOD_LABEL: Record<string, string> = {
  transfer: '이체',
  cash: '현금',
  other: '기타',
}
function methodLabel(v?: string | null): string {
  if (!v) return ''
  return METHOD_LABEL[v] ?? v
}

export default function DonationPanel({
  donations,
  notionTotal,
}: {
  donations: SupporterDonation[]
  notionTotal?: number | null
}) {
  const total = notionTotal != null ? notionTotal : donationTotalUsd(donations)
  const usingNotion = notionTotal != null

  return (
    <section className="border-t border-line px-5 py-7">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            Donations
          </div>
          <h2 className="text-[17px] font-bold tracking-tight text-ink">헌금 이력</h2>
        </div>
        <div className="text-right">
          <div className="font-display text-[8px] font-bold uppercase tracking-[0.15em] text-faint">
            Total (USD)
          </div>
          <div className="font-display text-[16px] font-bold text-ink">{formatUsd(total)}</div>
        </div>
      </div>

      <p className="mb-4 rounded-xl border border-line bg-surface-subtle px-3 py-2.5 text-xs leading-relaxed text-muted">
        {usingNotion
          ? '합계는 노션 회계 기준입니다. 아래는 앱에 남은 과거 내역입니다.'
          : '헌금 입력·관리는 노션 회계로 이전되었습니다. 아래는 앱에 기록된 내역입니다.'}
      </p>

      {donations.length === 0 ? (
        <p className="py-4 text-center text-xs text-faint">헌금 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {donations.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[13px] font-bold text-ink">
                    {formatUsd(d.amount_usd)}
                  </span>
                  {d.currency === 'KRW' && (
                    <span className="text-[11px] text-muted">({formatMoney(d.amount, 'KRW')})</span>
                  )}
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
                    {DONATION_TYPE_LABEL[d.donation_type as DonationType] ?? d.donation_type}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {d.donation_date}
                  {d.purpose ? ` · ${d.purpose}` : ''}
                  {d.method ? ` · ${methodLabel(d.method)}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
