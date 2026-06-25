'use client'
// MFH-ACCOUNTING-SUMMARY-V1
// 메인 요약 — 이번달 수입/지출/순액(브라우저 로컬월 기준) + 계좌별 잔액·총자산(자산 DB `잔액(USD)` read).
// 표시 전용. 데이터는 page.tsx 가 노션에서 read 후 전달.
import { useMemo } from 'react'
import type { AccountBalance, InoutRow } from '@/lib/notion'

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AccountingSummary({
  recent,
  balances,
}: {
  recent: InoutRow[]
  balances: AccountBalance[]
}) {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

  const { income, expense } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const r of recent) {
      if ((r.date ?? '').slice(0, 7) !== ym) continue
      if (r.gubun === '수입') income += r.amountUsd ?? 0
      else if (r.gubun === '지출') expense += r.amountUsd ?? 0
    }
    return { income, expense }
  }, [recent, ym])
  const net = income - expense
  const total = balances.reduce((s, b) => s + b.balanceUsd, 0)

  return (
    <section className="mb-5 grid gap-3 md:grid-cols-2">
      {/* 이번달 */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            This month
          </span>
          <span className="text-[11px] text-faint">{monthLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[11px] text-faint">수입</div>
            <div className="font-display text-[15px] font-bold text-emerald-700">{fmtUsd(income)}</div>
          </div>
          <div>
            <div className="text-[11px] text-faint">지출</div>
            <div className="font-display text-[15px] font-bold text-red-700">{fmtUsd(expense)}</div>
          </div>
          <div>
            <div className="text-[11px] text-faint">순액</div>
            <div className={`font-display text-[15px] font-bold ${net >= 0 ? 'text-ink' : 'text-red-700'}`}>
              {fmtUsd(net)}
            </div>
          </div>
        </div>
      </div>

      {/* 계좌 잔액 */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            Balances
          </span>
          <span className="text-[11px] text-faint">
            총자산 <b className="font-display text-ink">{fmtUsd(total)}</b>
          </span>
        </div>
        {balances.length === 0 ? (
          <p className="py-2 text-center text-xs text-faint">계좌 정보 없음</p>
        ) : (
          <ul className="space-y-1.5">
            {balances.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {b.name}
                  {b.currency ? <span className="ml-1.5 text-[11px] text-faint">{b.currency}</span> : ''}
                </span>
                <span className="font-display font-bold text-ink">{fmtUsd(b.balanceUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
