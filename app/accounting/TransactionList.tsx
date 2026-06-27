'use client'
// MFH-ACCOUNTING-TXLIST-V3
// 거래 내역 — 월별 그룹화 + 월별 수입/지출 합계 + 필터(구분·대분류·항목·통화·계좌·기간·이름) + 정렬(날짜·금액).
// 행 클릭 → 수정(onEdit, 기록 페이지로 이동) · 행별 삭제 + 다중선택 → 일괄 삭제 / 통합 수정(항목·계좌). 노션(SoT) read, 변경은 server action.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AcctOptions, InoutRow, InoutPatch } from '@/lib/notion'
import { deleteInout, bulkDeleteInout, bulkPatchInout } from './actions'

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
// 통화 기호 — 모바일 카드에서 원금 앞에 붙인다.
const CUR_SYMBOL: Record<string, string> = { KRW: '₩', USD: '$', HNL: 'L' }
// 현지통화 원금(기호 + 천단위, 소수 최대 2) — 모바일.
function fmtLocal(cur: string | null, n: number | null): string {
  if (n == null) return '—'
  const sym = cur ? (CUR_SYMBOL[cur] ?? '') : ''
  return `${sym}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}
// 데스크탑 통화열 — 행 통화가 열 통화와 같을 때만 숫자(기호는 열 제목이 대신).
function fmtColCell(rowCur: string | null, colCur: string, n: number | null): string {
  if (rowCur !== colCur || n == null) return ''
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
function monthLabel(key: string): string {
  if (key === '날짜없음') return '날짜 없음'
  const [y, m] = key.split('-')
  return `${y}년 ${Number(m)}월`
}

type SortKey = 'date' | 'amount'
type GubunFilter = '전체' | '수입' | '지출'

const ctl =
  'h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none transition focus:border-primary'

export default function TransactionList({
  recent,
  options,
  editingId,
  onEdit,
  onAfterMutate,
}: {
  recent: InoutRow[]
  options: AcctOptions
  editingId: string | null
  onEdit: (r: InoutRow) => void
  onAfterMutate: () => void
}) {
  const [fGubun, setFGubun] = useState<GubunFilter>('전체')
  const [fItemId, setFItemId] = useState('')
  const [fAccountId, setFAccountId] = useState('')
  const [fCat, setFCat] = useState('')
  const [fCur, setFCur] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  // 다중선택 / 일괄 작업
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkItemId, setBulkItemId] = useState('')
  const [bulkAccountId, setBulkAccountId] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    for (const a of options.accounts) m.set(a.id, a.name)
    return m
  }, [options])

  // 항목 id → 대분류(노션 `대분류`) — 거래 행에 소분류와 함께 표기.
  const catOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']])
      if (i.category) m.set(i.id, i.category)
    return m
  }, [options])

  // 대분류 필터 옵션 — 항목의 `대분류` 고유값(폼과 동일 순서).
  const catOptions = useMemo(() => {
    const ORDER = ['후원', '헌금', '기타수입', '사역', '차량', '생활', '운영/행정']
    const s = new Set<string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) if (i.category) s.add(i.category)
    return [...s].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
  }, [options])

  // 항목 필터 옵션 — 구분 필터에 맞춰 좁힌다.
  const itemOptions = useMemo(() => {
    if (fGubun === '수입') return options.items['수입']
    if (fGubun === '지출') return options.items['지출']
    return [...options.items['수입'], ...options.items['지출']]
  }, [options, fGubun])

  // 필터 → 정렬 → 월별 그룹 → 그룹별 수입/지출 합계.
  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const filtered = recent.filter((r) => {
      if (fGubun !== '전체' && r.gubun !== fGubun) return false
      if (fItemId && r.itemId !== fItemId) return false
      if (fAccountId && r.accountId !== fAccountId) return false
      if (fCat && (!r.itemId || catOf.get(r.itemId) !== fCat)) return false
      if (fCur && r.currency !== fCur) return false
      if (fFrom && (r.date ?? '') < fFrom) return false
      if (fTo && (r.date ?? '') > fTo) return false
      if (ql && !(r.name ?? '').toLowerCase().includes(ql)) return false
      return true
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
      const key = (r.date ?? '').slice(0, 7) || '날짜없음'
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
      for (const r of rows) {
        if (r.gubun === '수입') inUsd += r.amountUsd ?? 0
        else if (r.gubun === '지출') outUsd += r.amountUsd ?? 0
      }
      return { key, rows, inUsd, outUsd }
    })
  }, [recent, fGubun, fItemId, fAccountId, fCat, fCur, fFrom, fTo, q, sortKey, sortDir, catOf])

  const visibleIds = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.id)), [groups])
  const shownCount = visibleIds.length
  const hasFilter =
    fGubun !== '전체' ||
    !!fItemId ||
    !!fAccountId ||
    !!fCat ||
    !!fCur ||
    !!fFrom ||
    !!fTo ||
    !!q.trim()

  // 필터·정렬이 바뀌면 선택을 초기화(보이지 않는 선택에 작업되는 혼란 방지).
  useEffect(() => {
    setSelected(new Set())
    setBulkOpen(false)
  }, [fGubun, fItemId, fAccountId, fCat, fCur, fFrom, fTo, q, sortKey, sortDir])

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
  const bulkItemOptions = itemEditable ? options.items[onlyGubun as '수입' | '지출'] : []

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
    setFItemId('')
    setFAccountId('')
    setFCat('')
    setFCur('')
    setFFrom('')
    setFTo('')
    setQ('')
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
        `이 거래를 삭제할까요?\n${r.date ?? ''} · ${r.name ?? ''} · ${fmtUsd(r.amountUsd)}\n(노션 휴지통으로 — 복구 가능)`,
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
    if (!window.confirm(`선택한 ${selCount}건을 삭제할까요?\n(노션 휴지통으로 — 복구 가능)`)) return
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
    if (!patch.itemId && !patch.accountId) {
      setErr('변경할 항목 또는 계좌를 선택하세요')
      return
    }
    setBulkBusy(true)
    setErr('')
    const res = await bulkPatchInout(editableTargets, patch)
    setBulkBusy(false)
    if (res.done > 0) {
      setBulkItemId('')
      setBulkAccountId('')
      clearSel()
      onAfterMutate()
      if (!res.ok) setErr(`${res.done}건 수정 · 일부 실패: ${res.error ?? ''}`)
    } else setErr(res.error ?? '수정 실패')
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')
  const cbCls = 'h-4 w-4 shrink-0 cursor-pointer accent-[#661F20]'

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className={`${cbCls} md:hidden`}
            checked={allChecked}
            onChange={toggleAllVisible}
            aria-label="전체 선택"
          />
          <h2 className="text-[13px] font-bold text-muted">
            거래 내역
            <span className="ml-1.5 font-normal text-faint">{shownCount}건</span>
          </h2>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-muted transition hover:border-primary"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 필터 바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-8 overflow-hidden rounded-lg border border-line text-xs">
          {(['전체', '수입', '지출'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setFGubun(g)
                setFItemId('')
              }}
              className={`flex items-center justify-center px-3 ${
                fGubun === g
                  ? g === '수입'
                    ? 'bg-emerald-100 font-bold text-emerald-700'
                    : g === '지출'
                      ? 'bg-red-100 font-bold text-red-700'
                      : 'bg-primary-soft font-bold text-primary'
                  : 'text-faint'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={`${ctl} min-w-[88px]`}>
          <option value="">분류 전체</option>
          {catOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={fItemId} onChange={(e) => setFItemId(e.target.value)} className={`${ctl} min-w-[96px]`}>
          <option value="">항목 전체</option>
          {itemOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <select value={fCur} onChange={(e) => setFCur(e.target.value)} className={`${ctl} min-w-[72px]`}>
          <option value="">통화 전체</option>
          <option value="KRW">KRW</option>
          <option value="USD">USD</option>
          <option value="HNL">HNL</option>
        </select>
        <select
          value={fAccountId}
          onChange={(e) => setFAccountId(e.target.value)}
          className={`${ctl} min-w-[96px]`}
        >
          <option value="">계좌 전체</option>
          {options.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색"
          className={`${ctl} min-w-[120px] flex-1`}
        />
        <div className="flex h-8 items-center gap-1 md:hidden">
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={ctl}>
            <option value="date">날짜순</option>
            <option value="amount">금액순</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className={`${ctl} px-2`}
            aria-label="정렬 방향"
          >
            {sortDir === 'asc' ? '오름 ↑' : '내림 ↓'}
          </button>
        </div>
        {/* 기간 — 시작·종료(날짜 범위) */}
        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <span className="text-[11px] text-faint">기간</span>
          <input
            type="date"
            value={fFrom}
            onChange={(e) => setFFrom(e.target.value)}
            className={`${ctl} flex-1 sm:flex-none`}
            aria-label="시작일"
          />
          <span className="text-faint">~</span>
          <input
            type="date"
            value={fTo}
            onChange={(e) => setFTo(e.target.value)}
            className={`${ctl} flex-1 sm:flex-none`}
            aria-label="종료일"
          />
        </div>
      </div>

      {/* 선택 액션 바 */}
      {selCount > 0 && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary-soft px-2 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-primary">{selCount}건 선택</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBulkOpen((o) => !o)}
                disabled={bulkBusy}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition hover:border-primary disabled:opacity-40"
              >
                통합 수정
              </button>
              <button
                type="button"
                onClick={onBulkDelete}
                disabled={bulkBusy}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-accent transition hover:border-accent disabled:opacity-40"
              >
                {bulkBusy ? '처리 중…' : '삭제'}
              </button>
              <button
                type="button"
                onClick={clearSel}
                disabled={bulkBusy}
                className="rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:text-ink disabled:opacity-40"
              >
                해제
              </button>
            </div>
          </div>

          {bulkOpen && (
            <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-primary/20 pt-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-faint">항목 변경</label>
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
                <label className="mb-0.5 block text-[10px] font-medium text-faint">계좌 변경</label>
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
              <button
                type="button"
                onClick={onBulkPatch}
                disabled={bulkBusy}
                className="h-8 rounded-lg bg-accent px-3 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {bulkBusy ? '…' : '적용'}
              </button>
              {!itemEditable && (
                <p className="w-full text-[11px] text-faint">
                  수입·지출이 섞여 있어 계좌만 변경할 수 있습니다. (이체는 통합 수정 제외)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {err && <p className="mb-2 text-xs font-medium text-accent">{err}</p>}

      {recent.length === 0 ? (
        <p className="py-4 text-center text-xs text-faint">거래가 없습니다.</p>
      ) : shownCount === 0 ? (
        <p className="py-4 text-center text-xs text-faint">조건에 맞는 거래가 없습니다.</p>
      ) : (
        <>
          {/* 데스크탑 — 월별 그룹 테이블 */}
          <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-subtle text-center text-[13px] font-medium text-muted">
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
                  <th className="px-2 py-2 font-medium">구분</th>
                  <th
                    className="cursor-pointer select-none px-2 py-2 font-medium hover:text-primary"
                    onClick={() => toggleSort('date')}
                  >
                    날짜{arrow('date')}
                  </th>
                  <th className="px-2 py-2 font-medium">항목</th>
                  <th className="px-2 py-2 font-medium">적요</th>
                  <th className="px-2 py-2 font-medium">원화</th>
                  <th className="px-2 py-2 font-medium">렘피라</th>
                  <th className="px-2 py-2 font-medium">달러</th>
                  <th
                    className="cursor-pointer select-none px-2 py-2 font-medium hover:text-primary"
                    onClick={() => toggleSort('amount')}
                  >
                    {`환산$${arrow('amount')}`}
                  </th>
                  <th className="px-2 py-2 font-medium">관리</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const isCollapsed = collapsed.has(g.key)
                return (
                  <tbody key={g.key} className="border-b border-line last:border-0">
                    <tr className="bg-surface-subtle/60">
                      <td colSpan={10} className="px-3 py-1.5">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(g.key)}
                            className="flex items-center gap-1.5 text-[12px] font-bold text-ink transition hover:text-primary"
                          >
                            <span className="text-faint">{isCollapsed ? '▸' : '▾'}</span>
                            {monthLabel(g.key)}
                            <span className="font-normal text-faint">· {g.rows.length}건</span>
                          </button>
                          {isCollapsed && (
                            <span className="font-display text-[12px] font-medium">
                              <span className="text-emerald-700">+{fmtUsd(g.inUsd)}</span>
                              <span className="mx-1.5 text-faint">·</span>
                              <span className="text-red-700">−{fmtUsd(g.outUsd)}</span>
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
                          className={`cursor-pointer border-t border-line transition hover:bg-surface-subtle/50 ${
                            selected.has(r.id)
                              ? 'bg-primary-soft/60'
                              : editingId === r.id
                                ? 'bg-primary-soft'
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
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : r.gubun === '지출'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-surface-subtle text-faint'
                              }`}
                            >
                              {r.gubun ?? '—'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-muted">{r.date ?? '—'}</td>
                          <td className="px-2 py-2 text-ink">
                            {r.itemId && catOf.get(r.itemId) && (
                              <div className="text-[10px] font-medium leading-tight text-faint">
                                {catOf.get(r.itemId)}
                              </div>
                            )}
                            {r.itemId ? (nameOf.get(r.itemId) ?? '—') : '—'}
                          </td>
                          <td className="px-2 py-2 text-ink">{r.name ?? '—'}</td>
                          <td className="px-2 py-2 text-right font-display text-muted">
                            {fmtColCell(r.currency, 'KRW', r.principal)}
                          </td>
                          <td className="px-2 py-2 text-right font-display text-muted">
                            {fmtColCell(r.currency, 'HNL', r.principal)}
                          </td>
                          <td className="px-2 py-2 text-right font-display text-muted">
                            {fmtColCell(r.currency, 'USD', r.principal)}
                          </td>
                          <td className="px-2 py-2 text-right font-display font-bold text-ink">
                            {fmtUsd(r.amountUsd)}
                          </td>
                          <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => onDelete(r)}
                                disabled={busyId === r.id}
                                className="rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
                              >
                                {busyId === r.id ? '…' : '삭제'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {!isCollapsed && (
                      <tr className="border-t border-line bg-surface-subtle/60">
                        <td colSpan={10} className="px-3 py-1.5 text-right">
                          <span className="text-[11px] text-faint">월 합계</span>
                          <span className="ml-2 font-display text-[12px] font-bold text-emerald-700">
                            수입 {fmtUsd(g.inUsd)}
                          </span>
                          <span className="mx-1.5 text-faint">·</span>
                          <span className="font-display text-[12px] font-bold text-red-700">
                            지출 {fmtUsd(g.outUsd)}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                )
              })}
            </table>
          </div>

          {/* 모바일 — 월별 그룹 카드 */}
          <div className="space-y-4 md:hidden">
            {groups.map((g) => {
              const isCollapsed = collapsed.has(g.key)
              return (
                <div key={g.key}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(g.key)}
                    className="mb-2 flex w-full items-center justify-between px-1"
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                      <span className="text-faint">{isCollapsed ? '▸' : '▾'}</span>
                      {monthLabel(g.key)}
                      <span className="font-normal text-faint">· {g.rows.length}건</span>
                    </span>
                    <span className="font-display text-[11px] font-medium">
                      <span className="text-emerald-700">+{fmtUsd(g.inUsd)}</span>
                      <span className="mx-1 text-faint">·</span>
                      <span className="text-red-700">−{fmtUsd(g.outUsd)}</span>
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul className="space-y-2">
                      {g.rows.map((r) => (
                        <li
                          key={r.id}
                          onClick={() => onEdit(r)}
                          className={`cursor-pointer rounded-xl border bg-surface p-3 transition active:scale-[0.99] ${
                            selected.has(r.id)
                              ? 'border-primary ring-1 ring-primary/30'
                              : editingId === r.id
                                ? 'border-primary'
                                : 'border-line'
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
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      r.gubun === '수입'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : r.gubun === '지출'
                                          ? 'bg-red-50 text-red-700'
                                          : 'bg-surface-subtle text-faint'
                                    }`}
                                  >
                                    {r.gubun ?? '—'}
                                  </span>
                                  {r.itemId && catOf.get(r.itemId) && (
                                    <span className="text-[11px] font-medium text-faint">
                                      {catOf.get(r.itemId)}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-ink">
                                  {r.itemId ? (nameOf.get(r.itemId) ?? '') : ''}
                                  {r.name ? ` · ${r.name}` : ''}
                                </div>
                                <div className="mt-0.5 text-xs text-faint">
                                  {r.date ?? ''}
                                  {r.accountId ? ` · ${nameOf.get(r.accountId) ?? ''}` : ''}
                                </div>
                              </div>
                            </div>
                            {/* 우: 금액 + 삭제 */}
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className="text-right">
                                <span className="block font-display text-[15px] font-bold text-ink">
                                  {fmtLocal(r.currency, r.principal)}
                                </span>
                                {r.currency !== 'USD' && (
                                  <span className="block font-display text-[11px] text-faint">
                                    {fmtUsd(r.amountUsd)}
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(r)
                                }}
                                disabled={busyId === r.id}
                                className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition hover:border-accent hover:text-accent active:scale-[0.98] disabled:opacity-40"
                              >
                                {busyId === r.id ? '…' : '삭제'}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!isCollapsed && (
                    <div className="mt-2 flex justify-end gap-3 px-1 font-display text-[11px] font-bold">
                      <span className="text-emerald-700">수입 {fmtUsd(g.inUsd)}</span>
                      <span className="text-red-700">지출 {fmtUsd(g.outUsd)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
