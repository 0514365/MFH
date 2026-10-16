'use client'
// MFH-ACCOUNTING-REPORT-V9 — 기간 이동을 헤더 중앙으로(HeaderPortal) · 지출/수입 · 월/연간 · L/$ 를 한 줄로(줄바꿈 없음)
// MFH-ACCOUNTING-REPORT-V8 — 위플형 아이콘(CatIcon: 색 원 + 흰 선 아이콘) — 막대 목록·도넛 바깥 아이콘, 항목 고정색(itemPastels)
// MFH-ACCOUNTING-REPORT-V7 — 대분류 드릴다운: 도넛 조각·대분류 행 탭 → 그 대분류의 중분류(항목) 도넛 + % 막대(‹ 전체 로 복귀), 대분류 전기 대비
// MFH-ACCOUNTING-REPORT-V6 — 위플형 통계(b단계): ‹ 월 ›(＋연간 전환) · 지출/수입 토글 · L/$(달력과 공유) → 큰 숫자 + 전기 대비
//   → 파스텔 도넛(가운데 가장 큰 카테고리 %) → 띠(현금·카드·카드대금 납부, 지출만) → 카테고리 % 막대(탭 = 항목 펼침 → 항목 탭 = 내역 딥링크)
//   → 후원자별 헌금(수입만) → 추이(맨 아래, 막대 탭 = 그 기간으로 이동). 계좌 잔액은 자산 탭으로 이동해 제거.
// MFH-ACCOUNTING-REPORT-V5 — 계좌 잔액에 공시 환율(fx) 전달
// 표시 전용, 집계는 클라이언트(recent·options·balances). 차트는 ./charts.tsx(의존성 0 SVG). 날짜 기준 = 브라우저 로컬(마운트 후 렌더).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, FxInfo, AcctOptions, InoutRow } from '@/lib/accounting-types'
import { fmtShow, hnlRateOf, itemPastels, pastelAt, pastelOf, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
import { CatIcon } from '@/lib/acct-icons'
import { HeaderMonthNav, HeaderPortal } from '../AccountingTitle'
import { Card, PastelDonut, TrendChart, type PastelSlice, type TrendBucket } from './charts'

type Kind = '지출' | '수입'
type Mode = 'month' | 'year'
type Row = { name: string; sum: number; count?: number; href?: string }

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = Array.from({ length: 12 }, (_, i) => pad(i + 1))

// 후원자 Top N — 가로 막대(비중).
function BarList({
  rows,
  fmt,
  topN = 10,
  onGo,
}: {
  rows: Row[]
  fmt: (n: number) => string
  topN?: number
  onGo?: (href: string) => void
}) {
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
            onClick={() => r.href && onGo?.(r.href)}
            className={`rounded-lg px-1 py-0.5 transition ${r.href ? 'cursor-pointer hover:bg-surface-subtle' : ''}`}
          >
            <div className="mb-0.5 flex items-baseline justify-between text-[13px]">
              <span className="truncate text-ink">
                {r.name}
                {r.count != null && <span className="ml-1.5 text-[11px] text-faint">{r.count}건</span>}
              </span>
              <span className="shrink-0 font-display font-bold text-ink">
                {fmt(r.sum)}
                <span className="ml-1.5 inline-block w-9 text-right text-[11px] font-normal text-faint">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pastelOf('후원').fill }} />
            </div>
          </li>
        )
      })}
      {rest.length > 0 && (
        <li className="flex items-baseline justify-between pt-1 text-[12px] text-faint">
          <span>그 외 {rest.length}명</span>
          <span className="font-display">{fmt(rest.reduce((s, r) => s + r.sum, 0))}</span>
        </li>
      )}
    </ul>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T
  options: { v: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`flex rounded-full bg-surface-subtle p-0.5 text-[12px] font-semibold ${className}`}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 whitespace-nowrap rounded-full px-3 py-1 transition ${value === o.v ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

type CatGroup = { cat: string; sum: number; count: number; items: { id: string; name: string; sum: number; count: number }[] }

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
  const [mode, setMode] = useState<Mode>('month')
  const [kind, setKind] = useState<Kind>('지출')
  const [ym, setYm] = useState<string | null>(null) // 'YYYY-MM'
  const [year, setYear] = useState<string | null>(null) // 'YYYY'
  const [drill, setDrill] = useState<string | null>(null) // 드릴다운한 대분류(null = 전체)
  const [cur, setCur] = useShowCur()
  const hnlRate = useMemo(() => hnlRateOf(fx, balances), [fx, balances])
  const showCur: ShowCur = hnlRate ? cur : 'USD'
  const fmt = (n: number) => fmtShow(n, showCur)
  const amt = (r: InoutRow) => toShow(r, showCur, hnlRate)

  useEffect(() => {
    const d = new Date()
    setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
    setYear(String(d.getFullYear()))
  }, [])

  const itemInfo = useMemo(() => {
    const m = new Map<string, { name: string; category: string }>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, { name: i.name, category: i.category || '기타' })
    return m
  }, [options])
  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const supporterName = useMemo(() => new Map(options.supporters.map((s) => [s.id, s.name])), [options])
  const cardIds = useMemo(() => new Set(balances.filter((b) => b.kind === '신용카드').map((b) => b.id)), [balances])

  // 현재 기간 키 · 직전 기간 키 · 라벨
  const key = mode === 'month' ? ym : year
  const prevKey = useMemo(() => {
    if (!key) return null
    if (mode === 'year') return String(Number(key) - 1)
    const [y, m] = key.split('-').map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
  }, [key, mode])
  const inKey = (r: InoutRow, k: string) => (r.date ?? '').startsWith(k)
  const label = !key ? '' : mode === 'month' ? `${Number(key.slice(5))}월` : `${key}년`
  const fullLabel = !key ? '' : mode === 'month' ? `${key.slice(0, 4)}년 ${Number(key.slice(5))}월` : `${key}년`

  function move(delta: number) {
    if (!key) return
    if (mode === 'year') return setYear(String(Number(key) + delta))
    const [y, m] = key.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }
  function switchMode(m: Mode) {
    if (m === 'year' && ym) setYear(ym.slice(0, 4))
    if (m === 'month' && year && ym && ym.slice(0, 4) !== year) setYm(`${year}-12`)
    setMode(m)
  }

  // 집계 — 현재 기간(kind) 카테고리·항목, 띠, 직전 기간 합, 후원자
  const stats = useMemo(() => {
    if (!key) return null
    let total = 0
    let prevTotal = 0
    let cash = 0
    let card = 0
    let repay = 0
    const cats = new Map<string, CatGroup>()
    const prevCats = new Map<string, number>()
    const sup = new Map<string, { sum: number; count: number }>()
    for (const r of recent) {
      const inCur = inKey(r, key)
      if (prevKey && inKey(r, prevKey) && r.gubun === kind) {
        prevTotal += amt(r)
        const pc = (r.itemId ? itemInfo.get(r.itemId)?.category : undefined) ?? '기타'
        prevCats.set(pc, (prevCats.get(pc) ?? 0) + amt(r))
      }
      if (!inCur) continue
      if (r.gubun === '이체' && r.toAccountId && cardIds.has(r.toAccountId)) repay += amt(r)
      if (r.gubun !== kind) continue
      const a = amt(r)
      total += a
      if (kind === '지출') {
        if (r.accountId && cardIds.has(r.accountId)) card += a
        else cash += a
      }
      const info = r.itemId ? itemInfo.get(r.itemId) : undefined
      const cat = info?.category ?? '기타'
      const g = cats.get(cat) ?? { cat, sum: 0, count: 0, items: [] }
      g.sum += a
      g.count += 1
      const itemId = r.itemId ?? '__none__'
      let it = g.items.find((x) => x.id === itemId)
      if (!it) {
        it = { id: itemId, name: info?.name ?? '(미분류)', sum: 0, count: 0 }
        g.items.push(it)
      }
      it.sum += a
      it.count += 1
      cats.set(cat, g)
      if (kind === '수입' && info?.category === '후원') {
        const k = r.supporterId ?? '__anon__'
        const s = sup.get(k) ?? { sum: 0, count: 0 }
        s.sum += a
        s.count += 1
        sup.set(k, s)
      }
    }
    const groups = [...cats.values()].sort((a, b) => b.sum - a.sum)
    for (const g of groups) g.items.sort((a, b) => b.sum - a.sum)
    const supporterRows: Row[] = [...sup.entries()]
      .map(([k, v]) => ({
        name: k === '__anon__' ? '무명·단체' : (supporterName.get(k) ?? '(알수없음)'),
        sum: v.sum,
        count: v.count,
        href: k !== '__anon__' && supporterName.has(k) ? `/supporters/${k}` : undefined,
      }))
      .sort((a, b) => b.sum - a.sum)
    return { total, prevTotal, prevCats, cash, card, repay, groups, supporterRows }
    // amt 는 showCur·hnlRate 에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, key, prevKey, kind, showCur, hnlRate, itemInfo, cardIds, supporterName])

  // 추이 — 월 모드: 그해 1~12월 · 연간 모드: 연도별
  const trend = useMemo<TrendBucket[]>(() => {
    if (!key) return []
    const add = (b: { income: number; expense: number }, r: InoutRow) => {
      if (r.gubun === '수입') b.income += amt(r)
      else if (r.gubun === '지출') b.expense += amt(r)
    }
    if (mode === 'year') {
      const m = new Map<string, { income: number; expense: number }>()
      for (const r of recent) {
        const y = (r.date ?? '').slice(0, 4)
        if (!y) continue
        const b = m.get(y) ?? { income: 0, expense: 0 }
        add(b, r)
        m.set(y, b)
      }
      return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([y, v]) => ({ key: y, label: `'${y.slice(2)}`, ...v }))
    }
    const y = key.slice(0, 4)
    return MONTHS.map((mm) => {
      const b = { income: 0, expense: 0 }
      for (const r of recent) if (inKey(r, `${y}-${mm}`)) add(b, r)
      return { key: `${y}-${mm}`, label: String(Number(mm)), ...b }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, key, mode, showCur, hnlRate])

  // 지출/수입을 바꾸면 전체로(기간 이동은 드릴다운 유지 — 같은 대분류를 달별로 비교)
  useEffect(() => setDrill(null), [kind])

  if (!key || !stats) return <div className="min-h-[60vh]" aria-hidden="true" />

  const { prevCats, cash, card, repay, groups, supporterRows } = stats
  // 드릴다운: 선택 대분류의 항목(중분류)으로 도넛·막대·합계를 바꾼다. 그 기간에 거래가 없으면 빈 그룹.
  const dg: CatGroup | null = drill ? (groups.find((g) => g.cat === drill) ?? { cat: drill, sum: 0, count: 0, items: [] }) : null
  const total = dg ? dg.sum : stats.total
  const prevTotal = dg ? (prevCats.get(dg.cat) ?? 0) : stats.prevTotal
  const diff = total - prevTotal
  const prevWord = mode === 'month' ? '지난달' : '작년'
  const verb = kind === '지출' ? '쓴 돈' : '들어온 돈'
  const slices: PastelSlice[] = dg
    ? dg.items.map((it, i) => ({ key: it.id, name: it.name, sum: it.sum, fill: (itemColor.get(it.id) ?? pastelAt(i)).fill, cat: dg.cat }))
    : groups.map((g) => ({ key: g.cat, name: g.cat, sum: g.sum, fill: pastelOf(g.cat).fill, cat: g.cat }))
  const share = dg && stats.total > 0 ? Math.round((dg.sum / stats.total) * 100) : null

  // 내역 딥링크 — 현재 기간
  const period = (() => {
    if (mode === 'year') return { from: `${key}-01-01`, to: `${key}-12-31` }
    const [y, m] = key.split('-').map(Number)
    return { from: `${key}-01`, to: `${key}-${pad(new Date(y, m, 0).getDate())}` }
  })()
  const goLedger = (cat: string, itemId?: string) => {
    const q = new URLSearchParams({ gubun: kind, cat, from: period.from, to: period.to })
    if (itemId && itemId !== '__none__') q.set('item', itemId)
    router.push(`/accounting/ledger?${q.toString()}`)
  }

  const band = [
    { label: '현금', sum: cash, fill: '#F5D07A' },
    { label: '카드', sum: card, fill: '#F2A39A' },
    { label: '카드대금 납부', sum: repay, fill: '#B3A6EE' },
  ]
  const bandTotal = band.reduce((s, b) => s + Math.max(0, b.sum), 0)

  return (
    <div className="space-y-4">
      {/* 기간 이동 → 헤더 중앙 */}
      <HeaderPortal>
        <HeaderMonthNav label={fullLabel} onPrev={() => move(-1)} onNext={() => move(1)} />
      </HeaderPortal>

      {/* 지출/수입 · 월/연간 · 통화 — 한 줄 */}
      <div className="flex items-center gap-1.5">
        <Seg value={kind} onChange={setKind} options={[{ v: '지출', label: '지출' }, { v: '수입', label: '수입' }]} className="flex-1 text-[13px]" />
        <Seg value={mode} onChange={switchMode} options={[{ v: 'month', label: '월' }, { v: 'year', label: '연간' }]} className="shrink-0" />
        {hnlRate && <Seg value={showCur} onChange={setCur} options={[{ v: 'HNL', label: 'L' }, { v: 'USD', label: '$' }]} className="shrink-0" />}
      </div>

      {/* 큰 숫자 + 도넛 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {dg ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDrill(null)}
              className="-ml-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
            >
              ‹ 전체 {kind}
            </button>
            {share != null && <span className="text-[11px] text-faint">전체 {kind}의 {share}%</span>}
          </div>
        ) : null}
        <div className="text-[13px] text-muted">
          {label}에 {dg ? <b style={{ color: pastelOf(dg.cat).fg }}>{dg.cat}</b> : null}
          {dg ? '로 ' : ''}
          {verb}
        </div>
        <div className={`mt-0.5 font-display text-[28px] font-bold ${kind === '지출' ? 'text-red-700' : 'text-blue-700'}`}>{fmt(total)}</div>
        <div className="mt-0.5 text-[12px] text-faint">
          {prevTotal === 0
            ? `${prevWord} 기록 없음`
            : `${prevWord}보다 ${fmt(Math.abs(diff))} ${diff >= 0 ? '더' : '덜'} ${kind === '지출' ? '썼어요' : '들어왔어요'} (${diff >= 0 ? '+' : '−'}${Math.abs(Math.round((diff / prevTotal) * 100))}%)`}
        </div>
        <div className="mt-4">
          <PastelDonut
            slices={slices}
            total={total}
            topLabel={dg ? `${dg.cat} 중 최대` : kind === '지출' ? '가장 큰 지출' : '가장 큰 수입'}
            onPick={(s) => (dg ? goLedger(dg.cat, s.key) : setDrill(s.key))}
          />
        </div>
      </section>

      {/* 띠 — 현금 · 카드 · 카드대금 납부(지출만) */}
      {!dg && kind === '지출' && bandTotal > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-subtle">
            {band.map((b) => (b.sum > 0 ? <div key={b.label} style={{ width: `${(b.sum / bandTotal) * 100}%`, background: b.fill }} /> : null))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {band.map((b) => (
              <div key={b.label}>
                <div className="flex items-center gap-1 text-[11px] text-faint">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: b.fill }} />
                  {b.label}
                </div>
                <div className="font-display text-[13px] font-bold text-ink">{fmt(b.sum)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-faint">카드대금 납부는 카드 계좌로의 이체 — 지출 합계엔 포함되지 않습니다.</p>
        </section>
      )}

      {/* 카테고리 % 막대 — 전체: 대분류(탭 = 드릴다운) · 드릴다운: 중분류(탭 = 내역) */}
      <section className="rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {(dg ? dg.items.length : groups.length) === 0 ? (
          <p className="py-6 text-center text-xs text-faint">거래 없음</p>
        ) : (
          <ul>
            {(dg
              ? dg.items.map((it, i) => ({ key: it.id, name: it.name, cat: dg.cat, sum: it.sum, count: it.count, p: itemColor.get(it.id) ?? pastelAt(i), go: () => goLedger(dg.cat, it.id) }))
              : groups.map((g) => ({ key: g.cat, name: g.cat, cat: g.cat, sum: g.sum, count: g.count, p: pastelOf(g.cat), go: () => setDrill(g.cat) }))
            ).map((row) => {
              const pct = total > 0 ? (row.sum / total) * 100 : 0
              return (
                <li key={row.key} className="border-b border-line last:border-0">
                  <button type="button" onClick={row.go} className="flex w-full items-center gap-3 px-2 py-2.5 text-left">
                    <CatIcon name={row.name} category={row.cat} color={row.p.fill} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {row.name}
                          <span className="ml-1.5 font-display text-[12px] font-bold" style={{ color: row.p.fg }}>
                            {pct.toFixed(pct < 10 ? 1 : 0)}%
                          </span>
                          {dg && <span className="ml-1.5 text-[11px] text-faint">{row.count}건</span>}
                        </span>
                        <span className="shrink-0 font-display text-sm font-bold text-ink">
                          {fmt(row.sum)} <span className="text-faint">›</span>
                        </span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: row.p.fill }} />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {dg && dg.items.length > 0 && (
          <button type="button" onClick={() => goLedger(dg.cat)} className="w-full px-2 py-2 text-center text-[12px] font-medium text-muted hover:text-primary">
            {dg.cat} 내역 전체 보기 ›
          </button>
        )}
      </section>

      {!dg && kind === '수입' && supporterRows.length > 0 && (
        <Card title="후원자별 헌금" right={fmt(supporterRows.reduce((s, r) => s + r.sum, 0))} rightColor="text-ink">
          <BarList rows={supporterRows} fmt={fmt} onGo={(href) => router.push(href)} />
        </Card>
      )}

      <Card title={mode === 'year' ? '연도별 추이' : `${key.slice(0, 4)}년 월별 추이`}>
        <TrendChart
          buckets={trend}
          selected={key}
          onSelect={(k) => {
            if (!k) return
            if (mode === 'year') setYear(k)
            else setYm(k)
          }}
          fmt={fmt}
          hint={mode === 'year' ? '막대 클릭 = 그 해로 이동' : '막대 클릭 = 그 달로 이동'}
        />
      </Card>
    </div>
  )
}
