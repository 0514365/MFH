'use client'
// MFH-ACCOUNTING-SUMMARY-V3 — 잔액 그룹(BalanceGroups) · 자산/부채/순자산 헤더 · 양수 청색/음수 적색
// 메인 요약 — 이번달 수입/지출/순액(브라우저 로컬월 기준) + 계좌별 잔액(통화·카드 그룹)·자산/부채/순자산.
// 데이터는 page.tsx 가 장부에서 read 후 전달. Balances 카드 '+ 계좌' → AccountAddForm(노션 자산 DB 에 계좌 추가).
import { useMemo, useState } from 'react'
import type { AccountBalance, InoutRow } from '@/lib/accounting-types'
import AccountAddForm from './AccountAddForm'
import BalanceGroups, { amtColor, fmtUsd, summarize } from './BalanceGroups'


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
  const { assets, debt, net: netWorth } = summarize(balances)
  const [adding, setAdding] = useState(false)

  return (
    <section className="mb-5 grid gap-3 @2xl:grid-cols-2">
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
          <div className="flex items-center gap-2">
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted transition hover:border-primary hover:text-primary"
              >
                + 계좌
              </button>
            )}
          </div>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl border border-line px-3 py-2">
          <div>
            <div className="text-[11px] text-faint">자산</div>
            <div className={`font-display text-[14px] font-bold ${amtColor(assets)}`}>{fmtUsd(assets)}</div>
          </div>
          <div>
            <div className="text-[11px] text-faint">부채</div>
            <div className={`font-display text-[14px] font-bold ${amtColor(debt)}`}>{fmtUsd(debt)}</div>
          </div>
          <div>
            <div className="text-[11px] text-faint">순자산</div>
            <div className={`font-display text-[14px] font-bold ${amtColor(netWorth)}`}>{fmtUsd(netWorth)}</div>
          </div>
        </div>
        <BalanceGroups balances={balances} />
        {adding && <AccountAddForm onClose={() => setAdding(false)} />}
      </div>
    </section>
  )
}
