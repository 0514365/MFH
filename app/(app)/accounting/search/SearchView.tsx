'use client'
// MFH-ACCOUNTING-SEARCH-2027 — 회계 잔여 a: 합계 = 연회색 요약 면(테두리 없음) · 더 보기 = 연회색 알약 · Manrope 600(800/700 금지)
// MFH-ACCOUNTING-SEARCH-V3 — 필터 UI·기간 계산·최근 검색어를 공용 SearchFilters 로 분리(내역 탭과 공유), 화면은 그대로
// MFH-ACCOUNTING-SEARCH-V2 — 항목·계좌 바텀시트(다중선택) · 더 보기(사용자 = 계좌 info 우진·진아 · 금액 범위) · 최근 검색어 5개(기기별)
// MFH-ACCOUNTING-SEARCH-V1
// 회계 검색 — 위플형. 검색어(내용·구매처·항목명·금액 숫자) + 기간(전체·이번 주·이번 달·지정) + 구분(전체·수입·지출·이체)
// → 총 n건 · 금액순/날짜순 정렬 · 수입/지출 요약(이체·조정 제외) · 결과 행(날짜 · 항목 아이콘 · 내용 · 금액 · 카드). 행 탭 = 수정.
// 입력 즉시 필터(200ms 디바운스, 검색 버튼 없음). 상태는 URL(?q·p·from·to·g·items·acc·u·min·max)에 replaceState → 수정 후 뒤로 오면 그대로.
// 모바일(<md) = 전체 화면 고정(헤더·탭바 덮음, ✕ = 뒤로), md 이상 = 일반 페이지(셸 헤더 「검색」).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, AcctOptions, FxInfo, InoutRow } from '@/lib/accounting-types'
import { PASTEL_NEUTRAL, fmtShow, hnlRateOf, itemPastels, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
import { CatIcon } from '@/lib/acct-icons'
import { CurToggle } from '../AccountingTitle'
import {
  AccountSheet,
  AmountRange,
  ChipRow,
  ItemSheet,
  MoreToggle,
  PeriodFilter,
  PickRow,
  SearchInput,
  SortToggle,
  isPeriod,
  isYmd,
  matchText,
  numOf,
  rangeOf,
  splitIds,
  summary,
  useRecentQueries,
  useToday,
  type Period,
  type SortDir,
  type SortKey,
} from '../SearchFilters'

type GFilter = '전체' | '수입' | '지출' | '이체'
const GUBUNS: GFilter[] = ['전체', '수입', '지출', '이체']
const USERS = ['우진', '진아']
const PAGE = 200

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
  const today = useToday()
  const recentQs = useRecentQueries()
  const [q, setQ] = useState(initial.q ?? '')
  const [dq, setDq] = useState(initial.q ?? '')
  const [period, setPeriod] = useState<Period>(isPeriod(initial.p) ? initial.p : 'all')
  const [from, setFrom] = useState(isYmd(initial.from) ? initial.from : '')
  const [to, setTo] = useState(isYmd(initial.to) ? initial.to : '')
  const [gubun, setGubun] = useState<GFilter>(GUBUNS.includes(initial.g as GFilter) ? (initial.g as GFilter) : '전체')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [limit, setLimit] = useState(PAGE)
  const [itemIds, setItemIds] = useState<Set<string>>(() => splitIds(initial.items))
  const [accIds, setAccIds] = useState<Set<string>>(() => splitIds(initial.acc))
  const [user, setUser] = useState(USERS.includes(initial.u ?? '') ? (initial.u as string) : '')
  const [minAmt, setMinAmt] = useState(initial.min ?? '')
  const [maxAmt, setMaxAmt] = useState(initial.max ?? '')
  const [moreOpen, setMoreOpen] = useState(!!(initial.u || initial.min || initial.max))
  const [sheet, setSheet] = useState<'item' | 'account' | null>(null)

  const [cur] = useShowCur()
  const hnlRate = useMemo(() => hnlRateOf(fx, balances), [fx, balances])
  const showCur: ShowCur = hnlRate ? cur : 'USD'

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

  const [rFrom, rTo] = rangeOf(period, today, from, to)
  const amt = (r: InoutRow): number => toShow(r, showCur, hnlRate)

  const rows = useMemo(() => {
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
      return matchText(r, dq, (r.itemId ? itemOf.get(r.itemId)?.name : '') ?? '')
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
  const moreFilled = !!(user || minAmt.trim() || maxAmt.trim())

  return (
    <div
      className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-y-auto max-md:px-4 max-md:pb-10"
      style={{ background: 'var(--paper)' }}
    >
      {/* 모바일 머리줄 — 검색 · L/$ · ✕ */}
      <div className="flex items-center gap-2 pb-2 md:hidden" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <h1 className="flex-1 text-[24px] font-semibold tracking-tight text-b27-ink">검색</h1>
        {hnlRate && <CurToggle />}
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full text-b27-ink"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <SearchInput value={q} onChange={setQ} onCommit={setDq} recent={recentQs} autoFocus={!initial.q} />

      {/* 필터 */}
      <div className="mt-3 space-y-2">
        <PeriodFilter period={period} onPeriod={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} range={[rFrom, rTo]} />
        <ChipRow label="구분" options={GUBUNS} value={gubun} onChange={setGubun} />
        <PickRow
          label="항목"
          text={itemIds.size === 0 ? '전체 항목' : summary([...itemIds].map((id) => itemOf.get(id)?.name ?? '—'))}
          active={itemIds.size > 0}
          onClick={() => setSheet('item')}
        />
        <PickRow
          label="계좌"
          text={accIds.size === 0 ? '전체 계좌' : summary([...accIds].map((id) => accName.get(id) ?? '—'))}
          active={accIds.size > 0}
          onClick={() => setSheet('account')}
          right={<MoreToggle open={moreOpen} filled={moreFilled} onToggle={() => setMoreOpen(!moreOpen)} />}
        />
        {moreOpen && (
          <>
            {userAccIds.size > 0 && (
              <ChipRow label="사용자" options={['', ...userAccIds.keys()]} value={user} onChange={setUser} labelOf={(u) => u || '전체'} />
            )}
            <AmountRange min={minAmt} max={maxAmt} onMin={setMinAmt} onMax={setMaxAmt} symbol={showCur === 'HNL' ? 'L' : '$'} />
          </>
        )}
      </div>

      {/* 건수 · 정렬 */}
      <div className="mt-5 flex items-center gap-3">
        <span className="flex-1 text-[14px] text-b27-ink">
          총 <span className="font-num font-semibold">{rows.length.toLocaleString('en-US')}</span>건
        </span>
        <SortToggle
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(k, d) => {
            setSortKey(k)
            setSortDir(d)
          }}
        />
        {hnlRate && <CurToggle className="max-md:hidden" />}
      </div>

      {/* 요약 — 수입·지출(이체·조정 제외) */}
      <div className="mt-2 grid grid-cols-2 rounded-2xl bg-b27-card px-4 py-3">
        <div>
          <div className="text-[13px] font-medium text-b27-muted">수입</div>
          <div className="mt-0.5 text-right font-num text-[20px] font-semibold text-b27-income">{fmtShow(income, showCur)}</div>
        </div>
        <div className="border-l border-b27-paper pl-4">
          <div className="text-[13px] font-medium text-b27-muted">지출</div>
          <div className="mt-0.5 text-right font-num text-[20px] font-semibold text-b27-expense">{fmtShow(expense, showCur)}</div>
        </div>
      </div>

      {/* 결과 */}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-b27-muted">검색 결과가 없습니다.</p>
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
                  onClick={() => (recentQs.remember(q), router.push(`/accounting/entry?edit=${r.id}`))}
                  className={`flex w-full items-center gap-3 py-2.5 text-left ${counted ? '' : 'opacity-60'}`}
                >
                  <span className="w-11 shrink-0 font-num text-[13px] text-b27-muted">{rowDate(r.date)}</span>
                  <CatIcon name={it?.name ?? r.gubun} category={it?.category} color={color} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-b27-ink">{main}</span>
                    {sub && <span className="block truncate text-[11px] text-b27-muted">{sub}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block font-num text-[15px] font-semibold ${
                        r.gubun === '지출' ? 'text-b27-expense' : r.gubun === '수입' ? 'text-b27-income' : 'text-b27-muted'
                      }`}
                    >
                      {fmtShow(r.gubun === '지출' ? -a : a, showCur)}
                    </span>
                    {isCard && <span className="text-[10px] text-b27-muted">카드</span>}
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
          className="mt-2 flex h-10 w-full items-center justify-center rounded-full bg-b27-card text-[13px] font-medium text-b27-ink transition active:opacity-70"
        >
          더 보기 ({(rows.length - limit).toLocaleString('en-US')}건)
        </button>
      )}

      {sheet === 'item' && <ItemSheet options={options} colors={itemColor} value={itemIds} onChange={setItemIds} onClose={() => setSheet(null)} />}
      {sheet === 'account' && (
        <AccountSheet options={options} cardIds={cardIds} value={accIds} onChange={setAccIds} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}
