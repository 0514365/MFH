// MFH-DONATION-PANEL-V4
// 헌금 이력 — 읽기전용, 노션 회계(SoT) 연도별 합산. 입력·관리 SoT 는 노션.
// 개별 거래 목록은 노션으로 이전 → 앱은 연도별 합산만 표시(초기 Supabase 기록 숨김).
import { formatUsd } from '@/lib/supporters'
import type { DonationYearly } from '@/lib/notion'

// 입금 총액은 실제 입금 통화로 표기 — 기호 + 천단위(소수 최대 2).
const CUR_SYMBOL: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
function fmtCur(cur: string, n: number): string {
  return `${CUR_SYMBOL[cur] ?? ''}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export default function DonationPanel({ yearly }: { yearly?: DonationYearly | null }) {
  const total = yearly?.total ?? 0
  const years = yearly?.years ?? []
  const byCurrency = yearly?.byCurrency ?? []
  // USD 단일이면 환산 표기가 중복 → 생략.
  const showConverted =
    byCurrency.length > 0 && !(byCurrency.length === 1 && byCurrency[0].currency === 'USD')

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
            입금 총액
          </div>
          {byCurrency.length > 0 ? (
            <div className="font-display text-[16px] font-bold leading-tight text-ink">
              {byCurrency.map((c) => (
                <div key={c.currency}>{fmtCur(c.currency, c.sum)}</div>
              ))}
            </div>
          ) : (
            <div className="font-display text-[16px] font-bold text-ink">{formatUsd(total)}</div>
          )}
          {showConverted && (
            <div className="mt-0.5 text-[11px] font-medium text-faint">환산 {formatUsd(total)}</div>
          )}
        </div>
      </div>

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
