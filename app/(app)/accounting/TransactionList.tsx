'use client'
// MFH-ACCOUNTING-TXLIST-V18 — 항목·계좌 = 바텀시트 다중선택(SearchFilters) · 더 보기(분류·통화·사용자·금액 원금 범위) — 드롭다운 4개 제거
// MFH-ACCOUNTING-TXLIST-V17 — 검색 UI 차용(SearchFilters): 둥근 검색창·최근 검색어 · 기간 칩(전체·이번 주·이번 달·지정) · 구분 칩 · 금액순/날짜순 글자 토글 · 검색어에 항목명·금액 숫자
// MFH-ACCOUNTING-TXLIST-V16 — 영수증 📎(행 내용 옆) → ReceiptViewer(보기·교체·삭제)
// MFH-ACCOUNTING-TXLIST-V15 — 일괄 수정 항목 콤보에서 숨긴 항목 제외(필터 콤보는 포함)
// MFH-ACCOUNTING-TXLIST-V14 — 조정 행도 클릭 수정 허용(폼 조정 지원)
// MFH-ACCOUNTING-TXLIST-V14 — initialFilter.account(자산 탭 계좌 → 그 계좌 내역)
// MFH-ACCOUNTING-TXLIST-V13 — initialFilter(분석 탭 → 내역 딥링크: 구분·대분류·항목·기간·검색 선적용)
// MFH-ACCOUNTING-TXLIST-V12 — 구매처 열 9rem 고정·말줄임(title 로 전체)
// MFH-ACCOUNTING-TXLIST-V11 — 항목 열 폭 자동(보이는 행의 가장 긴 항목이 2줄에 생략 없이 들어가는 폭), 통화 열 펼치면 항목 열 축소
// MFH-ACCOUNTING-TXLIST-V10 — 항목 열 폭 제한(최대 2줄·12rem), 내용 열 최대 확장
// MFH-ACCOUNTING-TXLIST-V9 — 구분 '조정'(잔액 조정) 필터·표시(회색 칩, 수정 불가, 소계 제외)
// MFH-ACCOUNTING-TXLIST-V8 — 열 폭(항목 2줄·내용 가변) · 통화 토글 표 위 강조 · 통화 기호 · 수입 청색/지출 적색(행·소계)
// MFH-ACCOUNTING-TXLIST-V7 — 용어 적요→내용 · 대분류→항목 콤보 연동 · 통화 3열 접기(기본 숨김) · 월/기간 소계(통화별 순액 + 수입/지출)
// MFH-ACCOUNTING-TXLIST-V6 — 통합 수정 필드 확장(날짜·적요·구매처·환율·후원자)
// MFH-ACCOUNTING-TXLIST-V5 — 구매처(vendor) 열·검색(patch105)
// MFH-ACCOUNTING-TXLIST-V4 — 구분 이체(출금 → 입금) 필터·표시(patch104)
// 거래 내역 — 월별 그룹화 + 월별 수입/지출 합계 + 필터(구분·대분류·항목·통화·계좌·기간·이름) + 정렬(날짜·금액).
// 행 클릭 → 수정(onEdit, 기록 페이지로 이동) · 행별 삭제 + 다중선택 → 일괄 삭제 / 통합 수정(항목·계좌). 노션(SoT) read, 변경은 server action.
import { useEffect, useMemo, useRef, useState } from 'react'
import ReceiptViewer from './ReceiptViewer'
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
  matchText,
  numOf,
  rangeOf,
  summary,
  useRecentQueries,
  useToday,
  type Period,
} from './SearchFilters'
import { itemPastels } from '@/lib/acct-display'
import { activeOnly, type AcctOptions, type InoutRow, type InoutPatch } from '@/lib/accounting-types'
import { deleteInout, bulkDeleteInout, bulkPatchInout } from './actions'

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  const s = `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return n < 0 ? `−${s}` : s
}
// 금액 색 — 수입 청색 · 지출 적색 · 조정 부호색 · 이체 기본.
const signColor = (n: number) => (n > 0 ? 'text-b27-income' : n < 0 ? 'text-b27-expense' : 'text-b27-ink')
const gubunColor = (g: string | null, n?: number | null) =>
  g === '수입' ? 'text-b27-income' : g === '지출' ? 'text-b27-expense' : g === '조정' ? signColor(n ?? 0) : 'text-b27-ink'
// 통화 기호 — 모바일 카드에서 원금 앞에 붙인다.
const CUR_SYMBOL: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
// 현지통화 원금(기호 + 천단위, 소수 최대 2) — 모바일.
function fmtLocal(cur: string | null, n: number | null): string {
  if (n == null) return '—'
  const sym = cur ? (CUR_SYMBOL[cur] ?? '') : ''
  return `${sym}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}
// 소계 셀 — 순액(음수는 −). 0 은 빈칸.
function fmtNet(cur: string, n: number): string {
  if (!n) return ''
  const s = `${CUR_SYMBOL[cur] ?? ''}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return n < 0 ? `−${s}` : s
}
// 데스크탑 통화열 — 행 통화가 열 통화와 같을 때만 기호+숫자.
function fmtColCell(rowCur: string | null, colCur: string, n: number | null): string {
  if (rowCur !== colCur || n == null) return ''
  return `${CUR_SYMBOL[colCur] ?? ''}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}
// 글자 폭 추정(em) — 한글·전각 1.0, 그 외 0.55. 항목 열 자동 폭 계산용.
function emLen(str: string): number {
  let n = 0
  for (const ch of str) n += /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u3000-\u303F\uFF00-\uFFEF\u4E00-\u9FFF]/.test(ch) ? 1 : 0.55
  return n
}
function monthLabel(key: string): string {
  if (key === '날짜없음') return '날짜 없음'
  if (key === '기간') return '기간 소계'
  const [y, m] = key.split('-')
  return `${y}년 ${Number(m)}월`
}

type SortKey = 'date' | 'amount'
const GUBUN_FILTERS = ['전체', '수입', '지출', '이체', '조정'] as const
const CUR_FILTERS = ['', 'HNL', 'USD', 'KRW'] as const
const USERS = ['우진', '진아']
// 사용자·카드 판별용 계좌 정보(getAccountBalances 의 일부).
export type LedgerAccountInfo = { id: string; info: string | null; kind: string | null }
type GubunFilter = '전체' | '수입' | '지출' | '이체' | '조정'
export type LedgerFilter = { gubun?: string; cat?: string; item?: string; from?: string; to?: string; q?: string; account?: string }
const isGubun = (g?: string): g is GubunFilter => g === '수입' || g === '지출' || g === '이체' || g === '조정'

const ctl =
  'h-8 rounded-lg border border-b27-line bg-b27-paper px-2 text-xs text-b27-ink outline-none transition focus:border-b27-ink'

export default function TransactionList({
  recent,
  options,
  editingId,
  onEdit,
  onAfterMutate,
  initialFilter,
  accountInfo = [],
}: {
  recent: InoutRow[]
  options: AcctOptions
  accountInfo?: LedgerAccountInfo[]
  editingId: string | null
  onEdit: (r: InoutRow) => void
  onAfterMutate: () => void
  initialFilter?: LedgerFilter // 분석 탭 딥링크(?gubun=&cat=&item=&from=&to=&q=) 선적용
}) {
  const [fGubun, setFGubun] = useState<GubunFilter>(isGubun(initialFilter?.gubun) ? initialFilter.gubun : '전체')
  const [fItemIds, setFItemIds] = useState<Set<string>>(() => new Set(initialFilter?.item ? [initialFilter.item] : []))
  const [fAccountIds, setFAccountIds] = useState<Set<string>>(() => new Set(initialFilter?.account ? [initialFilter.account] : []))
  const [fCat, setFCat] = useState(initialFilter?.cat ?? '')
  const [fCur, setFCur] = useState('')
  const [fUser, setFUser] = useState('')
  const [fMin, setFMin] = useState('')
  const [fMax, setFMax] = useState('')
  const [moreOpen, setMoreOpen] = useState(!!initialFilter?.cat)
  const [sheet, setSheet] = useState<'item' | 'account' | null>(null)
  const [fFrom, setFFrom] = useState(initialFilter?.from ?? '')
  const [fTo, setFTo] = useState(initialFilter?.to ?? '')
  const [period, setPeriod] = useState<Period>(initialFilter?.from || initialFilter?.to ? 'custom' : 'all')
  const [q, setQ] = useState(initialFilter?.q ?? '')
  const [dq, setDq] = useState(initialFilter?.q ?? '') // 검색어 디바운스(200ms)
  const today = useToday()
  const recentQs = useRecentQueries()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showCur, setShowCur] = useState(false) // 원화·렘피라·달러 3열 — 기본 숨김
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  // 다중선택 / 일괄 작업
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [receiptRow, setReceiptRow] = useState<InoutRow | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkItemId, setBulkItemId] = useState('')
  const [bulkAccountId, setBulkAccountId] = useState('')
  const [bulkDate, setBulkDate] = useState('')
  const [bulkName, setBulkName] = useState('')
  const [bulkVendor, setBulkVendor] = useState('')
  const [bulkRate, setBulkRate] = useState('')
  const [bulkSupporter, setBulkSupporter] = useState('') // '' 변경 안 함 · '__clear__' 해제 · id 연결
  const [bulkBusy, setBulkBusy] = useState(false)

  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    for (const a of options.accounts) m.set(a.id, a.name)
    return m
  }, [options])

  // 항목 id → 대분류(acct_items.category) — 거래 행에 소분류와 함께 표기.
  const catOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']])
      if (i.category) m.set(i.id, i.category)
    return m
  }, [options])

  // 대분류 필터 옵션 — 항목의 `대분류` 고유값(폼과 동일 순서).
  const catOptions = useMemo(() => {
    const ORDER = ['후원', '헌금', '기타수입', '사역비', '생활비', '사역', '차량', '생활', '운영/행정']
    const s = new Set<string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) if (i.category) s.add(i.category)
    return [...s].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
  }, [options])

  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const cardIds = useMemo(() => new Set(accountInfo.filter((a) => a.kind === '신용카드').map((a) => a.id)), [accountInfo])
  // 사용자 → 그 사람 계좌(info 에 이름 포함). 실제 info 에 나오는 이름만 칩으로.
  const userAccIds = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const u of USERS) {
      const ids = new Set(accountInfo.filter((a) => a.info?.includes(u)).map((a) => a.id))
      if (ids.size) m.set(u, ids)
    }
    return m
  }, [accountInfo])
  useEffect(() => {
    const id = setTimeout(() => setDq(q), 200)
    return () => clearTimeout(id)
  }, [q])
  const [eFrom, eTo] = rangeOf(period, today, fFrom, fTo) // 기간 칩 → 실제 범위
  const periodMode = !!eFrom || !!eTo // 기간 검색 → 월 그룹 대신 기간 1그룹

  // 필터 → 정렬 → 월별 그룹 → 그룹별 수입/지출 합계.
  const groups = useMemo(() => {
    const lo = numOf(fMin)
    const hi = numOf(fMax)
    const filtered = recent.filter((r) => {
      if (fGubun !== '전체' && r.gubun !== fGubun) return false
      if (fItemIds.size && !(r.itemId && fItemIds.has(r.itemId))) return false
      const accs = [r.accountId, r.toAccountId].filter((x): x is string => !!x)
      if (fAccountIds.size && !accs.some((x) => fAccountIds.has(x))) return false
      const uIds = fUser ? userAccIds.get(fUser) : undefined
      if (uIds && !accs.some((x) => uIds.has(x))) return false
      if (lo != null && Math.abs(r.principal ?? 0) < lo) return false
      if (hi != null && Math.abs(r.principal ?? 0) > hi) return false
      if (fCat && (!r.itemId || catOf.get(r.itemId) !== fCat)) return false
      if (fCur && r.currency !== fCur) return false
      if (eFrom && (r.date ?? '') < eFrom) return false
      if (eTo && (r.date ?? '') > eTo) return false
      return matchText(r, dq, (r.itemId ? nameOf.get(r.itemId) : '') ?? '')
    })
    const dir = sortDir === 'asc' ? 1 : -1
    filtered.sort((a, b) => {
      if (sortKey === 'amount') {
        const av = a.amountUsd ?? 0
        const bv = b.amountUsd ?? 0
        if (av !== bv) return (av - bv) * dir
        return (b.date ?? '').localeCompare(a.date ?? '') // 동액이면 최신 먼저
      }
      return (a.date ?? '').localeCompare(b.date ?? '') * dir
    })
    const map = new Map<string, InoutRow[]>()
    for (const r of filtered) {
      const key = periodMode ? '기간' : (r.date ?? '').slice(0, 7) || '날짜없음'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    // 월 그룹은 항상 최신월 먼저(정렬은 그룹 내부에만 적용). '날짜없음'은 맨 뒤.
    const keys = [...map.keys()].sort((a, b) => {
      if (a === '날짜없음') return 1
      if (b === '날짜없음') return -1
      return b.localeCompare(a)
    })
    return keys.map((key) => {
      const rows = map.get(key)!
      let inUsd = 0
      let outUsd = 0
      const net: Record<string, number> = { KRW: 0, HNL: 0, USD: 0 } // 통화별 순액(수입 + · 지출 − · 이체 제외)
      for (const r of rows) {
        const sign = r.gubun === '수입' ? 1 : r.gubun === '지출' ? -1 : 0
        if (sign === 1) inUsd += r.amountUsd ?? 0
        else if (sign === -1) outUsd += r.amountUsd ?? 0
        if (sign && r.currency && r.currency in net) net[r.currency] += sign * (r.principal ?? 0)
      }
      return { key, rows, inUsd, outUsd, net, netUsd: inUsd - outUsd }
    })
  }, [recent, fGubun, fItemIds, fAccountIds, fCat, fCur, fUser, userAccIds, fMin, fMax, eFrom, eTo, dq, sortKey, sortDir, catOf, nameOf, periodMode])

  const visibleIds = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.id)), [groups])
  // 항목 열 폭(em): 일반 행 = 항목 이름 1줄, 이체·조정 행 = 2줄 → 보이는 행 중 최대 필요폭. 통화 열 펼치면 65% 로 축소(내용 열 확보).
  const itemColEm = useMemo(() => {
    let need = 6
    for (const g of groups)
      for (const r of g.rows) {
        if (r.gubun === '이체') need = Math.max(need, emLen(`${nameOf.get(r.accountId ?? '') ?? '?'} → ${nameOf.get(r.toAccountId ?? '') ?? '?'}`) / 2)
        else if (r.gubun === '조정') need = Math.max(need, emLen(`잔액 조정 · ${nameOf.get(r.accountId ?? '') ?? '?'}`) / 2)
        else if (r.itemId) need = Math.max(need, emLen(nameOf.get(r.itemId) ?? ''))
      }
    const w = Math.min(22, need + 1.2)
    return showCur ? Math.max(7, w * 0.65) : w
  }, [groups, nameOf, showCur])
  const itemColStyle = { width: `${itemColEm}em`, minWidth: `${itemColEm}em`, maxWidth: `${itemColEm}em` }
  const shownCount = visibleIds.length
  const moreFilled = !!(fCat || fCur || fUser || fMin.trim() || fMax.trim())
  const hasFilter =
    fGubun !== '전체' ||
    fItemIds.size > 0 ||
    fAccountIds.size > 0 ||
    !!fCat ||
    !!fCur ||
    !!fUser ||
    !!fMin.trim() ||
    !!fMax.trim() ||
    period !== 'all' ||
    !!q.trim()

  // 필터·정렬이 바뀌면 선택을 초기화(보이지 않는 선택에 작업되는 혼란 방지).
  useEffect(() => {
    setSelected(new Set())
    setBulkOpen(false)
  }, [fGubun, fItemIds, fAccountIds, fCat, fCur, fUser, fMin, fMax, eFrom, eTo, dq, sortKey, sortDir])

  // 선택 행 분석 — 통합 수정 대상(수입·지출만), 구분 혼합 여부.
  const selRows = useMemo(() => recent.filter((r) => selected.has(r.id)), [recent, selected])
  const selCount = selRows.length
  const editableTargets = useMemo(
    () =>
      selRows
        .filter((r) => r.gubun === '수입' || r.gubun === '지출')
        .map((r) => ({ id: r.id, gubun: r.gubun as '수입' | '지출' })),
    [selRows],
  )
  const onlyGubun = useMemo(() => {
    const s = new Set(selRows.map((r) => r.gubun))
    return s.size === 1 ? [...s][0] : null
  }, [selRows])
  const itemEditable = onlyGubun === '수입' || onlyGubun === '지출'
  const bulkItemOptions = itemEditable ? activeOnly(options.items[onlyGubun as '수입' | '지출']) : []

  const allChecked = shownCount > 0 && visibleIds.every((id) => selected.has(id))
  const someChecked = visibleIds.some((id) => selected.has(id))
  const headRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = someChecked && !allChecked
  }, [someChecked, allChecked])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }
  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function resetFilters() {
    setFGubun('전체')
    setFItemIds(new Set())
    setFAccountIds(new Set())
    setFCat('')
    setFCur('')
    setFUser('')
    setFMin('')
    setFMax('')
    setPeriod('all')
    setFFrom('')
    setFTo('')
    setQ('')
    setDq('')
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAllVisible() {
    setSelected((prev) => {
      if (visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))) return new Set()
      return new Set(visibleIds)
    })
  }
  function clearSel() {
    setSelected(new Set())
    setBulkOpen(false)
  }

  async function onDelete(r: InoutRow) {
    if (
      !window.confirm(
        `이 거래를 삭제할까요?\n${r.date ?? ''} · ${r.name ?? ''} · ${fmtUsd(r.amountUsd)}\n(복구할 수 없습니다)`,
      )
    )
      return
    setBusyId(r.id)
    setErr('')
    const res = await deleteInout(r.id)
    setBusyId(null)
    if (res.ok) onAfterMutate()
    else setErr(res.error ?? '삭제 실패')
  }

  async function onBulkDelete() {
    if (selCount === 0) return
    if (!window.confirm(`선택한 ${selCount}건을 삭제할까요?\n(복구할 수 없습니다)`)) return
    setBulkBusy(true)
    setErr('')
    const res = await bulkDeleteInout([...selected])
    setBulkBusy(false)
    if (res.done > 0) {
      clearSel()
      onAfterMutate()
      if (!res.ok) setErr(`${res.done}건 삭제 · 일부 실패: ${res.error ?? ''}`)
    } else setErr(res.error ?? '삭제 실패')
  }

  async function onBulkPatch() {
    if (editableTargets.length === 0) {
      setErr('수입/지출 거래만 통합 수정할 수 있습니다')
      return
    }
    const patch: InoutPatch = {}
    if (itemEditable && bulkItemId && bulkItemOptions.some((o) => o.id === bulkItemId))
      patch.itemId = bulkItemId
    if (bulkAccountId) patch.accountId = bulkAccountId
    if (bulkDate) patch.date = bulkDate
    if (bulkName.trim()) patch.name = bulkName.trim()
    if (bulkVendor.trim()) patch.vendor = bulkVendor.trim()
    const rateNum = Number(bulkRate.replace(/,/g, ''))
    if (bulkRate.trim()) {
      if (!(rateNum > 0)) {
        setErr('환율은 0보다 커야 합니다')
        return
      }
      patch.rate = rateNum
    }
    if (onlyGubun === '수입' && bulkSupporter) patch.supporterId = bulkSupporter === '__clear__' ? '' : bulkSupporter
    if (Object.keys(patch).length === 0) {
      setErr('변경할 값을 하나 이상 입력하세요')
      return
    }
    setBulkBusy(true)
    setErr('')
    const res = await bulkPatchInout(editableTargets, patch)
    setBulkBusy(false)
    if (res.done > 0) {
      setBulkItemId('')
      setBulkAccountId('')
      setBulkDate('')
      setBulkName('')
      setBulkVendor('')
      setBulkRate('')
      setBulkSupporter('')
      clearSel()
      onAfterMutate()
      if (!res.ok) setErr(`${res.done}건 수정 · 일부 실패: ${res.error ?? ''}`)
    } else setErr(res.error ?? '수정 실패')
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')
  const colSpan = showCur ? 11 : 8 // 데스크탑 열 수(통화 3열 접힘 반영)
  const cbCls = 'h-4 w-4 shrink-0 cursor-pointer accent-[#661F20]'

  return (
    <section className="mt-6">
      {/* 검색·필터 — 연회색 면으로 목록과 분리(검색창은 흰 알약). 부품은 검색 화면(SearchFilters)과 공용 */}
      <div className="rounded-2xl bg-b27-card px-3 pb-3 pt-3 max-md:-mx-1">
      <SearchInput value={q} onChange={setQ} onCommit={setDq} recent={recentQs} className="[&>label]:border-0 [&>label]:bg-b27-paper" />
      <div className="mt-3 space-y-2">
        <PeriodFilter period={period} onPeriod={setPeriod} from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo} range={[eFrom, eTo]} />
        <ChipRow
          label="구분"
          options={GUBUN_FILTERS}
          value={fGubun}
          onChange={setFGubun}
        />
        <PickRow
          label="항목"
          text={fItemIds.size === 0 ? '전체 항목' : summary([...fItemIds].map((id) => nameOf.get(id) ?? '—'))}
          active={fItemIds.size > 0}
          onClick={() => setSheet('item')}
        />
        <PickRow
          label="계좌"
          text={fAccountIds.size === 0 ? '전체 계좌' : summary([...fAccountIds].map((id) => nameOf.get(id) ?? '—'))}
          active={fAccountIds.size > 0}
          onClick={() => setSheet('account')}
          right={<MoreToggle open={moreOpen} filled={moreFilled} onToggle={() => setMoreOpen(!moreOpen)} />}
        />
        {moreOpen && (
          <>
            <ChipRow label="분류" options={['', ...catOptions]} value={fCat} onChange={setFCat} labelOf={(c) => c || '전체'} />
            <ChipRow
              label="통화"
              options={CUR_FILTERS}
              value={fCur as (typeof CUR_FILTERS)[number]}
              onChange={setFCur}
              labelOf={(c) => (c ? CUR_SYMBOL[c] : '전체')}
            />
            {userAccIds.size > 0 && (
              <ChipRow label="사용자" options={['', ...userAccIds.keys()]} value={fUser} onChange={setFUser} labelOf={(u) => u || '전체'} />
            )}
            <AmountRange min={fMin} max={fMax} onMin={setFMin} onMax={setFMax} symbol={fCur ? CUR_SYMBOL[fCur] : '원금'} />
          </>
        )}
      </div>
      </div>
      {sheet === 'item' && <ItemSheet options={options} colors={itemColor} value={fItemIds} onChange={setFItemIds} onClose={() => setSheet(null)} />}
      {sheet === 'account' && (
        <AccountSheet options={options} cardIds={cardIds} value={fAccountIds} onChange={setFAccountIds} onClose={() => setSheet(null)} />
      )}

      <div className="mb-2 mt-4 flex items-center gap-3 px-1">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="checkbox"
            className={`${cbCls} @2xl:hidden`}
            checked={allChecked}
            onChange={toggleAllVisible}
            aria-label="전체 선택"
          />
          <h2 className="text-[13px] font-medium text-b27-muted">
            거래 내역
            <span className="ml-1.5 font-normal text-b27-muted">{shownCount}건</span>
          </h2>
          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-b27-line px-2.5 py-0.5 text-[11px] font-medium text-b27-muted transition hover:border-b27-ink"
            >
              필터 초기화
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 @2xl:hidden">
          <SortToggle
            sortKey={sortKey}
            sortDir={sortDir}
            onChange={(k, d) => {
              setSortKey(k)
              setSortDir(d)
            }}
          />
        </div>
      </div>

      {/* 선택 액션 바 */}
      {selCount > 0 && (
        <div className="mb-3 rounded-xl border border-b27-ink bg-b27-card px-2 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-b27-ink">{selCount}건 선택</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBulkOpen((o) => !o)}
                disabled={bulkBusy}
                className="rounded-lg border border-b27-line bg-b27-paper px-2.5 py-1 text-xs font-medium text-b27-ink transition hover:border-b27-ink disabled:opacity-40"
              >
                통합 수정
              </button>
              <button
                type="button"
                onClick={onBulkDelete}
                disabled={bulkBusy}
                className="rounded-lg border border-b27-line bg-b27-paper px-2.5 py-1 text-xs font-medium text-b27-ink transition hover:border-b27-ink disabled:opacity-40"
              >
                {bulkBusy ? '처리 중…' : '삭제'}
              </button>
              <button
                type="button"
                onClick={clearSel}
                disabled={bulkBusy}
                className="rounded-lg px-2 py-1 text-xs font-medium text-b27-muted transition hover:text-b27-ink disabled:opacity-40"
              >
                해제
              </button>
            </div>
          </div>

          {bulkOpen && (
            <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-b27-ink pt-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">항목 변경</label>
                <select
                  value={bulkItemId}
                  onChange={(e) => setBulkItemId(e.target.value)}
                  disabled={!itemEditable}
                  className={`${ctl} min-w-[110px] disabled:opacity-40`}
                >
                  <option value="">변경 안 함</option>
                  {bulkItemOptions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">계좌 변경</label>
                <select
                  value={bulkAccountId}
                  onChange={(e) => setBulkAccountId(e.target.value)}
                  className={`${ctl} min-w-[110px]`}
                >
                  <option value="">변경 안 함</option>
                  {options.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">날짜 변경</label>
                <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className={`${ctl} min-w-[130px]`} />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">내용 변경</label>
                <input
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="변경 안 함"
                  className={`${ctl} min-w-[120px]`}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">구매처 변경</label>
                <input
                  value={bulkVendor}
                  onChange={(e) => setBulkVendor(e.target.value)}
                  placeholder="변경 안 함"
                  className={`${ctl} min-w-[120px]`}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">환율 변경 (USD 제외)</label>
                <input
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  placeholder="변경 안 함"
                  className={`${ctl} min-w-[90px] text-right font-num`}
                />
              </div>
              {onlyGubun === '수입' && (
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-b27-muted">후원자 연결</label>
                  <select value={bulkSupporter} onChange={(e) => setBulkSupporter(e.target.value)} className={`${ctl} min-w-[120px]`}>
                    <option value="">변경 안 함</option>
                    <option value="__clear__">연결 해제</option>
                    {options.supporters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={onBulkPatch}
                disabled={bulkBusy}
                className="h-8 rounded-lg bg-b27-ink px-3 text-xs font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {bulkBusy ? '…' : '적용'}
              </button>
              {!itemEditable && (
                <p className="w-full text-[11px] text-b27-muted">
                  수입·지출이 섞여 있어 항목·후원자는 변경할 수 없습니다. (이체는 통합 수정 제외)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {err && <p className="mb-2 text-xs font-medium text-b27-ink">{err}</p>}

      {recent.length === 0 ? (
        <p className="py-4 text-center text-xs text-b27-muted">거래가 없습니다.</p>
      ) : shownCount === 0 ? (
        <p className="py-4 text-center text-xs text-b27-muted">조건에 맞는 거래가 없습니다.</p>
      ) : (
        <>
          {/* 데스크탑 — 통화 열 토글(표 바로 위) + 월별 그룹 테이블 */}
          <div className="mb-1.5 hidden justify-end @2xl:flex">
            <button
              type="button"
              onClick={() => setShowCur((v) => !v)}
              aria-pressed={showCur}
              className={`rounded-lg px-3 py-1 text-[12px] font-medium transition ${
                showCur ? 'bg-b27-ink text-white' : 'bg-b27-ink text-white hover:opacity-90'
              }`}
            >
              {showCur ? '통화 열 접기 ▾' : '원화·렘피라·달러 열 펼치기 ▸'}
            </button>
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-b27-line @2xl:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-b27-line bg-b27-card text-center text-[13px] font-medium text-b27-muted">
                  <th className="w-9 px-2 py-2">
                    <input
                      ref={headRef}
                      type="checkbox"
                      className={cbCls}
                      checked={allChecked}
                      onChange={toggleAllVisible}
                      aria-label="전체 선택"
                    />
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">구분</th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-2 py-2 font-medium hover:text-b27-ink"
                    onClick={() => toggleSort('date')}
                  >
                    날짜{arrow('date')}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium" style={itemColStyle}>항목</th>
                  <th className="w-full px-2 py-2 text-left font-medium">내용</th>
                  <th className="w-[9rem] max-w-[9rem] whitespace-nowrap px-2 py-2 font-medium">구매처</th>
                  {showCur && (
                    <>
                      <th className="whitespace-nowrap px-2 py-2 font-medium">원화 ₩</th>
                      <th className="whitespace-nowrap px-2 py-2 font-medium">렘피라 L</th>
                      <th className="whitespace-nowrap px-2 py-2 font-medium">달러 $</th>
                    </>
                  )}
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-2 py-2 font-medium hover:text-b27-ink"
                    onClick={() => toggleSort('amount')}
                  >
                    {`환산$${arrow('amount')}`}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">관리</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const isCollapsed = collapsed.has(g.key)
                return (
                  <tbody key={g.key} className="border-b border-b27-line last:border-0">
                    <tr className="bg-b27-card">
                      <td colSpan={colSpan} className="px-3 py-1.5">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(g.key)}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-b27-ink transition hover:text-b27-ink"
                          >
                            <span className="text-b27-muted">{isCollapsed ? '▸' : '▾'}</span>
                            {monthLabel(g.key)}
                            <span className="font-normal text-b27-muted">· {g.rows.length}건</span>
                          </button>
                          {isCollapsed && (
                            <span className="font-num text-[12px] font-medium">
                              <span className="text-b27-income">+{fmtUsd(g.inUsd)}</span>
                              <span className="mx-1.5 text-b27-muted">·</span>
                              <span className="text-b27-expense">−{fmtUsd(g.outUsd)}</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed &&
                      g.rows.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => onEdit(r)}
                          className={`cursor-pointer border-t border-b27-line transition hover:bg-b27-card ${
                            selected.has(r.id)
                              ? 'bg-b27-card'
                              : editingId === r.id
                                ? 'bg-b27-card'
                                : ''
                          }`}
                        >
                          <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className={cbCls}
                              checked={selected.has(r.id)}
                              onChange={() => toggleRow(r.id)}
                              aria-label="선택"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                r.gubun === '수입'
                                  ? 'bg-[#E1EAFB] text-b27-income'
                                  : r.gubun === '지출'
                                    ? 'bg-[#FBE1DF] text-b27-expense'
                                    : r.gubun === '이체'
                                      ? 'bg-b27-card text-b27-muted'
                                      : 'bg-b27-card text-b27-muted'
                              }`}
                            >
                              {r.gubun ?? '—'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-b27-muted">{r.date ?? '—'}</td>
                          {/* 항목 — 최대 2줄(대분류 + 이름 / 이체·조정은 line-clamp-2), 폭 제한 → 내용 열이 남는 폭 전부 */}
                          <td className="px-2 py-2 text-b27-ink" style={itemColStyle}>
                            {r.itemId && catOf.get(r.itemId) && (
                              <div className="whitespace-nowrap text-[10px] font-medium leading-tight text-b27-muted">
                                {catOf.get(r.itemId)}
                              </div>
                            )}
                            <div className={showCur ? 'leading-snug' : r.itemId ? 'whitespace-nowrap' : 'line-clamp-2 leading-snug'}>
                              {r.gubun === '이체'
                                ? `${nameOf.get(r.accountId ?? '') ?? '?'} → ${nameOf.get(r.toAccountId ?? '') ?? '?'}`
                                : r.gubun === '조정'
                                  ? `잔액 조정 · ${nameOf.get(r.accountId ?? '') ?? '?'}`
                                  : r.itemId
                                    ? (nameOf.get(r.itemId) ?? '—')
                                    : '—'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-b27-ink">
                            {r.name || '—'}
                            {r.receiptPath && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setReceiptRow(r)
                              }}
                              className="ml-1 align-middle text-[13px] leading-none opacity-70 transition hover:opacity-100"
                              aria-label="영수증 보기"
                              title="영수증"
                            >
                              📎
                            </button>
                          )}
                          </td>
                          <td className="max-w-[9rem] truncate px-2 py-2 text-b27-muted" title={r.vendor ?? undefined}>{r.vendor || '—'}</td>
                          {showCur && (
                            <>
                              <td className={`whitespace-nowrap px-2 py-2 text-right font-num ${gubunColor(r.gubun, r.amountUsd)}`}>
                                {fmtColCell(r.currency, 'KRW', r.principal)}
                              </td>
                              <td className={`whitespace-nowrap px-2 py-2 text-right font-num ${gubunColor(r.gubun, r.amountUsd)}`}>
                                {fmtColCell(r.currency, 'HNL', r.principal)}
                              </td>
                              <td className={`whitespace-nowrap px-2 py-2 text-right font-num ${gubunColor(r.gubun, r.amountUsd)}`}>
                                {fmtColCell(r.currency, 'USD', r.principal)}
                              </td>
                            </>
                          )}
                          <td className={`whitespace-nowrap px-2 py-2 text-right font-num font-medium ${gubunColor(r.gubun, r.amountUsd)}`}>
                            {fmtUsd(r.amountUsd)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => onDelete(r)}
                                disabled={busyId === r.id}
                                className="rounded-md border border-b27-line px-2 py-1 text-[11px] text-b27-muted transition hover:border-b27-ink hover:text-b27-ink disabled:opacity-40"
                              >
                                {busyId === r.id ? '…' : '삭제'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {!isCollapsed && (
                      <>
                        {/* 소계 ① 통화별 순액(수입 + · 지출 − · 이체 제외) + 환산$ — 통화 열 접힘이면 환산$만 */}
                        <tr className="border-t border-b27-line bg-b27-card font-num text-[12px] font-medium">
                          <td colSpan={6} className="px-3 py-1.5 text-right text-[11px] font-medium text-b27-muted">
                            {periodMode ? '기간 소계' : '월 소계'}
                          </td>
                          {showCur && (
                            <>
                              <td className={`whitespace-nowrap px-2 py-1.5 text-right ${signColor(g.net.KRW)}`}>{fmtNet('KRW', g.net.KRW)}</td>
                              <td className={`whitespace-nowrap px-2 py-1.5 text-right ${signColor(g.net.HNL)}`}>{fmtNet('HNL', g.net.HNL)}</td>
                              <td className={`whitespace-nowrap px-2 py-1.5 text-right ${signColor(g.net.USD)}`}>{fmtNet('USD', g.net.USD)}</td>
                            </>
                          )}
                          <td className={`whitespace-nowrap px-2 py-1.5 text-right ${signColor(g.netUsd)}`}>{fmtUsd(g.netUsd)}</td>
                          <td />
                        </tr>
                        {/* 소계 ② 환산$ 수입·지출 */}
                        <tr className="bg-b27-card">
                          <td colSpan={colSpan} className="px-3 pb-1.5 pt-0 text-right">
                            <span className="font-num text-[12px] font-medium text-b27-income">수입 {fmtUsd(g.inUsd)}</span>
                            <span className="mx-1.5 text-b27-muted">·</span>
                            <span className="font-num text-[12px] font-medium text-b27-expense">지출 {fmtUsd(g.outUsd)}</span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                )
              })}
            </table>
          </div>

          {/* 모바일 — 월별 그룹 카드 */}
          <div className="space-y-4 @2xl:hidden">
            {groups.map((g) => {
              const isCollapsed = collapsed.has(g.key)
              return (
                <div key={g.key}>
                  {/* 월 머리줄 — 그달 순액 부호 색 면(수입 초과 연한 파랑 · 지출 초과 연한 빨강) */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(g.key)}
                    className="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: g.inUsd - g.outUsd >= 0 ? '#E1EAFB' : '#FBE1DF' }}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-b27-ink">
                      <span className="text-b27-muted">{isCollapsed ? '▸' : '▾'}</span>
                      {monthLabel(g.key)}
                      <span className="font-normal text-b27-muted">· {g.rows.length}건</span>
                    </span>
                    <span className="font-num text-[11px] font-medium">
                      <span className="text-b27-income">+{fmtUsd(g.inUsd)}</span>
                      <span className="mx-1 text-b27-muted">·</span>
                      <span className="text-b27-expense">−{fmtUsd(g.outUsd)}</span>
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul>
                      {g.rows.map((r) => (
                        <li
                          key={r.id}
                          onClick={() => onEdit(r)}
                          className={`cursor-pointer border-b border-b27-line px-1 py-3 transition active:opacity-70 ${
                            selected.has(r.id) ? 'bg-b27-card' : editingId === r.id ? 'bg-b27-card' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* 좌: 체크박스 + 내용 */}
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <input
                                type="checkbox"
                                className={`${cbCls} mt-0.5`}
                                checked={selected.has(r.id)}
                                onChange={() => toggleRow(r.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="선택"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[14px] text-b27-ink">
                                  {r.itemId && (r.gubun === '수입' || r.gubun === '지출') && (
                                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: itemColor.get(r.itemId)?.fill ?? '#E4E7EC' }} aria-hidden="true" />
                                  )}
                                  <span className="truncate">
                                    {r.gubun === '이체'
                                      ? `${nameOf.get(r.accountId ?? '') ?? '?'} → ${nameOf.get(r.toAccountId ?? '') ?? '?'}`
                                      : r.gubun === '조정'
                                        ? `잔액 조정 · ${nameOf.get(r.accountId ?? '') ?? '?'}`
                                        : r.itemId
                                          ? (nameOf.get(r.itemId) ?? '')
                                          : ''}
                                    {r.name ? ` · ${r.name}` : ''}
                                  </span>
                                  {r.receiptPath && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setReceiptRow(r)
                                      }}
                                      className="shrink-0 text-[13px] leading-none opacity-70 transition hover:opacity-100"
                                      aria-label="영수증 보기"
                                      title="영수증"
                                    >
                                      📎
                                    </button>
                                  )}
                                </div>
                                <div className="mt-0.5 truncate font-num text-[11px] text-b27-muted">
                                  {(r.date ?? '').slice(5).replace('-', '/')}
                                  {r.vendor ? ` · ${r.vendor}` : ''}
                                  {r.gubun !== '이체' && r.accountId ? ` · ${nameOf.get(r.accountId) ?? ''}` : ''}
                                  {r.itemId && catOf.get(r.itemId) && (
                                    <span className={`ml-1.5 ${r.gubun === '수입' ? 'text-b27-income' : r.gubun === '지출' ? 'text-b27-expense' : ''}`}>{catOf.get(r.itemId)}</span>
                                  )}
                                  {r.gubun === '이체' || r.gubun === '조정' ? <span className="ml-1.5">{r.gubun}</span> : null}
                                </div>
                              </div>
                            </div>
                            {/* 우: 금액(원금 + USD) — 삭제는 체크 선택 → 선택 액션 바 */}
                            <span className="shrink-0 text-right">
                              <span className={`block font-num text-[15px] font-medium ${gubunColor(r.gubun, r.amountUsd)}`}>
                                {fmtLocal(r.currency, r.principal)}
                              </span>
                              {r.currency !== 'USD' && (
                                <span className="block font-num text-[11px] text-b27-muted">
                                  {fmtUsd(r.amountUsd)}
                                </span>
                              )}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!isCollapsed && (
                    <div className="mt-2 flex justify-end gap-3 px-1 font-num text-[11px] font-medium">
                      <span className="text-b27-income">수입 {fmtUsd(g.inUsd)}</span>
                      <span className="text-b27-expense">지출 {fmtUsd(g.outUsd)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
      {receiptRow?.receiptPath && (
        <ReceiptViewer
          inoutId={receiptRow.id}
          path={receiptRow.receiptPath}
          date={receiptRow.date}
          title={[receiptRow.date, receiptRow.name || receiptRow.vendor].filter(Boolean).join(' · ')}
          onClose={() => setReceiptRow(null)}
        />
      )}
    </section>
  )
}
