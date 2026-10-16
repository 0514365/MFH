'use client'
// MFH-ACCOUNTING-SUMMARY-V5 — 자산 탭 전용(잔액 카드만). 이번달 수입/지출은 달력 홈(CalendarHome)으로 이동.
// MFH-ACCOUNTING-SUMMARY-V4 — 자산/부채/순자산 공시 환율 평가액 기준 · BalanceGroups 에 fx 전달
// 계좌별 잔액(통화·카드 그룹)·자산/부채/순자산. '+ 계좌' → AccountAddForm.
import { useState } from 'react'
import type { AccountBalance, FxInfo } from '@/lib/accounting-types'
import AccountAddForm from './AccountAddForm'
import BalanceGroups, { amtColor, fmtUsd, summarize } from './BalanceGroups'

export default function AccountingSummary({ balances, fx }: { balances: AccountBalance[]; fx?: FxInfo[] }) {
  const { assets, debt, net: netWorth } = summarize(balances)
  const [adding, setAdding] = useState(false)

  return (
    <section className="mb-5">
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
        <BalanceGroups balances={balances} fx={fx} />
        {adding && <AccountAddForm onClose={() => setAdding(false)} />}
      </div>
    </section>
  )
}
