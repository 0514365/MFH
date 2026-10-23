'use client'
// MFH-CARD-INBOX-VIEW-V11 — 2027 토큰 승격: 「새 상점」 면 리터럴 → b27-wait-soft
// MFH-CARD-INBOX-VIEW-V10 — 실기 피드백(접힌 행): 1건 = 1행(구매처 · 시각/카드 · 추천 항목 칩(블록 색) · 금액), 행 탭 = 그 행만 펼쳐 항목·계좌·구매처·내용 수정 + 승인/무시
//   · 제목 줄 「승인 N」 + 「모두 승인」(터키석, 항목 지정된 건) + ⋯ 도구(필터·정렬·전체 선택·일괄 입력). 상태·승인·일괄 로직은 V9 그대로.
// MFH-CARD-INBOX-VIEW-V9 — 2027 Minimal Block(c-4d): 색·글꼴 토큰만 교체(남색 버튼·선택, 대기 호박색 b27-wait, 금액 b27-expense, Manrope). 행 구조·승인/무시 버튼은 유지(밀기 제스처는 미도입)
// MFH-CARD-INBOX-VIEW-V8 — 처리 후 앱 아이콘 뱃지 갱신
// MFH-CARD-INBOX-VIEW-V7 — 숨긴 항목 콤보 제외(추천값이 숨긴 항목이면 비움) + 항목 관리 버튼
// MFH-CARD-INBOX-VIEW-V6 — 구매처 필터·검색·정렬 + 다중선택 일괄 입력(항목·구매처·적요·계좌 적용)·선택 승인·선택 무시
// MFH-CARD-INBOX-VIEW-V5 — 문자 상점명 한 줄 고정(첫 열 215px)
// MFH-CARD-INBOX-VIEW-V4 — 구매처 수정·학습 추천
// MFH-CARD-INBOX-VIEW-V5 — 환율 입력 제거: 공시 환율 자동 표시(잠정, 월 마감 때 확정 — DB 트리거 patch116)
// MFH-CARD-INBOX-VIEW-V1~3 — 승인대기 목록(항목·적요·계좌 편집, 승인/무시, KRW 환율, 항목 즉석 추가)
// 승인대기 목록 — 행별 항목(추천 선채움)·구매처·적요·계좌 편집 + 승인/무시.
// 환율은 상단 공통(HNL 기본 = 마지막 승인값 · KRW 행이 있으면 KRW 환율 입력 추가). USD 행은 환율 1. 날짜·금액·문자 상점명은 원문 그대로.
// 일괄 흐름: 구매처 필터(또는 검색) → 전체 선택 → 일괄 입력(빈 칸은 유지) → 선택 승인.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { requestBadgeRefresh } from '@/lib/badge'
import { activeOnly, type AcctOption, type AcctOptions, type InboxRow } from '@/lib/accounting-types'
import { itemPastels } from '@/lib/acct-display'
import { blockHalo } from '@/lib/palette'
import { approveInbox, ignoreInbox } from './actions'
import ItemAddButton from '../ItemAddButton'
import ItemManageButton from '../ItemManageButton'

const CUR_SYMBOL: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
const CAT_ORDER = ['사역비', '생활비', '사역', '차량', '생활', '운영/행정']
const ctl =
  'h-9 w-full rounded-lg border border-b27-line bg-b27-paper px-2 text-sm text-b27-ink outline-none transition focus:border-b27-ink'
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
  defaultRateKrw = 1400,
  fxDate = null,
}: {
  rows: InboxRow[]
  options: AcctOptions
  defaultRate: number
  defaultRateKrw?: number
  fxDate?: string | null
}) {
  const router = useRouter()
  const items = useMemo(() => activeOnly(options.items['지출']), [options])
  const groups = useMemo(() => groupByCategory(items), [items])
  const categories = useMemo(() => groups.map(([c]) => c).filter((c) => c !== '기타'), [groups])
  const accountByCurrency = (cur: string) => options.accounts.find((a) => a.currency === cur)?.id ?? ''

  // ── 행별 편집 상태 — 추천값(없으면 빈칸·문자 상점명·통화 기본계좌)으로 초기화. 새 행이 생기면(새 수집) 추가.
  const initDraft = (r: InboxRow): Draft => ({
    itemId: r.suggestedItemId && items.some((i) => i.id === r.suggestedItemId) ? r.suggestedItemId : '',
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
  // 공시 환율 자동(입력 없음) — 저장 시 DB 트리거가 그달 마감·최신 공시로 최종 결정. 여기 값은 합계 미리보기·대체값.
  const rate = String(defaultRate)
  const rateKrw = String(defaultRateKrw)
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
    requestBadgeRefresh()
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
    requestBadgeRefresh()
  }

  // ── 접힌 행 UI 상태 — 펼친 행(1개) · 도구(필터·일괄) 패널
  const [openId, setOpenId] = useState<string | null>(null)
  const [tools, setTools] = useState(false)
  const itemColor = useMemo(() => itemPastels(items), [items])
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? ''

  const panelInput = 'h-10 w-full rounded-xl border-0 bg-b27-paper px-3 text-[14px] text-b27-ink outline-none'

  return (
    <div className="font-sans text-b27-ink">
      {/* 제목 줄 — 승인 N · 모두 승인(터키석) · ⋯ 도구 */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="font-num text-[17px] font-medium">
          승인 {visible.length}
          {hasFilter && <span className="ml-1 text-[13px] font-normal text-b27-muted">/ {rows.length}</span>}
        </span>
        <span className="flex items-center gap-2">
          {rows.length > 0 && (
            <button
              type="button"
              disabled={busy !== null || readyIds.length === 0}
              onClick={() => approve(readyIds)}
              className="h-8 rounded-full bg-b27-plus px-3.5 font-num text-[13px] font-medium text-white transition active:opacity-80 disabled:opacity-30"
            >
              {busy === 'bulk' ? '승인 중…' : `모두 승인 ${readyIds.length}`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setTools((v) => !v)}
            aria-pressed={tools}
            aria-label="필터 · 일괄 입력"
            className={`flex h-8 w-8 items-center justify-center rounded-full font-num text-[18px] leading-none transition ${tools ? 'bg-b27-ink text-white' : 'bg-b27-card text-b27-muted'}`}
          >
            ⋯
          </button>
        </span>
      </div>
      <p className="mt-1 px-1 font-num text-[12px] text-b27-muted" title="공시 환율 자동 — 합계는 잠정, 월 마감 때 그달 마감 환율로 확정">
        환율 자동{fxDate ? ` ${fxDate.slice(5).replace('-', '/')}` : ''} · L {Number(rate).toFixed(2)}
        {hasKrw && <> · ₩{Number(rateKrw).toLocaleString('en-US', { maximumFractionDigits: 0 })}</>}
        {visible.length > 0 && <> · 합계 {fmtUsd(totalUsd)}</>}
      </p>
      {msg && <p className="mt-2 px-1 text-[12px] text-b27-ink">{msg}</p>}

      {/* 도구 패널 — 필터 · 정렬 · 전체 선택 · 항목 추가/관리 · (선택 시) 일괄 입력 */}
      {tools && rows.length > 0 && (
        <section className="mt-3 rounded-2xl bg-b27-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={fMerchant} onChange={(e) => setFMerchant(e.target.value)} className={`${ctl} w-auto max-w-[220px]`} aria-label="구매처 필터">
              <option value="">구매처 전체 ({rows.length})</option>
              {merchants.map(([m, n]) => (
                <option key={m} value={m}>
                  {m} ({n})
                </option>
              ))}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="구매처 검색" className={`${ctl} w-36`} />
            <div className="flex h-9 overflow-hidden rounded-full bg-b27-paper p-[3px] text-xs">
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
                  className={`rounded-full px-3 ${sortKey === k ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted'}`}
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
                className="rounded-full px-2.5 py-1 text-[11px] text-b27-muted"
              >
                필터 초기화
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex h-9 items-center gap-2 rounded-full bg-b27-paper px-3 text-xs text-b27-muted">
              <input ref={headRef} type="checkbox" className={cb} checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
              전체 선택
            </label>
            <ItemAddButton gubun="지출" categories={categories} label="+ 항목 추가" />
            <ItemManageButton options={options} initialGubun="지출" label="항목 관리" />
          </div>

          {selIds.length > 0 && (
            <div className="mt-3 rounded-xl bg-b27-paper p-3">
              <div className="mb-2 text-xs font-medium text-b27-ink">
                선택 {selIds.length}건 일괄 입력 <span className="font-normal text-b27-muted">— 빈 칸은 각 행의 값 유지</span>
              </div>
              <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <ItemSelect value={bulk.itemId} onChange={(v) => setBulk({ ...bulk, itemId: v })} groups={groups} placeholder="항목 (유지)" />
                <input value={bulk.vendor} onChange={(e) => setBulk({ ...bulk, vendor: e.target.value })} placeholder="구매처 (유지)" className={ctl} />
                <input value={bulk.name} onChange={(e) => setBulk({ ...bulk, name: e.target.value })} placeholder="내용 (유지)" className={ctl} />
                <select value={bulk.accountId} onChange={(e) => setBulk({ ...bulk, accountId: e.target.value })} className={ctl}>
                  <option value="">계좌 (유지)</option>
                  {options.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={applyBulk} className="h-9 rounded-full bg-b27-card px-3 text-xs font-medium text-b27-ink">
                  선택 행에 적용
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => approve(selIds)}
                  className="h-9 rounded-full bg-b27-ink px-4 text-xs font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
                >
                  {busy === 'bulk' ? '승인 중…' : `선택 ${selIds.length}건 승인`}
                </button>
                <button type="button" disabled={busy !== null} onClick={() => ignore(selIds)} className="h-9 rounded-full bg-b27-card px-3 text-xs text-b27-muted disabled:opacity-40">
                  선택 무시
                </button>
                <button type="button" onClick={() => setSelected(new Set())} className="h-9 px-2 text-xs text-b27-muted">
                  선택 해제
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-b27-card px-4 py-8 text-center text-[13px] text-b27-muted">
          승인대기 거래가 없습니다. 매일 22:00 에 새 카드 문자가 수집됩니다.
          <br />
          <Link href="/accounting/ledger" className="mt-2 inline-block text-b27-ink">
            거래내역 보기 →
          </Link>
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-b27-card px-4 py-8 text-center text-[13px] text-b27-muted">조건에 맞는 대기 거래가 없습니다.</p>
      ) : (
        <ul className="mt-3">
          {visible.map((r) => {
            const d = draftOf(r)
            const rowBusy = busy === r.id || busy === 'bulk'
            const checked = selected.has(r.id)
            const open = openId === r.id
            const color = d.itemId ? itemColor.get(d.itemId) : undefined
            const title = d.vendor.trim() || r.merchant
            const showSms = title.toLowerCase() !== r.merchant.toLowerCase()
            return (
              <li key={r.id} className={`border-b border-b27-line ${checked ? 'bg-b27-card' : ''}`}>
                {/* 접힌 행 — 구매처 · 시각/카드/문자 · (추천 항목 칩) · 금액. 탭 = 펼침 */}
                <div className="flex items-start gap-2 py-3 pl-1 pr-1">
                  {tools && (
                    <input type="checkbox" className={`${cb} mt-1`} checked={checked} onChange={() => toggleRow(r.id)} aria-label="선택" />
                  )}
                  <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-b27-ink">{title}</span>
                      <span className="block truncate font-num text-[11px] text-b27-muted">
                        {fmtWhen(r.smsAt)} · 카드 {r.cardLast4}
                        {showSms && ` · 문자 ${r.merchant}`}
                      </span>
                      {!r.suggestedItemId && (
                        <span className="mt-1 inline-block rounded-full bg-b27-wait-soft px-1.5 py-0.5 text-[10px] font-medium text-b27-wait">새 상점</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${color ? 'text-white' : 'bg-b27-card text-b27-muted'}`}
                        style={color ? { background: color.bg, textShadow: blockHalo(color.n) } : undefined}
                      >
                        {d.itemId ? itemName(d.itemId) : '항목 선택'}
                      </span>
                      <span className="mt-1 block font-num text-[14px] font-medium text-b27-expense">{fmtAmt(r.currency, r.principal)}</span>
                      {r.currency !== 'USD' && <span className="block font-num text-[10.5px] text-b27-muted">{fmtUsd(usdOf(r))}</span>}
                    </span>
                  </button>
                </div>

                {/* 펼친 행 — 항목 · 구매처 · 내용 · 계좌 + 승인/무시 */}
                {open && (
                  <div className="-mx-4 mb-1 bg-b27-card px-4 py-3">
                    <div className="grid grid-cols-2 gap-2">
                      <ItemSelect value={d.itemId} onChange={(v) => setDraft(r.id, { itemId: v })} groups={groups} className={`${panelInput} ${!d.itemId ? 'ring-1 ring-b27-wait' : ''}`} />
                      <select value={d.accountId} onChange={(e) => setDraft(r.id, { accountId: e.target.value })} className={panelInput} aria-label="계좌">
                        <option value="">계좌 (없음)</option>
                        {options.accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      <input value={d.vendor} onChange={(e) => setDraft(r.id, { vendor: e.target.value })} placeholder={`구매처 · ${r.merchant}`} className={panelInput} aria-label="구매처" />
                      <input value={d.name} onChange={(e) => setDraft(r.id, { name: e.target.value })} placeholder="내용 · 예: 식료품" className={panelInput} aria-label="내용" />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={rowBusy || !d.itemId}
                        onClick={() => approve([r.id])}
                        className="h-10 flex-1 rounded-full bg-b27-ink font-num text-[14px] font-medium text-white transition active:scale-[0.98] disabled:opacity-30"
                      >
                        {busy === r.id ? '…' : '승인'}
                      </button>
                      <button type="button" disabled={rowBusy} onClick={() => ignore([r.id])} className="h-10 rounded-full bg-b27-paper px-4 text-[13px] text-b27-muted disabled:opacity-40">
                        무시
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {rows.length > 0 && <p className="mt-3 text-center text-[11px] text-b27-muted">행 탭 = 펼쳐서 수정 · 추천이 맞으면 「모두 승인」</p>}
    </div>
  )
}
