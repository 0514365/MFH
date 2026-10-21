'use client'
// MFH-ACCOUNTING-REPORT-V14 — 실기 피드백(밋밋함, A안): 요약 = 연회색 면 · 추이 막대 종류 색 · 구성/결제수단/후원자 = 알약 제목 · 범례 옆줄 · 결제수단 3칸 · L/$ 는 모바일 헤더 행(HeaderCurToggle)
// MFH-ACCOUNTING-REPORT-V13 — 실기 피드백 2차(블록 → 원형): 블록 지도·연간 12개월 격자 제거 → 도넛(PastelDonut 2027) + 범례(이름 · 금액 · %, 탭 = 드릴다운/내역)
//   · 추이 막대는 월·연간 공통 12개월(연간은 그해 1~12월, 탭 = 그달 월 모드). 집계 로직은 그대로.
// MFH-ACCOUNTING-REPORT-V12 — 실기 피드백(남색 과다): 1위 대분류 블록 = 제 색(2×2 유지) · 연간 최대 달 = 같은 계열 진한 톤(Rose/Periwinkle) + 「최대」 글자 · 이번 달 테두리 2px → 남색 면 0
// MFH-ACCOUNTING-REPORT-V11 — 2027 실기 피드백(블록 재활용 ①): 연간 모드 = 그해 12개월 블록 격자(4열 × 3행, 분기 = 행)가 연도 추이 막대를 대체.
//   달마다 「월 · 금액」, 가장 큰 달 = 남색 앵커, 이번 달 = 남색 안쪽 테두리, 기록 없는 달 = 연회색, 탭 = 그달 월 모드로. 월 모드 추이 막대(1~12월)는 그대로.
// MFH-ACCOUNTING-REPORT-V10 — 2027 Minimal Block(c-4a): 지출/수입 글자 토글 · 월/연간 남색 알약 · 공용 CurToggle → 큰 숫자(남색) + 전기 대비
//   → 기간 추이 회색 막대(현재 남색, 탭 = 이동) → 블록 지도(3열 · 1위 = 남색 2×2 · 상위 7 + 기타 · 흰 글자 + 할로 · 탭 = 드릴다운/내역)
//   → 지출 전체: 현금·카드·납부 띠 한 줄 · 수입 전체: 후원자 목록. 도넛·% 막대·CatIcon·카드 테두리 제거. 집계 로직은 V9 그대로.
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
import { PASTEL_NEUTRAL, fmtShow, hnlRateOf, itemPastels, pastelAt, pastelOf, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
import { brand2027 } from '@/lib/palette'
import { CurToggle, HeaderMonthNav, HeaderPortal } from '../AccountingTitle'
import { PastelDonut, type PastelSlice, type TrendBucket } from './charts'

type Kind = '지출' | '수입'
type Mode = 'month' | 'year'
type Row = { name: string; sum: number; count?: number; href?: string }

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = Array.from({ length: 12 }, (_, i) => pad(i + 1))

// 후원자 Top N — 이름 · 건수 · 금액 · 비중, 아래 얇은 블록색 막대.
function BarList({ rows, fmt, topN = 10, onGo }: { rows: Row[]; fmt: (n: number) => string; topN?: number; onGo?: (href: string) => void }) {
  if (rows.length === 0) return <p className="py-4 text-center text-[12px] text-b27-muted">거래 없음</p>
  const total = rows.reduce((s, r) => s + r.sum, 0)
  const head = rows.slice(0, topN)
  const rest = rows.slice(topN)
  const max = head[0]?.sum ?? 0
  return (
    <ul>
      {head.map((r) => {
        const pct = max > 0 ? (r.sum / max) * 100 : 0
        const share = total > 0 ? (r.sum / total) * 100 : 0
        return (
          <li key={r.name} onClick={() => r.href && onGo?.(r.href)} className={`border-b border-b27-line py-2.5 ${r.href ? 'cursor-pointer' : ''}`}>
            <div className="flex items-baseline justify-between gap-2 text-[14px]">
              <span className="truncate text-b27-ink">
                {r.name}
                {r.count != null && <span className="ml-1.5 text-[11px] text-b27-muted">{r.count}건</span>}
              </span>
              <span className="shrink-0 font-num font-medium text-b27-ink">
                {fmt(r.sum)}
                <span className="ml-1.5 inline-block w-9 text-right text-[11px] font-normal text-b27-muted">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-b27-card">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pastelOf('후원').fill }} />
            </div>
          </li>
        )
      })}
      {rest.length > 0 && (
        <li className="flex items-baseline justify-between pt-2 text-[12px] text-b27-muted">
          <span>그 외 {rest.length}명</span>
          <span className="font-num">{fmt(rest.reduce((s, r) => s + r.sum, 0))}</span>
        </li>
      )}
    </ul>
  )
}

// 알약 세그먼트 — 활성 남색 채움·흰 글자 (CurToggle 과 같은 모양)
function Seg<T extends string>({ value, options, onChange, className = '' }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`flex rounded-full bg-b27-card p-[3px] font-num text-[13px] ${className}`}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`whitespace-nowrap rounded-full px-3 py-1 leading-none transition ${value === o.v ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted'}`}
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
  const [cur] = useShowCur()
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

  // 연간 모드 — 그해 12개월 합(종류별)
  const monthGrid = useMemo(() => {
    if (!key || mode !== 'year') return []
    return MONTHS.map((mm) => {
      let income = 0
      let expense = 0
      for (const r of recent) {
        if (!inKey(r, `${key}-${mm}`)) continue
        if (r.gubun === '수입') income += amt(r)
        else if (r.gubun === '지출') expense += amt(r)
      }
      return { key: `${key}-${mm}`, month: Number(mm), income, expense }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, key, mode, showCur, hnlRate])

  // 지출/수입을 바꾸면 전체로(기간 이동은 드릴다운 유지 — 같은 대분류를 달별로 비교)
  useEffect(() => setDrill(null), [kind])

  if (!key || !stats) return <div className="min-h-[60vh]" aria-hidden="true" />

  const { prevCats, cash, card, repay, groups, supporterRows } = stats
  // 드릴다운: 선택 대분류의 항목(중분류)으로 블록·합계를 바꾼다. 그 기간에 거래가 없으면 빈 그룹.
  const dg: CatGroup | null = drill ? (groups.find((g) => g.cat === drill) ?? { cat: drill, sum: 0, count: 0, items: [] }) : null
  const total = dg ? dg.sum : stats.total
  const prevTotal = dg ? (prevCats.get(dg.cat) ?? 0) : stats.prevTotal
  const diff = total - prevTotal
  const prevWord = mode === 'month' ? '지난달' : '작년'
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

  // 도넛 조각 + 범례 — 전체: 대분류(탭 = 드릴다운) · 드릴다운: 항목(탭 = 내역). 큰 순서. 범례는 상위 7 + 「그 외」.
  type Slice = PastelSlice & { go: () => void }
  const sliceRows: Slice[] = dg
    ? dg.items.map((it, i) => ({ key: it.id, name: it.name, sum: it.sum, fill: (itemColor.get(it.id) ?? pastelAt(i)).fill, cat: dg.cat, go: () => goLedger(dg.cat, it.id) }))
    : groups.map((g) => ({ key: g.cat, name: g.cat, sum: g.sum, fill: pastelOf(g.cat).fill, cat: g.cat, go: () => setDrill(g.cat) }))
  const legend: Slice[] =
    sliceRows.length <= 8
      ? sliceRows
      : [...sliceRows.slice(0, 7), { key: '__rest__', name: '그 외', sum: sliceRows.slice(7).reduce((t, b) => t + b.sum, 0), fill: PASTEL_NEUTRAL.fill, cat: null, go: () => (dg ? goLedger(dg.cat) : undefined) }]
  const fmtShort = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.round(n).toLocaleString('en-US'))

  // 추이 막대 — 월 모드: 그해 1~12월(현재 달 남색) · 연간 모드: 그해 12개월(이번 달 남색, 탭 = 그달 월 모드)
  const bars =
    mode === 'year'
      ? monthGrid.map((m) => ({ key: m.key, label: String(m.month), v: kind === '지출' ? m.expense : m.income }))
      : trend.map((b) => ({ key: b.key, label: b.label, v: kind === '지출' ? b.expense : b.income }))
  const barMax = Math.max(1, ...bars.map((b) => b.v))
  const thisMonthKey = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })()
  const barCur = mode === 'year' ? thisMonthKey : key

  const band = [
    { label: '현금', sum: cash, fill: brand2027.block3, tint: '#FEF6E7' },
    { label: '카드', sum: card, fill: brand2027.block2, tint: '#FDECEA' },
    { label: '납부', sum: repay, fill: brand2027.block5, tint: '#F1EFFA' },
  ]
  const bandTotal = band.reduce((s, b) => s + Math.max(0, b.sum), 0)

  return (
    <div className="space-y-5 font-sans text-b27-ink">
      {/* 기간 이동 → 헤더 중앙 */}
      <HeaderPortal>
        <HeaderMonthNav label={fullLabel} onPrev={() => move(-1)} onNext={() => move(1)} />
      </HeaderPortal>

      {/* 제목 줄 — 지출/수입 글자 토글 · 월/연간 · L/$ */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-4 font-num text-[15px]">
          {(['지출', '수입'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`border-b-2 pb-0.5 leading-none transition ${kind === k ? 'border-b27-ink font-medium text-b27-ink' : 'border-transparent text-b27-muted'}`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Seg value={mode} onChange={switchMode} options={[{ v: 'month', label: '월' }, { v: 'year', label: '연간' }]} />
          {hnlRate && <CurToggle className="max-md:hidden" />}
        </div>
      </div>

      {/* 요약 — 연회색 면: 라벨 · 큰 숫자 · 전기 대비 · 추이(종류 색) */}
      <section className="rounded-2xl bg-b27-card px-4 pb-3 pt-3">
        {dg && (
          <button type="button" onClick={() => setDrill(null)} className="mb-1 font-num text-[12px] text-b27-muted">
            ‹ 전체 {kind}
            {share != null && <span className="ml-2">· 전체의 {share}%</span>}
          </button>
        )}
        <div className="font-num text-[12px] text-b27-muted">
          {label} {dg ? dg.cat : kind}
        </div>
        <div className="mt-1 font-num text-[36px] font-medium leading-none tracking-[-0.02em] text-b27-ink">{fmt(total)}</div>
        <div className="mt-2 font-num text-[12px] text-b27-muted">
          {prevTotal === 0 ? (
            `${prevWord} 기록 없음`
          ) : (
            <>
              {prevWord} {fmt(prevTotal)} ·{' '}
              <span className={diff > 0 ? (kind === '지출' ? 'text-b27-expense' : 'text-b27-income') : diff < 0 ? (kind === '지출' ? 'text-b27-income' : 'text-b27-expense') : ''}>
                {diff >= 0 ? '+' : '−'}
                {Math.abs(Math.round((diff / prevTotal) * 100))}%
              </span>
            </>
          )}
        </div>

        {/* 추이 — 12개 막대, 종류 색(지출 연한 빨강 · 수입 연한 파랑), 현재(월)/이번 달(연간)은 진하게. 탭 = 그달로 */}
        {bars.some((b) => b.v > 0) && (
          <div className="mt-4 flex items-end gap-1.5" style={{ height: 56 }}>
            {bars.map((b) => {
              const h = Math.max(2, (b.v / barMax) * 44)
              const isCur = b.key === barCur
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => {
                    setYm(b.key)
                    if (mode === 'year') setMode('month')
                  }}
                  aria-label={`${b.label}월 ${fmt(b.v)}`}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="block w-full rounded-[2px]" style={{ height: h, background: kind === '지출' ? (isCur ? '#F07F8A' : '#FBE1DF') : isCur ? '#8FB8EE' : '#E1EAFB' }} />
                  <span className={`font-num text-[9px] leading-none ${isCur ? 'font-medium text-b27-ink' : 'text-b27-muted'}`}>{b.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 도넛 + 범례 — 조각·범례 탭 = 드릴다운(전체) / 내역(드릴다운) */}
      {legend.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-b27-line px-4 py-8 text-center text-[13px] text-b27-muted">
          {label} {dg ? dg.cat : kind} 기록이 없어요
        </p>
      ) : (
        <section className="px-1">
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-num text-[12px] text-b27-ink" style={{ background: kind === '지출' ? '#FBE1DF' : '#E1EAFB' }}>
              <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: kind === '지출' ? '#F07F8A' : '#8FB8EE' }} aria-hidden="true" />
              {dg ? `${dg.cat} 중` : kind === '지출' ? '어디에 썼나' : '어디서 들어왔나'}
            </span>
          </div>
          <div className="flex items-center gap-4">
          <PastelDonut slices={sliceRows} total={total} topLabel={dg ? `${dg.cat} 중 최대` : kind === '지출' ? '가장 큰 지출' : '가장 큰 수입'} onPick={(s) => (sliceRows.find((x) => x.key === s.key) ?? legend[0]).go()} />
          <ul className="min-w-0 flex-1">
            {legend.map((b) => (
              <li key={b.key}>
                <button type="button" onClick={b.go} className="flex w-full items-center gap-2 border-l-[3px] py-1.5 pl-2 text-left" style={{ borderLeftColor: b.fill }}>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-b27-ink">{b.name}</span>
                  <span className="shrink-0 font-num text-[13px] font-medium text-b27-ink">{fmtShort(b.sum)}</span>
                  <span className="w-8 shrink-0 text-right font-num text-[11px] text-b27-muted">{total > 0 ? Math.round((b.sum / total) * 100) : 0}%</span>
                </button>
              </li>
            ))}
          </ul>
          </div>
        </section>
      )}
      {dg && dg.items.length > 0 && (
        <button type="button" onClick={() => goLedger(dg.cat)} className="-mt-2 w-full py-1 text-center font-num text-[12px] text-b27-muted">
          {dg.cat} 내역 전체 보기 ›
        </button>
      )}

      {/* 결제수단 — 알약 제목 + 3칸(현금 살구 · 카드 살몬 · 납부 라벤더), 지출 전체만 */}
      {!dg && kind === '지출' && bandTotal > 0 && (
        <section className="px-1">
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-b27-card px-2.5 py-1 font-num text-[12px] text-b27-ink">결제수단</span>
          </div>
          <div className="flex gap-1.5">
            {band.map((b) => (
              <div key={b.label} className="min-w-0 flex-1 rounded-xl px-3 py-2 font-num" style={{ background: b.tint }}>
                <div className="truncate text-[11px] text-b27-muted">{b.label}</div>
                <div className="truncate text-[13px] font-medium text-b27-ink">{fmt(b.sum)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 후원자별 헌금(수입 전체만) */}
      {!dg && kind === '수입' && supporterRows.length > 0 && (
        <section className="px-1">
          <div className="flex items-center justify-between font-num text-[12px] text-b27-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-b27-ink" style={{ background: '#EAF6F5' }}>
              <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: brand2027.block1 }} aria-hidden="true" />
              후원자별
            </span>
            <span className="text-b27-ink">{fmt(supporterRows.reduce((s, r) => s + r.sum, 0))}</span>
          </div>
          <BarList rows={supporterRows} fmt={fmt} onGo={(href) => router.push(href)} />
        </section>
      )}
    </div>
  )
}
