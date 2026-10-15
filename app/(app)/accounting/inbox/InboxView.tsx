'use client'
// MFH-CARD-INBOX-VIEW-V6 — 구매처 필터·검색·정렬 + 다중선택 일괄 입력(항목·구매처·적요·계좌 적용)·선택 승인·선택 무시
// MFH-CARD-INBOX-VIEW-V5 — 문자 상점명 한 줄 고정(첫 열 215px)
// MFH-CARD-INBOX-VIEW-V4 — 구매처 수정·학습 추천
// MFH-CARD-INBOX-VIEW-V1~3 — 승인대기 목록(항목·적요·계좌 편집, 승인/무시, KRW 환율, 항목 즉석 추가)
// 승인대기 목록 — 행별 항목(추천 선채움)·구매처·적요·계좌 편집 + 승인/무시.
// 환율은 상단 공통(HNL 기본 = 마지막 승인값 · KRW 행이 있으면 KRW 환율 입력 추가). USD 행은 환율 1. 날짜·금액·문자 상점명은 원문 그대로.
// 일괄 흐름: 구매처 필터(또는 검색) → 전체 선택 → 일괄 입력(빈 칸은 유지) → 선택 승인.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AcctOption, AcctOptions, InboxRow } from '@/lib/accounting-types'
import { approveInbox, ignoreInbox } from './actions'
import ItemAddButton from '../ItemAddButton'

const CUR_SYMBOL: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
const CAT_ORDER = ['사역비', '생활비', '사역', '차량', '생활', '운영/행정']
const ctl =
  'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'
const cb = 'h-4 w-4 shrink-0 cursor-pointer accent-[#661F20]'

function groupByCategory(items: AcctOption[]): [string, AcctOption[]][] {
  const map = new Map<string, AcctOption[]>()
  for (const it of items) {
    const c = it.category || '기타'
    if (!map.has(c)) map.set(c, [])
    map.get(c)!.push(it)
  }
  return [...map.entries()].sort(
    (a, b) => (CAT_ORDER.indexOf(a[0]) + 1 || 99) - (CAT_ORDER.indexOf(b[0]) + 1 || 99),
  )
}
function fmtAmt(cur: string, n: number): string {
  return `${CUR_SYMBOL[cur] ?? ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
// 문자 수신 시각 → 온두라스 기준 'M/D HH:mm'.
function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { timeZone: 'America/Tegucigalpa', month: 'numeric', day: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

type Draft = { itemId: string; name: string; vendor: string; accountId: string }
type SortKey = 'date' | 'merchant' | 'amount'

function ItemSelect({
  value,
  onChange,
  groups,
  className,
  placeholder = '항목 선택',
}: {
  value: string
  onChange: (v: string) => void
  groups: [string, AcctOption[]][]
  className?: string
  placeholder?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className ?? ctl}>
      <option value="">{placeholder}</option>
      {groups.map(([cat, list]) => (
        <optgroup key={cat} label={cat}>
          {list.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export default function InboxView({
  rows,
  options,
  defaultRate,
}: {
  rows: InboxRow[]
  options: AcctOptions
  defaultRate: number
}) {
  const router = useRouter()
  const items = options.items['지출']
  const groups = useMemo(() => groupByCategory(items), [items])
  const categories = useMemo(() => groups.map(([c]) => c).filter((c) => c !== '기타'), [groups])
  const accountByCurrency = (cur: string) => options.accounts.find((a) => a.currency === cur)?.id ?? ''

  // ── 행별 편집 상태 — 추천값(없으면 빈칸·문자 상점명·통화 기본계좌)으로 초기화. 새 행이 생기면(새 수집) 추가.
  const initDraft = (r: InboxRow): Draft => ({
    itemId: r.suggestedItemId ?? '',
    name: r.suggestedName ?? '',
    vendor: r.suggestedVendor ?? r.merchant,
    accountId: r.suggestedAccountId ?? accountByCurrency(r.currency),
  })
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const r of rows) if (!next[r.id]) next[r.id] = initDraft(r)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])
  const draftOf = (r: InboxRow): Draft => drafts[r.id] ?? initDraft(r)
  function setDraft(id: string, patch: Partial<Draft>) {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? initDraft(row)), ...patch } }))
  }

  // ── 환율
  const [rate, setRate] = useState(String(defaultRate))
  const [rateKrw, setRateKrw] = useState('1400')
  const hasKrw = rows.some((r) => r.currency === 'KRW')
  const rateNum = Number(rate)
  const rateKrwNum = Number(rateKrw)
  const rateOf = (r: InboxRow) => (r.currency === 'USD' ? 1 : r.currency === 'KRW' ? rateKrwNum : rateNum)
  const usdOf = (r: InboxRow) => {
    const rt = rateOf(r)
    return rt > 0 ? Math.round((r.principal / rt) * 100) / 100 : 0
  }

  // ── 필터 · 검색 · 정렬 (구매처 = 문자 상점명 기준, 검색은 구매처 표시명도 포함)
  const [fMerchant, setFMerchant] = useState('')
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const merchants = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.merchant, (m.get(r.merchant) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [rows])
  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (fMerchant && r.merchant !== fMerchant) return false
      if (ql) {
        const v = (drafts[r.id]?.vendor ?? r.suggestedVendor ?? '').toLowerCase()
        if (!r.merchant.toLowerCase().includes(ql) && !v.includes(ql)) return false
      }
      return true
    })
    if (sortKey === 'merchant') list.sort((a, b) => a.merchant.localeCompare(b.merchant) || b.smsAt.localeCompare(a.smsAt))
    else if (sortKey === 'amount') list.sort((a, b) => usdOf(b) - usdOf(a))
    else list.sort((a, b) => b.smsAt.localeCompare(a.smsAt))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, fMerchant, q, sortKey, drafts, rateNum, rateKrwNum])
  const hasFilter = !!fMerchant || !!q.trim()

  // ── 다중선택 (필터가 바뀌면 보이지 않는 선택이 남지 않게 정리)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const visibleIds = useMemo(() => visible.map((r) => r.id), [visible])
  useEffect(() => {
    setSelected((prev) => {
      const keep = new Set([...prev].filter((id) => visibleIds.includes(id)))
      return keep.size === prev.size ? prev : keep
    })
  }, [visibleIds])
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someChecked = visibleIds.some((id) => selected.has(id))
  const headRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = someChecked && !allChecked
  }, [someChecked, allChecked])
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(visibleIds))
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selIds = useMemo(() => visibleIds.filter((id) => selected.has(id)), [visibleIds, selected])

  // ── 승인 · 무시 · 메시지
  const [busy, setBusy] = useState<string | 'bulk' | null>(null)
  const [msg, setMsg] = useState('')
  const readyIds = visible.filter((r) => !!draftOf(r).itemId).map((r) => r.id)
  const totalUsd = visible.reduce((s, r) => s + usdOf(r), 0)

  // ── 일괄 입력 — 선택 행에 항목·구매처·적요·계좌를 한 번에 채움(빈 칸은 각 행 값 유지)
  const [bulk, setBulk] = useState<Draft>({ itemId: '', name: '', vendor: '', accountId: '' })
  function applyBulk() {
    if (!selIds.length) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const id of selIds) {
        const row = rows.find((r) => r.id === id)
        if (!row) continue
        const cur = next[id] ?? initDraft(row)
        next[id] = {
          itemId: bulk.itemId || cur.itemId,
          name: bulk.name.trim() ? bulk.name : cur.name,
          vendor: bulk.vendor.trim() ? bulk.vendor : cur.vendor,
          accountId: bulk.accountId || cur.accountId,
        }
      }
      return next
    })
    setMsg(`${selIds.length}건에 적용했습니다 — 확인 후 "선택 승인"`)
  }

  async function approve(ids: string[]) {
    if (!ids.length) return
    const targets = rows.filter((r) => ids.includes(r.id))
    const missing = targets.filter((r) => !draftOf(r).itemId)
    if (missing.length) {
      setMsg(`항목이 비어 있는 ${missing.length}건은 승인할 수 없습니다 — 항목을 지정하세요`)
      return
    }
    if (targets.some((r) => !(rateOf(r) > 0))) {
      setMsg('환율을 입력하세요')
      return
    }
    setBusy(ids.length === 1 ? ids[0] : 'bulk')
    setMsg('')
    const res = await approveInbox(
      targets.map((r) => {
        const d = draftOf(r)
        return { id: r.id, itemId: d.itemId, name: d.name, vendor: d.vendor, accountId: d.accountId || null, rate: rateOf(r) }
      }),
    )
    setBusy(null)
    setSelected(new Set())
    setMsg(res.ok ? `${res.done}건 승인 — 장부에 저장했습니다` : `${res.done}건 승인${res.error ? ` · 실패: ${res.error}` : ''}`)
    router.refresh()
  }

  async function ignore(ids: string[]) {
    if (!ids.length) return
    if (!window.confirm(`${ids.length}건을 장부에 넣지 않고 무시할까요?`)) return
    setBusy(ids.length === 1 ? ids[0] : 'bulk')
    const res = await ignoreInbox(ids)
    setBusy(null)
    setSelected(new Set())
    if (!res.ok) setMsg(`실패: ${res.error ?? ''}`)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* 상단 — 건수·환율·필터·액션·일괄 입력 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
              Card SMS Inbox
            </div>
            <div className="mt-1 text-sm text-ink">
              대기 <b className="font-display">{rows.length}</b>건
              {hasFilter && (
                <span className="text-muted">
                  {' '}
                  · 표시 <b className="font-display">{visible.length}</b>건
                </span>
              )}
              {visible.length > 0 && <span className="text-muted"> · 합계 {fmtUsd(totalUsd)}</span>}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <label>
              <span className="mb-1 block text-[11px] font-medium text-faint">환율 (L / $1)</span>
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                className={`${ctl} w-24 text-right font-display`}
              />
            </label>
            {hasKrw && (
              <label>
                <span className="mb-1 block text-[11px] font-medium text-faint">환율 (₩ / $1)</span>
                <input
                  value={rateKrw}
                  onChange={(e) => setRateKrw(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  className={`${ctl} w-24 text-right font-display`}
                />
              </label>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <>
            {/* 필터 · 검색 · 정렬 */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={fMerchant}
                onChange={(e) => setFMerchant(e.target.value)}
                className={`${ctl} w-auto max-w-[220px]`}
                aria-label="구매처 필터"
              >
                <option value="">구매처 전체 ({rows.length})</option>
                {merchants.map(([m, n]) => (
                  <option key={m} value={m}>
                    {m} ({n})
                  </option>
                ))}
              </select>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="구매처 검색"
                className={`${ctl} w-36`}
              />
              <div className="flex h-9 overflow-hidden rounded-lg border border-line text-xs">
                {(
                  [
                    ['date', '최신순'],
                    ['merchant', '구매처순'],
                    ['amount', '금액순'],
                  ] as [SortKey, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSortKey(k)}
                    className={`px-3 ${sortKey === k ? 'bg-primary-soft font-bold text-primary' : 'text-faint'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setFMerchant('')
                    setQ('')
                  }}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted hover:border-primary"
                >
                  필터 초기화
                </button>
              )}
            </div>

            {/* 액션 줄 */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs text-muted">
                <input ref={headRef} type="checkbox" className={cb} checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
                전체 선택
              </label>
              <button
                type="button"
                disabled={busy !== null || readyIds.length === 0}
                onClick={() => approve(readyIds)}
                className="h-9 rounded-lg bg-accent px-3 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                {busy === 'bulk' ? '승인 중…' : `항목 지정된 ${readyIds.length}건 모두 승인`}
              </button>
              <ItemAddButton gubun="지출" categories={categories} label="+ 항목 추가" />
            </div>

            {/* 일괄 입력 — 선택이 있을 때 */}
            {selIds.length > 0 && (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
                <div className="mb-2 text-xs font-semibold text-primary">
                  선택 {selIds.length}건 일괄 입력 <span className="font-normal text-muted">— 빈 칸은 각 행의 값 유지</span>
                </div>
                <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <ItemSelect value={bulk.itemId} onChange={(v) => setBulk({ ...bulk, itemId: v })} groups={groups} placeholder="항목 (유지)" />
                  <input
                    value={bulk.vendor}
                    onChange={(e) => setBulk({ ...bulk, vendor: e.target.value })}
                    placeholder="구매처 (유지)"
                    className={ctl}
                  />
                  <input
                    value={bulk.name}
                    onChange={(e) => setBulk({ ...bulk, name: e.target.value })}
                    placeholder="내용 (유지)"
                    className={ctl}
                  />
                  <select value={bulk.accountId} onChange={(e) => setBulk({ ...bulk, accountId: e.target.value })} className={ctl}>
                    <option value="">계좌 (유지)</option>
                    {options.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyBulk}
                    className="h-9 rounded-lg border border-primary bg-surface px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
                  >
                    선택 행에 적용
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => approve(selIds)}
                    className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
                  >
                    {busy === 'bulk' ? '승인 중…' : `선택 ${selIds.length}건 승인`}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => ignore(selIds)}
                    className="h-9 rounded-lg border border-line px-3 text-xs text-muted transition hover:text-danger disabled:opacity-40"
                  >
                    선택 무시
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="h-9 px-2 text-xs text-faint hover:text-primary"
                  >
                    선택 해제
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-faint">
          승인대기 거래가 없습니다. 매일 22:00 에 새 카드 문자가 수집됩니다.
          <br />
          <Link href="/accounting/ledger" className="mt-2 inline-block text-primary">
            거래내역 보기 →
          </Link>
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-faint">
          조건에 맞는 대기 거래가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => {
            const d = draftOf(r)
            const rowBusy = busy === r.id || busy === 'bulk'
            const checked = selected.has(r.id)
            return (
              <li
                key={r.id}
                className={`rounded-2xl border bg-surface p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] @2xl:grid @2xl:grid-cols-[auto_215px_1fr_1fr_1fr_140px_auto] @2xl:items-end @2xl:gap-2 ${
                  checked ? 'border-primary/50 bg-primary-soft/30' : 'border-line'
                }`}
              >
                {/* 선택 */}
                <div className="mb-2 flex items-center @2xl:mb-0 @2xl:h-9">
                  <input type="checkbox" className={cb} checked={checked} onChange={() => toggleRow(r.id)} aria-label="선택" />
                  <span className="ml-2 text-[11px] text-faint @2xl:hidden">선택</span>
                </div>

                {/* 원문 정보 */}
                <div className="mb-2 flex items-start justify-between gap-2 @2xl:mb-0 @2xl:block">
                  <div className="min-w-0">
                    {/* 문자 상점명(16자 절단 원문) — 데스크탑은 한 줄 고정(열 폭 215px), 모바일은 필요 시 줄바꿈 */}
                    <div className="text-sm font-semibold text-ink @2xl:whitespace-nowrap">
                      <span className="mr-1 text-[10px] font-medium text-faint">문자</span>
                      {r.merchant}
                    </div>
                    <div className="whitespace-nowrap text-[11px] text-muted">
                      {fmtWhen(r.smsAt)} · 카드 {r.cardLast4}
                      {!r.suggestedItemId && (
                        <span className="ml-1 whitespace-nowrap rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          새 상점
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right @2xl:mt-1 @2xl:text-left">
                    <div className="font-display text-sm font-bold text-red-700">{fmtAmt(r.currency, r.principal)}</div>
                    <div className="text-[11px] text-faint">{fmtUsd(usdOf(r))}</div>
                  </div>
                </div>

                {/* 항목 */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-faint">항목</span>
                  <ItemSelect
                    value={d.itemId}
                    onChange={(v) => setDraft(r.id, { itemId: v })}
                    groups={groups}
                    className={`${ctl} ${!d.itemId ? 'border-amber-300' : ''}`}
                  />
                </label>

                {/* 구매처(어디서) — 문자 상점명은 16자로 잘려 오므로 바로잡을 수 있고, 바로잡은 이름은 학습됨 */}
                <label className="mt-2 block @2xl:mt-0">
                  <span className="mb-1 block text-[11px] font-medium text-faint">
                    구매처{r.suggestedVendor ? <span className="ml-1 text-accent">추천</span> : ''}
                  </span>
                  <input
                    value={d.vendor}
                    onChange={(e) => setDraft(r.id, { vendor: e.target.value })}
                    placeholder={r.merchant}
                    className={ctl}
                  />
                </label>

                {/* 적요(무엇을) — 상점별로 학습·추천 */}
                <label className="mt-2 block @2xl:mt-0">
                  <span className="mb-1 block text-[11px] font-medium text-faint">
                    내용{r.suggestedName ? <span className="ml-1 text-accent">추천</span> : ''}
                  </span>
                  <input
                    value={d.name}
                    onChange={(e) => setDraft(r.id, { name: e.target.value })}
                    placeholder="예: 식료품 · 주유 · 학비"
                    className={ctl}
                  />
                </label>

                {/* 계좌 */}
                <label className="mt-2 block @2xl:mt-0">
                  <span className="mb-1 block text-[11px] font-medium text-faint">계좌</span>
                  <select value={d.accountId} onChange={(e) => setDraft(r.id, { accountId: e.target.value })} className={ctl}>
                    <option value="">(없음)</option>
                    {options.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 액션 */}
                <div className="mt-3 flex gap-2 @2xl:mt-0">
                  <button
                    type="button"
                    disabled={rowBusy || !d.itemId}
                    onClick={() => approve([r.id])}
                    className="h-9 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40 @2xl:flex-none"
                  >
                    {busy === r.id ? '…' : '승인'}
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => ignore([r.id])}
                    className="h-9 rounded-lg border border-line px-3 text-sm text-muted transition hover:text-danger disabled:opacity-40"
                  >
                    무시
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
