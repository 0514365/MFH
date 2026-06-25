// MFH-DONATION-PANEL-V4
// 헌금 이력 — 읽기전용, 노션 회계(SoT) 연도별 합산. 입력·관리 SoT 는 노션.
// 개별 거래 목록은 노션으로 이전 → 앱은 연도별 합산만 표시(초기 Supabase 기록 숨김).
import { formatUsd } from '@/lib/supporters'
import type { DonationYearly } from '@/lib/notion'

export default function DonationPanel({ yearly }: { yearly?: DonationYearly | null }) {
  const total = yearly?.total ?? 0
  const years = yearly?.years ?? []

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
        헌금 입력·관리는 노션 회계로 이전되었습니다. 합계는 노션 기준 연도별 집계입니다.
      </p>

      {years.length === 0 ? (
        <p className="py-4 text-center text-xs text-faint">헌금 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {years.map((y) => (
            <li
              key={y.year}
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
            >
              <span className="font-display text-[14px] font-bold text-ink">{y.year}</span>
              <span className="font-display text-[14px] font-bold text-ink">{formatUsd(y.sum)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
