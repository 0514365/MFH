'use client'
// MFH-ACCOUNTING-REPORT-V5 — 계좌 잔액에 공시 환율(fx) 전달
// MFH-ACCOUNTING-REPORT-V4 — b단계: 도넛 항목 클릭 → 내역 탭 필터 딥링크 · 후원자 클릭 → 후원자 상세
// MFH-ACCOUNTING-REPORT-V3 — KPI 타일 · 추이 hover 툴팁 + 월 클릭 필터 · 수입/지출 도넛(대분류 → 항목 drill-down) · 후원자 Top · 계좌 잔액
// MFH-ACCOUNTING-REPORT-V2
// 회계 분석 — 연도 선택(+월 선택) 기준으로 집계. 표시 전용, 집계는 클라이언트(recent·options·balances). 차트는 ./charts.tsx(의존성 0 SVG).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, FxInfo, AcctOptions, InoutRow } from '@/lib/accounting-types'
import BalanceGroups, { amtColor, summarize } from '../BalanceGroups'
import { Card, Donut, KpiTiles, TrendChart, fmtUsd, foldSlices, type Kpi, type Slice, type TrendBucket } from './charts'

type Row = { name: string; sum: number; count?: number; href?: string }

// 후원자 Top N — 가로 막대(비중) + hover 툴팁은 title 로.
function BarList({ rows, color, topN = 10, onGo }: { rows: Row[]; color: string; topN?: number; onGo?: (href: string) => void }) {
  if (rows.length === 0) return <p className="py-2 text-center text-xs text-faint">거래 없음</p>
  const total = rows.reduce((s, r) => s + r.sum, 0)
  const head = rows.slice(0, topN)
  const rest = rows.slice(topN)
  const max = head[0]?.sum ?? 0
  return (
    <ul className="space-y-2">
      {head.map((r) => {
        const pct = max > 0 ? (r.sum / max) * 100 : 0
        const share = total > 0 ? (r.sum / total) * 100 : 0
        return (
          <li
            key={r.name}
            title={`${r.name} · ${fmtUsd(r.sum)} · ${share.toFixed(1)}%${r.count != null ? ` · ${r.count}건` : ''}${r.href ? ' · 클릭 = 후원자 상세' : ''}`}
            onClick={() => r.href && onGo?.(r.href)}
            className={`rounded-lg px-1 py-0.5 transition ${r.href ? 'cursor-pointer hover:bg-surface-subtle' : ''}`}
          >
            <div className="mb-0.5 flex items-baseline justify-between text-[13px]">
              <span className="truncate text-ink">
                {r.name}
                {r.count != null && <span className="ml-1.5 text-[11px] text-faint">{r.count}건</span>}
              </span>
              <span className="shrink-0 font-display font-bold text-ink">
                {fmtUsd(r.sum)}
                <span className="ml-1.5 inline-block w-9 text-right text-[11px] font-normal text-faint">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        )
      })}
      {rest.length > 0 && (
        <li className="flex items-baseline justify-between pt-1 text-[12px] text-faint">
          <span>그 외 {rest.length}명</span>
          <span className="font-display">{fmtUsd(rest.reduce((s, r) => s + r.sum, 0))}</span>
        </li>
      )}
    </ul>
  )
}

// 도넛 블록 — 1단계 대분류 → 클릭 시 2단계 항목(상위 6 + 기타). 제목 옆 breadcrumb·뒤로.
function DonutBlock({
  title,
  groups,
  total,
  color,
  onItem,
}: {
  title: string
  groups: Map<string, { sum: number; subs: Map<string, { name: string; sum: number; count: number }> }>
  total: number
  color: string
  onItem?: (cat: string, itemId: string) => void // 2단계 항목 클릭 → 내역 탭
}) {
  const [drill, setDrill] = useState<string | null>(null)
  const level1: Slice[] = [...groups.entries()].map(([cat, g]) => ({ key: cat, name: cat, sum: g.sum, count: [...g.subs.values()].reduce((s, x) => s + x.count, 0) }))
  const sub = drill ? groups.get(drill) : null
  const level2: Slice[] = sub ? [...sub.subs.entries()].map(([id, x]) => ({ key: id, name: x.name, sum: x.sum, count: x.count })) : []
  const slices = sub ? foldSlices(level2) : foldSlices(level1)
  const shown = sub ? sub.sum : total
  // 범위가 바뀌어 drill 대분류가 사라지면 1단계로.
  useEffect(() => {
    if (drill && !groups.has(drill)) setDrill(null)
  }, [drill, groups])
  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          {drill ? (
            <>
              <button type="button" onClick={() => setDrill(null)} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted hover:border-primary hover:text-primary">
                ‹ {title}
              </button>
              <span className="text-ink">{drill}</span>
              <span className="text-[11px] font-normal text-faint">· 항목 클릭 = 내역</span>
            </>
          ) : (
            <>
              {title}
              <span className="text-[11px] font-normal text-faint">· 조각 클릭 = 항목별</span>
            </>
          )}
        </span>
      }
      right={fmtUsd(shown)}
      rightColor={color}
    >
      <Donut
        slices={slices}
        total={shown}
        centerLabel={drill ?? title}
        onPick={drill ? (s) => onItem?.(drill, s.key) : (s) => setDrill(s.key)}
      />
    </Card>
  )
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

export default function ReportView({
  recent,
  options,
  balances,
  fx,
}: {
  recent: InoutRow[]
  options: AcctOptions
  balances: AccountBalance[]
  fx?: FxInfo[]
}) {
  const router = useRouter()
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
  const [month, setMonth] = useState<string | null>(null) // 'YYYY-MM' (추이 막대 클릭)

  const itemName = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    return m
  }, [options])
  const catOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) if (i.category) m.set(i.id, i.category)
    return m
  }, [options])
  const supporterName = useMemo(() => new Map(options.supporters.map((s) => [s.id, s.name])), [options])

  // 기간 합계(수입·지출) — 연도/월/전체 키로.
  const sumOf = (rows: InoutRow[]) => {
    let income = 0
    let expense = 0
    for (const r of rows) {
      if (r.gubun === '수입') income += r.amountUsd ?? 0
      else if (r.gubun === '지출') expense += r.amountUsd ?? 0
    }
    return { income, expense }
  }
  const inYear = (r: InoutRow, y: string) => (r.date ?? '').slice(0, 4) === y
  const inMonth = (r: InoutRow, ym: string) => (r.date ?? '').slice(0, 7) === ym

  // 추이 — 연도 선택 시 1~12월, '전체'면 연도별.
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
      return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([y, v]) => ({ key: y, label: `'${y.slice(2)}`, ...v }))
    }
    return MONTHS.map((mm) => ({ key: `${year}-${mm}`, label: String(Number(mm)), ...sumOf(recent.filter((r) => inMonth(r, `${year}-${mm}`))) }))
  }, [recent, year])

  // 선택 범위의 거래 — 연도(+월) 또는 전체(+연도 막대 클릭).
  const scoped = useMemo(() => {
    if (month) return recent.filter((r) => (year === '전체' ? inYear(r, month) : inMonth(r, month)))
    return year === '전체' ? recent : recent.filter((r) => inYear(r, year))
  }, [recent, year, month])
  const scopeLabel = month ? (year === '전체' ? `${month}년` : `${year}년 ${Number(month.slice(5))}월`) : year === '전체' ? '전체 기간' : `${year}년`

  // KPI + 직전 기간 대비
  const kpis = useMemo<Kpi[]>(() => {
    const cur = sumOf(scoped)
    let prev: { income: number; expense: number } | null = null
    let prevLabel = ''
    if (month && year !== '전체') {
      const [y, m] = month.split('-').map(Number)
      const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
      prev = sumOf(recent.filter((r) => inMonth(r, pm)))
      prevLabel = '전월'
    } else if (year !== '전체' || month) {
      const y = String(Number(month ?? year) - 1)
      prev = sumOf(recent.filter((r) => inYear(r, y)))
      prevLabel = '전년'
    }
    const delta = (c: number, p: number | undefined, goodWhenUp: boolean): Kpi['delta'] => {
      if (p == null) return undefined
      if (p === 0) return c === 0 ? { text: `${prevLabel} 동일`, good: null } : { text: `${prevLabel} 없음`, good: null }
      const pct = ((c - p) / p) * 100
      const sign = pct > 0 ? '+' : ''
      return { text: `${prevLabel} 대비 ${sign}${pct.toFixed(0)}%`, good: pct === 0 ? null : goodWhenUp ? pct > 0 : pct < 0 }
    }
    const net = cur.income - cur.expense
    const minExp = scoped.filter((r) => r.gubun === '지출' && r.itemId && catOf.get(r.itemId) === '사역비').reduce((s, r) => s + (r.amountUsd ?? 0), 0)
    const share = cur.expense > 0 ? (minExp / cur.expense) * 100 : 0
    return [
      { label: '수입', value: fmtUsd(cur.income), color: 'text-blue-700', delta: delta(cur.income, prev?.income, true) },
      { label: '지출', value: fmtUsd(cur.expense), color: 'text-red-700', delta: delta(cur.expense, prev?.expense, false) },
      { label: '순액', value: fmtUsd(net), color: net >= 0 ? 'text-ink' : 'text-red-700', delta: prev ? delta(net, prev.income - prev.expense, true) : undefined },
      { label: '사역비 비중', value: cur.expense > 0 ? `${share.toFixed(0)}%` : '—', delta: cur.expense > 0 ? { text: `지출 중 사역비 ${fmtUsd(minExp)}`, good: null } : undefined },
    ]
  }, [scoped, recent, year, month, catOf])

  // 대분류 → 항목 집계(도넛용) + 후원자
  const { incomeGroups, expenseGroups, supporterRows, incomeTotal, expenseTotal, supporterTotal } = useMemo(() => {
    type Acc = Map<string, { sum: number; subs: Map<string, { name: string; sum: number; count: number }> }>
    const inc: Acc = new Map()
    const exp: Acc = new Map()
    const sup = new Map<string, { sum: number; count: number }>()
    const add = (acc: Acc, itemId: string, amt: number) => {
      const cat = catOf.get(itemId) || '기타'
      const g = acc.get(cat) ?? { sum: 0, subs: new Map() }
      g.sum += amt
      const s = g.subs.get(itemId) ?? { name: itemName.get(itemId) ?? '(미분류)', sum: 0, count: 0 }
      s.sum += amt
      s.count += 1
      g.subs.set(itemId, s)
      acc.set(cat, g)
    }
    for (const r of scoped) {
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
    const sortMap = (acc: Acc): Acc => new Map([...acc.entries()].sort((a, b) => b[1].sum - a[1].sum))
    const supporterRows: Row[] = [...sup.entries()]
      .map(([key, v]) => ({
        name: key === '__anon__' ? '무명·단체' : (supporterName.get(key) ?? '(알수없음)'),
        sum: v.sum,
        count: v.count,
        href: key !== '__anon__' && supporterName.has(key) ? `/supporters/${key}` : undefined,
      }))
      .sort((a, b) => b.sum - a.sum)
    const total = (acc: Acc) => [...acc.values()].reduce((s, g) => s + g.sum, 0)
    return {
      incomeGroups: sortMap(inc),
      expenseGroups: sortMap(exp),
      supporterRows,
      incomeTotal: total(inc),
      expenseTotal: total(exp),
      supporterTotal: supporterRows.reduce((s, r) => s + r.sum, 0),
    }
  }, [scoped, itemName, catOf, supporterName])

  const { net: netAssets } = summarize(balances)

  // 내역 탭 딥링크 — 현재 범위(연도/월)를 기간으로.
  const period = useMemo(() => {
    const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate()
    if (month && year !== '전체') return { from: `${month}-01`, to: `${month}-${String(lastDay(Number(month.slice(0, 4)), Number(month.slice(5)))).padStart(2, '0')}` }
    const y = month ?? (year === '전체' ? null : year)
    return y ? { from: `${y}-01-01`, to: `${y}-12-31` } : {}
  }, [year, month])
  const goLedger = (gubun: '수입' | '지출', cat: string, itemId: string) => {
    const q = new URLSearchParams({ gubun, cat, item: itemId })
    if (period.from) q.set('from', period.from)
    if (period.to) q.set('to', period.to)
    router.push(`/accounting/ledger?${q.toString()}`)
  }

  return (
    <div>
      {/* 연도 셀렉터 — 드롭다운 */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <label className="text-[11px] text-faint">기간</label>
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setMonth(null)
          }}
          className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink outline-none transition focus:border-primary"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
          <option value="전체">전체 기간</option>
        </select>
      </div>

      <div className="space-y-4">
        {/* 선택 범위 + KPI */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] font-bold text-ink">{scopeLabel}</span>
          {month && (
            <button type="button" onClick={() => setMonth(null)} className="rounded-full border border-line px-2.5 py-0.5 text-[11px] text-muted hover:border-primary hover:text-primary">
              {year === '전체' ? '연도' : '월'} 선택 해제 ×
            </button>
          )}
        </div>
        <KpiTiles tiles={kpis} />

        <Card title={year === '전체' ? '연도별 추이' : `${year}년 월별 추이`} right={`순 ${fmtUsd(incomeTotal - expenseTotal)}`} rightColor={incomeTotal - expenseTotal >= 0 ? 'text-ink' : 'text-red-700'}>
          <TrendChart buckets={trend} selected={month} onSelect={setMonth} />
        </Card>

        <div className="grid gap-4 @3xl:grid-cols-2">
          <DonutBlock title="지출" groups={expenseGroups} total={expenseTotal} color="text-red-700" onItem={(cat, id) => goLedger('지출', cat, id)} />
          <DonutBlock title="수입" groups={incomeGroups} total={incomeTotal} color="text-blue-700" onItem={(cat, id) => goLedger('수입', cat, id)} />
        </div>

        <Card title="후원자별 헌금" right={fmtUsd(supporterTotal)} rightColor="text-ink">
          <BarList rows={supporterRows} color="var(--primary)" onGo={(href) => router.push(href)} />
        </Card>
        <Card title="계좌 잔액" right={`순자산 ${fmtUsd(netAssets)}`} rightColor={amtColor(netAssets)}>
          <BalanceGroups balances={balances} fx={fx} />
        </Card>
      </div>
    </div>
  )
}
