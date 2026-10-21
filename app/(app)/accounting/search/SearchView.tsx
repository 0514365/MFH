'use client'
// MFH-ACCOUNTING-SEARCH-V2 — 항목·계좌 바텀시트(다중선택) · 더 보기(사용자 = 계좌 info 우진·진아 · 금액 범위) · 최근 검색어 5개(기기별)
// MFH-ACCOUNTING-SEARCH-V1
// 회계 검색 — 위플형. 검색어(내용·구매처·항목명·금액 숫자) + 기간(전체·이번 주·이번 달·지정) + 구분(전체·수입·지출·이체)
// → 총 n건 · 금액순/날짜순 정렬 · 수입/지출 요약(이체·조정 제외) · 결과 행(날짜 · 항목 아이콘 · 내용 · 금액 · 카드). 행 탭 = 수정.
// 입력 즉시 필터(200ms 디바운스, 검색 버튼 없음). 상태는 URL(?q·p·from·to·g·items·acc·u·min·max)에 replaceState → 수정 후 뒤로 오면 그대로.
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
const USERS = ['우진', '진아']
const RECENT_KEY = 'mfh-acct-search-recent'
const RECENT_MAX = 5

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}
function storeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {}
}
const splitIds = (s: string | undefined) => new Set((s ?? '').split(',').filter(Boolean))
const toggleIn = (set: Set<string>, id: string) => {
  const n = new Set(set)
  if (n.has(id)) n.delete(id)
  else n.add(id)
  return n
}
const numOf = (s: string) => {
  const n = Number(s.replace(/,/g, ''))
  return s.trim() && Number.isFinite(n) ? n : null
}

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
  initial: {
    q?: string
    p?: string
    from?: string
    to?: string
    g?: string
    items?: string
    acc?: string
    u?: string
    min?: string
    max?: string
  }
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
  const [itemIds, setItemIds] = useState<Set<string>>(() => splitIds(initial.items))
  const [accIds, setAccIds] = useState<Set<string>>(() => splitIds(initial.acc))
  const [user, setUser] = useState(USERS.includes(initial.u ?? '') ? (initial.u as string) : '')
  const [minAmt, setMinAmt] = useState(initial.min ?? '')
  const [maxAmt, setMaxAmt] = useState(initial.max ?? '')
  const [moreOpen, setMoreOpen] = useState(!!(initial.u || initial.min || initial.max))
  const [sheet, setSheet] = useState<'item' | 'account' | null>(null)
  const [recentQs, setRecentQs] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const [cur] = useShowCur()
  const hnlRate = useMemo(() => hnlRateOf(fx, balances), [fx, balances])
  const showCur: ShowCur = hnlRate ? cur : 'USD'

  useEffect(() => {
    setToday(ymd(new Date()))
    setRecentQs(loadRecent())
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
    set('items', [...itemIds].join(','))
    set('acc', [...accIds].join(','))
    set('u', user)
    set('min', minAmt.trim())
    set('max', maxAmt.trim())
    window.history.replaceState(window.history.state, '', url.toString())
  }, [dq, period, from, to, gubun, itemIds, accIds, user, minAmt, maxAmt])

  useEffect(() => setLimit(PAGE), [dq, period, from, to, gubun, itemIds, accIds, user, minAmt, maxAmt, sortKey, sortDir])

  // 최근 검색어 — Enter·결과 행 탭 때 저장(중복은 맨 앞으로).
  function rememberQ() {
    const t = q.trim()
    if (!t) return
    const next = [t, ...recentQs.filter((x) => x !== t)].slice(0, RECENT_MAX)
    setRecentQs(next)
    storeRecent(next)
  }
  function forgetQ(t: string) {
    const next = recentQs.filter((x) => x !== t)
    setRecentQs(next)
    storeRecent(next)
  }

  const itemOf = useMemo(() => {
    const m = new Map<string, { name: string; category: string | null }>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, { name: i.name, category: i.category ?? null })
    return m
  }, [options])
  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const cardIds = useMemo(() => new Set(balances.filter((b) => b.kind === '신용카드').map((b) => b.id)), [balances])
  // 사용자 → 그 사람 계좌(info 에 이름 포함). 실제 info 에 나오는 이름만 칩으로.
  const userAccIds = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const u of USERS) {
      const ids = new Set(balances.filter((b) => b.info?.includes(u)).map((b) => b.id))
      if (ids.size) m.set(u, ids)
    }
    return m
  }, [balances])
  const accName = useMemo(() => new Map(options.accounts.map((a) => [a.id, a.name])), [options])

  const [rFrom, rTo] = today ? rangeOf(period, today, from, to) : ['', '']
  const amt = (r: InoutRow): number => toShow(r, showCur, hnlRate)

  const rows = useMemo(() => {
    const term = dq.trim().toLowerCase()
    const digits = term.replace(/[,\s]/g, '')
    const numeric = /^\d+(\.\d+)?$/.test(digits)
    const lo = numOf(minAmt)
    const hi = numOf(maxAmt)
    const out = recent.filter((r) => {
      if ((rFrom || rTo) && !r.date) return false
      if (rFrom && r.date! < rFrom) return false
      if (rTo && r.date! > rTo) return false
      if (gubun !== '전체' && r.gubun !== gubun) return false
      if (itemIds.size && !(r.itemId && itemIds.has(r.itemId))) return false
      const accs = [r.accountId, r.toAccountId].filter((x): x is string => !!x)
      if (accIds.size && !accs.some((x) => accIds.has(x))) return false
      const uIds = user ? userAccIds.get(user) : undefined
      if (uIds && !accs.some((x) => uIds.has(x))) return false
      if (lo != null || hi != null) {
        const v = Math.abs(amt(r))
        if (lo != null && v < lo) return false
        if (hi != null && v > hi) return false
      }
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
  }, [recent, dq, rFrom, rTo, gubun, itemIds, accIds, user, userAccIds, minAmt, maxAmt, itemOf, sortKey, sortDir, showCur, hnlRate])

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
  const pick = (active: boolean) =>
    `min-w-0 truncate rounded-full px-3 py-1.5 text-left text-[14px] font-semibold transition ${
      active ? 'bg-primary-soft text-primary' : 'text-muted hover:text-primary'
    }`
  const summary = (names: string[]) => (names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}`)
  const moreFilled = !!(user || minAmt.trim() || maxAmt.trim())
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
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), setDq(q), rememberQ())}
          placeholder="내용 · 구매처 · 항목 · 금액"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint"
        />
        {q && (
          <button type="button" onClick={() => (setQ(''), setDq(''), inputRef.current?.focus())} aria-label="지우기" className="shrink-0 text-faint">
            ✕
          </button>
        )}
      </label>

      {/* 최근 검색어 — 검색어가 비었을 때만 */}
      {!q && recentQs.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {recentQs.map((t) => (
            <span key={t} className="flex shrink-0 items-center rounded-full border border-line bg-surface pl-3 text-[13px] text-ink">
              <button type="button" onClick={() => (setQ(t), setDq(t))} className="py-1">
                {t}
              </button>
              <button type="button" onClick={() => forgetQ(t)} aria-label={`${t} 삭제`} className="px-2 py-1 text-[11px] text-faint">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

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
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[14px] font-medium text-ink">항목</span>
          <button type="button" onClick={() => setSheet('item')} className={pick(itemIds.size > 0)}>
            {itemIds.size === 0 ? '전체 항목' : summary([...itemIds].map((id) => itemOf.get(id)?.name ?? '—'))}
            <span className="ml-1 text-faint">›</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[14px] font-medium text-ink">계좌</span>
          <button type="button" onClick={() => setSheet('account')} className={pick(accIds.size > 0)}>
            {accIds.size === 0 ? '전체 계좌' : summary([...accIds].map((id) => accName.get(id) ?? '—'))}
            <span className="ml-1 text-faint">›</span>
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`ml-auto shrink-0 text-[13px] font-medium underline underline-offset-4 ${moreFilled ? 'text-primary' : 'text-muted'}`}
          >
            {moreOpen ? '접기' : '더 보기'}
          </button>
        </div>
        {moreOpen && (
          <>
            {userAccIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[14px] font-medium text-ink">사용자</span>
                <div className="flex flex-wrap gap-1">
                  {['', ...userAccIds.keys()].map((u) => (
                    <button key={u || 'all'} type="button" onClick={() => setUser(u)} aria-pressed={user === u} className={chip(user === u)}>
                      {u || '전체'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[14px] font-medium text-ink">금액</span>
              <input
                inputMode="decimal"
                value={minAmt}
                onChange={(e) => setMinAmt(e.target.value)}
                placeholder={showCur === 'HNL' ? 'L 최소' : '$ 최소'}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-right font-display text-[14px] text-ink placeholder:text-faint"
              />
              <span className="text-muted">–</span>
              <input
                inputMode="decimal"
                value={maxAmt}
                onChange={(e) => setMaxAmt(e.target.value)}
                placeholder={showCur === 'HNL' ? 'L 최대' : '$ 최대'}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-right font-display text-[14px] text-ink placeholder:text-faint"
              />
            </div>
          </>
        )}
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
                  onClick={() => (rememberQ(), router.push(`/accounting/entry?edit=${r.id}`))}
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

      {sheet === 'item' && (
        <Sheet title="항목" onClear={() => setItemIds(new Set())} onClose={() => setSheet(null)}>
          {(['지출', '수입'] as const).map((g) => (
            <div key={g} className="mb-4">
              <div className="mb-2 text-[13px] font-semibold text-muted">{g}</div>
              <div className="grid grid-cols-5 gap-x-1 gap-y-3">
                {options.items[g].map((i) => {
                  const on = itemIds.has(i.id)
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setItemIds(toggleIn(itemIds, i.id))}
                      aria-pressed={on}
                      className={`flex flex-col items-center gap-1 ${i.active === false ? 'opacity-50' : ''}`}
                    >
                      <span className={`rounded-full p-0.5 ring-2 ${on ? 'ring-primary' : 'ring-transparent'}`}>
                        <CatIcon name={i.name} category={i.category} color={itemColor.get(i.id)?.fill ?? PASTEL_NEUTRAL.fill} size={40} />
                      </span>
                      <span className={`w-full truncate text-center text-[11px] ${on ? 'font-bold text-primary' : 'text-ink'}`}>{i.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </Sheet>
      )}
      {sheet === 'account' && (
        <Sheet title="계좌" onClear={() => setAccIds(new Set())} onClose={() => setSheet(null)}>
          <div className="flex flex-wrap gap-2 pb-2">
            {options.accounts.map((a) => {
              const on = accIds.has(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccIds(toggleIn(accIds, a.id))}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 text-[14px] font-semibold transition ${
                    on ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink'
                  } ${a.active === false ? 'opacity-50' : ''}`}
                >
                  {a.name}
                  {cardIds.has(a.id) && <span className={`ml-1 text-[10px] ${on ? 'text-white/80' : 'text-faint'}`}>카드</span>}
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
    </div>
  )
}

// 바텀시트 — 배경 탭 = 닫기 · 초기화 / 완료.
function Sheet({
  title,
  onClear,
  onClose,
  children,
}: {
  title: string
  onClear: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-surface md:rounded-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-line px-4 py-3">
          <span className="flex-1 text-[16px] font-bold text-ink">{title}</span>
          <button type="button" onClick={onClear} className="mr-3 text-[13px] font-medium text-muted">
            초기화
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-white">
            완료
          </button>
        </div>
        <div className="overflow-y-auto px-4 pt-3">{children}</div>
      </div>
    </div>
  )
}
