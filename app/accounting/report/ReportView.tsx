'use client'
// MFH-ACCOUNTING-REPORT-V2
// 회계 분석 — 연도 선택 + 월별(연도별) 수입/지출 추이(경량 SVG) + 대분류별 수입/지출 + 후원자별 헌금 + 계좌 잔액.
// 표시 전용, 집계는 클라이언트(recent·options·balances). 차트는 의존성 없이 직접 SVG.
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

type TrendBucket = { label: string; income: number; expense: number }

// 월별(또는 연도별) 수입·지출 추이 — 의존성 없는 경량 SVG 그룹 막대(수입 emerald · 지출 red).
function TrendChart({ buckets }: { buckets: TrendBucket[] }) {
  const hasData = buckets.some((b) => b.income > 0 || b.expense > 0)
  if (!hasData) return <p className="py-6 text-center text-xs text-faint">거래 없음</p>
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.expense)))
  const n = buckets.length
  const groupW = 34
  const W = n * groupW
  const H = 150
  const padT = 10
  const padB = 24
  const chartH = H - padT - padB
  const base = padT + chartH
  const barW = 12
  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="월별 수입·지출 추이"
        >
          <line x1={0} y1={base} x2={W} y2={base} stroke="var(--line)" strokeWidth={1} />
          {buckets.map((b, i) => {
            const cx = i * groupW + groupW / 2
            const ih = (b.income / max) * chartH
            const eh = (b.expense / max) * chartH
            return (
              <g key={b.label}>
                <rect
                  x={cx - barW - 1}
                  y={base - ih}
                  width={barW}
                  height={ih}
                  rx={2}
                  fill="#059669"
                />
                <rect x={cx + 1} y={base - eh} width={barW} height={eh} rx={2} fill="#dc2626" />
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--text-faint)">
                  {b.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-faint">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#059669' }} />
          수입
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#dc2626' }} />
          지출
        </span>
      </div>
    </div>
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

  // 추이 — 연도 선택 시 1~12월, '전체'면 연도별. 수입·지출 USD 합.
  const trend = useMemo<TrendBucket[]>(() => {
    if (year === '전체') {
      const m = new Map<string, { income: number; expense: number }>()
      for (const r of recent) {
        const y = (r.date ?? '').slice(0, 4)
        if (!y) continue
        const g = m.get(y) ?? { income: 0, expense: 0 }
        if (r.gubun === '수입') g.income += r.amountUsd ?? 0
        else if (r.gubun === '지출') g.expense += r.amountUsd ?? 0
        m.set(y, g)
      }
      return [...m.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([y, v]) => ({ label: `'${y.slice(2)}`, ...v }))
    }
    const arr: TrendBucket[] = Array.from({ length: 12 }, (_, i) => ({
      label: String(i + 1),
      income: 0,
      expense: 0,
    }))
    for (const r of recent) {
      const d = r.date ?? ''
      if (d.slice(0, 4) !== year) continue
      const mi = Number(d.slice(5, 7)) - 1
      if (mi < 0 || mi > 11) continue
      if (r.gubun === '수입') arr[mi].income += r.amountUsd ?? 0
      else if (r.gubun === '지출') arr[mi].expense += r.amountUsd ?? 0
    }
    return arr
  }, [recent, year])

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
        <Card
          title={year === '전체' ? '연도별 추이' : '월별 추이'}
          right={`순 ${fmtUsd(incomeTotal - expenseTotal)}`}
          rightColor={incomeTotal - expenseTotal >= 0 ? 'text-ink' : 'text-red-700'}
        >
          <TrendChart buckets={trend} />
        </Card>
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
