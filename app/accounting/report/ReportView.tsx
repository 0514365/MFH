'use client'
// MFH-ACCOUNTING-REPORT-V1
// 회계 리포트 — 연도 선택 + 항목별 수입/지출 + 후원자별 헌금 + 계좌 잔액. 표시 전용, 집계는 클라이언트(recent·options·balances).
import { useMemo, useState, type ReactNode } from 'react'
import type { AccountBalance, AcctOptions, InoutRow } from '@/lib/notion'

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Row = { name: string; sum: number; count?: number }

function pill(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    active ? 'border-primary bg-primary-soft text-primary' : 'border-line text-faint hover:border-primary'
  }`
}

function Card({
  title,
  right,
  rightColor,
  children,
}: {
  title: string
  right?: string
  rightColor?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-muted">{title}</h2>
        {right && (
          <span className={`font-display text-[13px] font-bold ${rightColor ?? 'text-ink'}`}>{right}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function BarList({ rows, color }: { rows: Row[]; color: string }) {
  if (rows.length === 0) return <p className="py-2 text-center text-xs text-faint">거래 없음</p>
  const max = rows.reduce((m, r) => Math.max(m, r.sum), 0)
  const total = rows.reduce((s, r) => s + r.sum, 0)
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = max > 0 ? (r.sum / max) * 100 : 0
        const share = total > 0 ? (r.sum / total) * 100 : 0
        return (
          <li key={r.name}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-ink">
                {r.name}
                {r.count != null && <span className="ml-1.5 text-[11px] text-faint">{r.count}건</span>}
              </span>
              <span className="font-display font-bold text-ink">
                {fmtUsd(r.sum)}
                <span className="ml-1.5 text-[11px] font-normal text-faint">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function ReportView({
  recent,
  options,
  balances,
}: {
  recent: InoutRow[]
  options: AcctOptions
  balances: AccountBalance[]
}) {
  const thisYear = String(new Date().getFullYear())
  const years = useMemo(() => {
    const set = new Set<string>()
    for (const r of recent) {
      const y = (r.date ?? '').slice(0, 4)
      if (y) set.add(y)
    }
    set.add(thisYear)
    return [...set].sort().reverse()
  }, [recent, thisYear])
  const [year, setYear] = useState(thisYear)

  const itemName = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    return m
  }, [options])
  const supporterName = useMemo(
    () => new Map(options.supporters.map((s) => [s.id, s.name])),
    [options],
  )
  const donationId = useMemo(
    () => options.items['수입'].find((i) => i.name === '후원금')?.id ?? '',
    [options],
  )

  const { incomeRows, expenseRows, supporterRows, incomeTotal, expenseTotal, supporterTotal } =
    useMemo(() => {
      const filtered =
        year === '전체' ? recent : recent.filter((r) => (r.date ?? '').slice(0, 4) === year)
      const inc = new Map<string, number>()
      const exp = new Map<string, number>()
      const sup = new Map<string, { sum: number; count: number }>()
      for (const r of filtered) {
        const amt = r.amountUsd ?? 0
        if (r.gubun === '수입' && r.itemId) inc.set(r.itemId, (inc.get(r.itemId) ?? 0) + amt)
        else if (r.gubun === '지출' && r.itemId) exp.set(r.itemId, (exp.get(r.itemId) ?? 0) + amt)
        if (r.gubun === '수입' && r.itemId === donationId) {
          const key = r.supporterId ?? '__anon__'
          const cur = sup.get(key) ?? { sum: 0, count: 0 }
          cur.sum += amt
          cur.count += 1
          sup.set(key, cur)
        }
      }
      const toRows = (m: Map<string, number>): Row[] =>
        [...m.entries()]
          .map(([id, sum]) => ({ name: itemName.get(id) ?? '(미분류)', sum }))
          .sort((a, b) => b.sum - a.sum)
      const incomeRows = toRows(inc)
      const expenseRows = toRows(exp)
      const supporterRows: Row[] = [...sup.entries()]
        .map(([key, v]) => ({
          name: key === '__anon__' ? '무명·단체' : (supporterName.get(key) ?? '(알수없음)'),
          sum: v.sum,
          count: v.count,
        }))
        .sort((a, b) => b.sum - a.sum)
      return {
        incomeRows,
        expenseRows,
        supporterRows,
        incomeTotal: incomeRows.reduce((s, r) => s + r.sum, 0),
        expenseTotal: expenseRows.reduce((s, r) => s + r.sum, 0),
        supporterTotal: supporterRows.reduce((s, r) => s + r.sum, 0),
      }
    }, [recent, year, itemName, supporterName, donationId])

  const totalAssets = balances.reduce((s, b) => s + b.balanceUsd, 0)

  return (
    <div>
      {/* 연도 셀렉터 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[...years, '전체'].map((y) => (
          <button key={y} type="button" onClick={() => setYear(y)} className={pill(year === y)}>
            {y === '전체' ? '전체' : `${y}년`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <Card title="항목별 수입" right={fmtUsd(incomeTotal)} rightColor="text-emerald-700">
          <BarList rows={incomeRows} color="#059669" />
        </Card>
        <Card title="항목별 지출" right={fmtUsd(expenseTotal)} rightColor="text-red-700">
          <BarList rows={expenseRows} color="#dc2626" />
        </Card>
        <Card title="후원자별 헌금" right={fmtUsd(supporterTotal)} rightColor="text-ink">
          <BarList rows={supporterRows} color="var(--primary)" />
        </Card>
        <Card title="계좌 잔액" right={`총 ${fmtUsd(totalAssets)}`} rightColor="text-ink">
          {balances.length === 0 ? (
            <p className="py-2 text-center text-xs text-faint">계좌 없음</p>
          ) : (
            <ul className="space-y-1.5">
              {balances.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {b.name}
                    {b.currency ? (
                      <span className="ml-1.5 text-[11px] text-faint">{b.currency}</span>
                    ) : (
                      ''
                    )}
                  </span>
                  <span className="font-display font-bold text-ink">{fmtUsd(b.balanceUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
