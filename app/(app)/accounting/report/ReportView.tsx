'use client'
// MFH-ACCOUNTING-REPORT-V6 — 위플형 통계(b단계): ‹ 월 ›(＋연간 전환) · 지출/수입 토글 · L/$(달력과 공유) → 큰 숫자 + 전기 대비
//   → 파스텔 도넛(가운데 가장 큰 카테고리 %) → 띠(현금·카드·카드대금 납부, 지출만) → 카테고리 % 막대(탭 = 항목 펼침 → 항목 탭 = 내역 딥링크)
//   → 후원자별 헌금(수입만) → 추이(맨 아래, 막대 탭 = 그 기간으로 이동). 계좌 잔액은 자산 탭으로 이동해 제거.
// MFH-ACCOUNTING-REPORT-V5 — 계좌 잔액에 공시 환율(fx) 전달
// 표시 전용, 집계는 클라이언트(recent·options·balances). 차트는 ./charts.tsx(의존성 0 SVG). 날짜 기준 = 브라우저 로컬(마운트 후 렌더).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, FxInfo, AcctOptions, InoutRow } from '@/lib/accounting-types'
import { fmtShow, hnlRateOf, pastelOf, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
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
          className={`flex-1 rounded-full px-3 py-1 transition ${value === o.v ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
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
  const [open, setOpen] = useState<string | null>(null) // 펼친 카테고리
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
    const sup = new Map<string, { sum: number; count: number }>()
    for (const r of recent) {
      const inCur = inKey(r, key)
      if (prevKey && inKey(r, prevKey) && r.gubun === kind) prevTotal += amt(r)
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
    return { total, prevTotal, cash, card, repay, groups, supporterRows }
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

  // 범위·종류가 바뀌면 펼침 닫기
  useEffect(() => setOpen(null), [key, kind, mode])

  if (!key || !stats) return <div className="min-h-[60vh]" aria-hidden="true" />

  const { total, prevTotal, cash, card, repay, groups, supporterRows } = stats
  const diff = total - prevTotal
  const prevWord = mode === 'month' ? '지난달' : '작년'
  const verb = kind === '지출' ? '쓴 돈' : '들어온 돈'
  const slices: PastelSlice[] = groups.map((g) => ({ key: g.cat, name: g.cat, sum: g.sum, fill: pastelOf(g.cat).fill }))

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
      {/* 기간 이동 · 월/연간 · 통화 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => move(-1)} aria-label="이전" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-subtle hover:text-primary">
            ‹
          </button>
          <span className="font-display text-[17px] font-bold text-ink">{fullLabel}</span>
          <button type="button" onClick={() => move(1)} aria-label="다음" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-subtle hover:text-primary">
            ›
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Seg value={mode} onChange={switchMode} options={[{ v: 'month', label: '월' }, { v: 'year', label: '연간' }]} />
          {hnlRate && <Seg value={showCur} onChange={setCur} options={[{ v: 'HNL', label: 'L' }, { v: 'USD', label: '$' }]} />}
        </div>
      </div>

      <Seg value={kind} onChange={setKind} options={[{ v: '지출', label: '지출' }, { v: '수입', label: '수입' }]} className="text-[13px]" />

      {/* 큰 숫자 + 도넛 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="text-[13px] text-muted">
          {label}에 {verb}
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
            topLabel={kind === '지출' ? '가장 큰 지출' : '가장 큰 수입'}
            onPick={(s) => setOpen(s.key)}
          />
        </div>
      </section>

      {/* 띠 — 현금 · 카드 · 카드대금 납부(지출만) */}
      {kind === '지출' && bandTotal > 0 && (
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

      {/* 카테고리 % 막대 */}
      <section className="rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {groups.length === 0 ? (
          <p className="py-6 text-center text-xs text-faint">거래 없음</p>
        ) : (
          <ul>
            {groups.map((g) => {
              const p = pastelOf(g.cat)
              const pct = total > 0 ? (g.sum / total) * 100 : 0
              const isOpen = open === g.cat
              return (
                <li key={g.cat} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => setOpen(isOpen ? null : g.cat)} className="flex w-full items-center gap-3 px-2 py-2.5 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: p.bg, color: p.fg }} aria-hidden="true">
                      {g.cat.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {g.cat}
                          <span className="ml-1.5 font-display text-[12px] font-bold" style={{ color: p.fg }}>
                            {pct.toFixed(pct < 10 ? 1 : 0)}%
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-sm font-bold text-ink">{fmt(g.sum)}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: p.fill }} />
                      </span>
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="mb-2 ml-14 mr-2 rounded-xl bg-surface-subtle px-3 py-1">
                      {g.items.map((it) => (
                        <li key={it.id}>
                          <button type="button" onClick={() => goLedger(g.cat, it.id)} className="flex w-full items-baseline justify-between gap-2 py-1.5 text-left text-[13px]">
                            <span className="truncate text-ink">
                              {it.name}
                              <span className="ml-1.5 text-[11px] text-faint">{it.count}건</span>
                            </span>
                            <span className="shrink-0 font-display font-bold text-ink">
                              {fmt(it.sum)} <span className="text-faint">›</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {kind === '수입' && supporterRows.length > 0 && (
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
