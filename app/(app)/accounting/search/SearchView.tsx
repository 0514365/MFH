'use client'
// MFH-ACCOUNTING-SEARCH-V1
// 회계 검색 — 위플형. 검색어(내용·구매처·항목명·금액 숫자) + 기간(전체·이번 주·이번 달·지정) + 구분(전체·수입·지출·이체)
// → 총 n건 · 금액순/날짜순 정렬 · 수입/지출 요약(이체·조정 제외) · 결과 행(날짜 · 항목 아이콘 · 내용 · 금액 · 카드). 행 탭 = 수정.
// 입력 즉시 필터(200ms 디바운스, 검색 버튼 없음). 상태는 URL(?q·p·from·to·g)에 replaceState → 수정 후 뒤로 오면 그대로.
// 모바일(<md) = 전체 화면 고정(헤더·탭바 덮음, ✕ = 뒤로), md 이상 = 일반 페이지(셸 헤더 「검색」).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, AcctOptions, FxInfo, InoutRow } from '@/lib/accounting-types'
import { PASTEL_NEUTRAL, fmtShow, hnlRateOf, itemPastels, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
import { CatIcon } from '@/lib/acct-icons'
import { CurToggle } from '../AccountingTitle'

type Period = 'all' | 'week' | 'month' | 'custom'
type GFilter = '전체' | '수입' | '지출' | '이체'
type SortKey = 'date' | 'amount'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'custom', label: '지정' },
]
const GUBUNS: GFilter[] = ['전체', '수입', '지출', '이체']
const PAGE = 200

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isYmd = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const dotDate = (s: string) => s.replaceAll('-', '.')

// 기간 → [from, to] (빈 문자열 = 제한 없음). 주 = 일~토(달력과 같음).
function rangeOf(p: Period, today: string, from: string, to: string): [string, string] {
  if (p === 'all') return ['', '']
  if (p === 'custom') return [from, to]
  const d = new Date(`${today}T00:00:00`)
  if (p === 'week') {
    const s = new Date(d)
    s.setDate(d.getDate() - d.getDay())
    const e = new Date(s)
    e.setDate(s.getDate() + 6)
    return [ymd(s), ymd(e)]
  }
  return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0))]
}

export default function SearchView({
  recent,
  options,
  balances,
  fx,
  initial,
}: {
  recent: InoutRow[]
  options: AcctOptions
  balances: AccountBalance[]
  fx: FxInfo[]
  initial: { q?: string; p?: string; from?: string; to?: string; g?: string }
}) {
  const router = useRouter()
  const [today, setToday] = useState<string | null>(null)
  const [q, setQ] = useState(initial.q ?? '')
  const [dq, setDq] = useState(initial.q ?? '')
  const [period, setPeriod] = useState<Period>(
    PERIODS.some((p) => p.key === initial.p) ? (initial.p as Period) : 'all',
  )
  const [from, setFrom] = useState(isYmd(initial.from) ? initial.from : '')
  const [to, setTo] = useState(isYmd(initial.to) ? initial.to : '')
  const [gubun, setGubun] = useState<GFilter>(GUBUNS.includes(initial.g as GFilter) ? (initial.g as GFilter) : '전체')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(PAGE)
  const inputRef = useRef<HTMLInputElement>(null)

  const [cur] = useShowCur()
  const hnlRate = useMemo(() => hnlRateOf(fx, balances), [fx, balances])
  const showCur: ShowCur = hnlRate ? cur : 'USD'

  useEffect(() => {
    setToday(ymd(new Date()))
    if (!initial.q) inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 검색어 디바운스
  useEffect(() => {
    const id = setTimeout(() => setDq(q), 200)
    return () => clearTimeout(id)
  }, [q])

  // 검색 상태 → URL (히스토리 쌓지 않음)
  useEffect(() => {
    const url = new URL(window.location.href)
    const set = (k: string, v: string) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
    set('q', dq.trim())
    set('p', period === 'all' ? '' : period)
    set('from', period === 'custom' ? from : '')
    set('to', period === 'custom' ? to : '')
    set('g', gubun === '전체' ? '' : gubun)
    window.history.replaceState(window.history.state, '', url.toString())
  }, [dq, period, from, to, gubun])

  useEffect(() => setLimit(PAGE), [dq, period, from, to, gubun, sortKey, sortDir])

  const itemOf = useMemo(() => {
    const m = new Map<string, { name: string; category: string | null }>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, { name: i.name, category: i.category ?? null })
    return m
  }, [options])
  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const cardIds = useMemo(() => new Set(balances.filter((b) => b.kind === '신용카드').map((b) => b.id)), [balances])

  const [rFrom, rTo] = today ? rangeOf(period, today, from, to) : ['', '']
  const amt = (r: InoutRow): number => toShow(r, showCur, hnlRate)

  const rows = useMemo(() => {
    const term = dq.trim().toLowerCase()
    const digits = term.replace(/[,\s]/g, '')
    const numeric = /^\d+(\.\d+)?$/.test(digits)
    const out = recent.filter((r) => {
      if ((rFrom || rTo) && !r.date) return false
      if (rFrom && r.date! < rFrom) return false
      if (rTo && r.date! > rTo) return false
      if (gubun !== '전체' && r.gubun !== gubun) return false
      if (!term) return true
      const itemName = (r.itemId ? itemOf.get(r.itemId)?.name : '') ?? ''
      if ([r.name, r.vendor, itemName].some((s) => s && s.toLowerCase().includes(term))) return true
      if (numeric) {
        const nums = [r.principal, r.amountUsd].filter((n): n is number => n != null)
        return nums.some((n) => String(Math.round(n)).includes(digits) || String(n).includes(digits))
      }
      return false
    })
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'amount') out.sort((a, b) => (Math.abs(amt(a)) - Math.abs(amt(b))) * dir || (b.date ?? '').localeCompare(a.date ?? ''))
    else if (sortDir === 'asc') out.reverse()
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, dq, rFrom, rTo, gubun, itemOf, sortKey, sortDir, showCur, hnlRate])

  const { income, expense } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const r of rows) {
      if (r.gubun === '수입') income += amt(r)
      else if (r.gubun === '지출') expense += amt(r)
    }
    return { income, expense }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, showCur, hnlRate])

  function sortBy(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  function close() {
    if (window.history.length > 1) router.back()
    else router.push('/accounting')
  }

  const thisYear = today?.slice(0, 4)
  const rowDate = (d: string | null) => {
    if (!d) return '—'
    const [y, m, dd] = d.split('-')
    return y === thisYear ? `${Number(m)}.${dd}` : `${y.slice(2)}.${Number(m)}.${dd}`
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-[14px] font-semibold transition ${
      active ? 'bg-primary text-white' : 'text-muted hover:text-primary'
    }`
  const rangeLabel =
    period === 'all' ? '전체 기간' : rFrom || rTo ? `${rFrom ? dotDate(rFrom) : ''} – ${rTo ? dotDate(rTo) : ''}` : ''

  return (
    <div
      className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-y-auto max-md:px-4 max-md:pb-10"
      style={{ background: 'var(--paper)' }}
    >
      {/* 모바일 머리줄 — 검색 · L/$ · ✕ */}
      <div className="flex items-center gap-2 pb-2 md:hidden" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <h1 className="flex-1 text-[24px] font-bold tracking-tight text-ink">검색</h1>
        {hnlRate && <CurToggle />}
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface-subtle"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* 검색어 */}
      <label className="flex h-12 items-center gap-2 rounded-full border border-line bg-surface-subtle px-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), setDq(q))}
          placeholder="내용 · 구매처 · 항목 · 금액"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint"
        />
        {q && (
          <button type="button" onClick={() => (setQ(''), setDq(''), inputRef.current?.focus())} aria-label="지우기" className="shrink-0 text-faint">
            ✕
          </button>
        )}
      </label>

      {/* 필터 */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[14px] font-medium text-ink">기간</span>
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPeriod(p.key)} aria-pressed={period === p.key} className={chip(period === p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {period === 'custom' ? (
          <div className="flex items-center gap-2 pl-12">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[14px] text-ink" />
            <span className="text-muted">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[14px] text-ink" />
          </div>
        ) : (
          <p className="pl-12 font-display text-[13px] text-muted">{rangeLabel}</p>
        )}
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[14px] font-medium text-ink">구분</span>
          <div className="flex flex-wrap gap-1">
            {GUBUNS.map((g) => (
              <button key={g} type="button" onClick={() => setGubun(g)} aria-pressed={gubun === g} className={chip(gubun === g)}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 건수 · 정렬 */}
      <div className="mt-5 flex items-center gap-3">
        <span className="flex-1 text-[14px] text-ink">
          총 <span className="font-display font-bold">{rows.length.toLocaleString('en-US')}</span>건
        </span>
        {(['amount', 'date'] as SortKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => sortBy(k)}
            className={`text-[13px] font-semibold ${sortKey === k ? 'text-ink' : 'text-faint'}`}
          >
            {k === 'amount' ? '금액순' : '날짜순'}
            {sortKey === k && <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>}
          </button>
        ))}
        {hnlRate && <CurToggle className="max-md:hidden" />}
      </div>

      {/* 요약 — 수입·지출(이체·조정 제외) */}
      <div className="mt-2 grid grid-cols-2 rounded-2xl border border-line bg-surface px-4 py-3">
        <div>
          <div className="text-[13px] font-medium text-muted">수입</div>
          <div className="mt-0.5 text-right font-display text-[20px] font-bold text-blue-700">{fmtShow(income, showCur)}</div>
        </div>
        <div className="border-l border-line pl-4">
          <div className="text-[13px] font-medium text-muted">지출</div>
          <div className="mt-0.5 text-right font-display text-[20px] font-bold text-red-700">{fmtShow(expense, showCur)}</div>
        </div>
      </div>

      {/* 결과 */}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-faint">검색 결과가 없습니다.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {rows.slice(0, limit).map((r) => {
            const it = r.itemId ? itemOf.get(r.itemId) : undefined
            const counted = r.gubun === '수입' || r.gubun === '지출'
            const color = (counted && r.itemId ? itemColor.get(r.itemId) : undefined)?.fill ?? PASTEL_NEUTRAL.fill
            const label = it?.name ?? r.gubun ?? '—'
            const main = r.name || r.vendor || label
            const sub = [label !== main ? label : '', r.name && r.vendor ? r.vendor : ''].filter(Boolean).join(' · ')
            const isCard = r.gubun === '지출' && !!r.accountId && cardIds.has(r.accountId)
            const a = amt(r)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/accounting/entry?edit=${r.id}`)}
                  className={`flex w-full items-center gap-3 py-2.5 text-left ${counted ? '' : 'opacity-60'}`}
                >
                  <span className="w-11 shrink-0 font-display text-[13px] text-muted">{rowDate(r.date)}</span>
                  <CatIcon name={it?.name ?? r.gubun} category={it?.category} color={color} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{main}</span>
                    {sub && <span className="block truncate text-[11px] text-faint">{sub}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block font-display text-[15px] font-bold ${
                        r.gubun === '지출' ? 'text-red-700' : r.gubun === '수입' ? 'text-blue-700' : 'text-muted'
                      }`}
                    >
                      {fmtShow(r.gubun === '지출' ? -a : a, showCur)}
                    </span>
                    {isCard && <span className="text-[10px] text-faint">카드</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(limit + PAGE)}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-line text-[13px] font-medium text-muted hover:border-primary hover:text-primary"
        >
          더 보기 ({(rows.length - limit).toLocaleString('en-US')}건)
        </button>
      )}
    </div>
  )
}
