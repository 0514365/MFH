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

type CatGroup = { category: string; sum: number; subs: Row[] }

// 대분류 소계(막대·비중) → 소분류 상세(들여쓰기). 소분류가 1개뿐이면 상세 생략(중복).
function CategoryBarList({ groups, color }: { groups: CatGroup[]; color: string }) {
  if (groups.length === 0) return <p className="py-2 text-center text-xs text-faint">거래 없음</p>
  const max = groups.reduce((m, g) => Math.max(m, g.sum), 0)
  const total = groups.reduce((s, g) => s + g.sum, 0)
  return (
    <ul className="space-y-3">
      {groups.map((g) => {
        const pct = max > 0 ? (g.sum / max) * 100 : 0
        const share = total > 0 ? (g.sum / total) * 100 : 0
        return (
          <li key={g.category}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{g.category}</span>
              <span className="font-display font-bold text-ink">
                {fmtUsd(g.sum)}
                <span className="ml-1.5 text-[11px] font-normal text-faint">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            {g.subs.length > 1 && (
              <ul className="ml-3 mt-1.5 space-y-1 border-l border-line pl-3">
                {g.subs.map((s) => (
                  <li key={s.name} className="flex items-baseline justify-between text-xs">
                    <span className="text-muted">{s.name}</span>
                    <span className="font-display text-muted">{fmtUsd(s.sum)}</span>
                  </li>
                ))}
              </ul>
            )}
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
  const catOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']])
      if (i.category) m.set(i.id, i.category)
    return m
  }, [options])
  const supporterName = useMemo(
    () => new Map(options.supporters.map((s) => [s.id, s.name])),
    [options],
  )

  const { incomeGroups, expenseGroups, supporterRows, incomeTotal, expenseTotal, supporterTotal } =
    useMemo(() => {
      const filtered =
        year === '전체' ? recent : recent.filter((r) => (r.date ?? '').slice(0, 4) === year)
      type Acc = Map<string, { sum: number; subs: Map<string, number> }>
      const inc: Acc = new Map()
      const exp: Acc = new Map()
      const sup = new Map<string, { sum: number; count: number }>()
      const add = (acc: Acc, itemId: string, amt: number) => {
        const cat = catOf.get(itemId) || '기타'
        const g = acc.get(cat) ?? { sum: 0, subs: new Map<string, number>() }
        g.sum += amt
        g.subs.set(itemId, (g.subs.get(itemId) ?? 0) + amt)
        acc.set(cat, g)
      }
      for (const r of filtered) {
        const amt = r.amountUsd ?? 0
        if (r.gubun === '수입' && r.itemId) add(inc, r.itemId, amt)
        else if (r.gubun === '지출' && r.itemId) add(exp, r.itemId, amt)
        if (r.gubun === '수입' && r.itemId && catOf.get(r.itemId) === '후원') {
          const key = r.supporterId ?? '__anon__'
          const cur = sup.get(key) ?? { sum: 0, count: 0 }
          cur.sum += amt
          cur.count += 1
          sup.set(key, cur)
        }
      }
      const toGroups = (acc: Acc): CatGroup[] =>
        [...acc.entries()]
          .map(([category, { sum, subs }]) => ({
            category,
            sum,
            subs: [...subs.entries()]
              .map(([id, s]) => ({ name: itemName.get(id) ?? '(미분류)', sum: s }))
              .sort((a, b) => b.sum - a.sum),
          }))
          .sort((a, b) => b.sum - a.sum)
      const incomeGroups = toGroups(inc)
      const expenseGroups = toGroups(exp)
      const supporterRows: Row[] = [...sup.entries()]
        .map(([key, v]) => ({
          name: key === '__anon__' ? '무명·단체' : (supporterName.get(key) ?? '(알수없음)'),
          sum: v.sum,
          count: v.count,
        }))
        .sort((a, b) => b.sum - a.sum)
      return {
        incomeGroups,
        expenseGroups,
        supporterRows,
        incomeTotal: incomeGroups.reduce((s, g) => s + g.sum, 0),
        expenseTotal: expenseGroups.reduce((s, g) => s + g.sum, 0),
        supporterTotal: supporterRows.reduce((s, r) => s + r.sum, 0),
      }
    }, [recent, year, itemName, catOf, supporterName])

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
        <Card title="대분류별 수입" right={fmtUsd(incomeTotal)} rightColor="text-emerald-700">
          <CategoryBarList groups={incomeGroups} color="#059669" />
        </Card>
        <Card title="대분류별 지출" right={fmtUsd(expenseTotal)} rightColor="text-red-700">
          <CategoryBarList groups={expenseGroups} color="#dc2626" />
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
