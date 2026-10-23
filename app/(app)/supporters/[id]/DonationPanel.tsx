// MFH-DONATION-PANEL-V5 — 2027(4-7): theme-2027 · 남색 글자 · 연회색/살구 면 · 강조 = 진한 살구 · 굵기 600 이하.
// MFH-DONATION-PANEL-V4
// 헌금 이력 — 읽기전용, 장부(acct_inout) 연도별 합산. 입력·관리는 회계 모듈.
// 개별 거래 목록은 회계 내역 탭 → 여기서는 연도별 합산만 표시.
import { formatUsd } from '@/lib/supporters'
import type { DonationYearly } from '@/lib/accounting-types'

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
    <section className="border-t border-b27-line px-5 py-7">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="mb-2 font-num text-[12px] font-medium text-b27-muted">헌금 이력</div>
          <h2 className="text-[17px] font-semibold tracking-tight text-b27-ink">헌금 이력</h2>
        </div>
        <div className="text-right">
          <div className="font-num text-[8px] font-semibold  text-b27-muted">
            입금 총액
          </div>
          {byCurrency.length > 0 ? (
            <div className="font-num text-[16px] font-semibold leading-tight text-b27-ink">
              {byCurrency.map((c) => (
                <div key={c.currency}>{fmtCur(c.currency, c.sum)}</div>
              ))}
            </div>
          ) : (
            <div className="font-num text-[16px] font-semibold text-b27-ink">{formatUsd(total)}</div>
          )}
          {showConverted && (
            <div className="mt-0.5 text-[11px] font-medium text-b27-muted">환산 {formatUsd(total)}</div>
          )}
        </div>
      </div>

      {years.length === 0 ? (
        <p className="py-4 text-center text-xs text-b27-muted">헌금 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {years.map((y) => (
            <li
              key={y.year}
              className="flex items-center justify-between rounded-xl bg-b27-tint-3 px-4 py-3"
            >
              <span className="font-num text-[14px] font-semibold text-b27-ink">{y.year}</span>
              <span className="font-num text-[14px] font-semibold text-b27-ink">{formatUsd(y.sum)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
