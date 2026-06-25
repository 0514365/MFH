'use client'
// MFH-ACCOUNTING-TXLIST-V1
// 거래 내역 — 월별 그룹화 + 월별 수입/지출 합계 + 필터(구분·항목·계좌·이름) + 정렬(날짜·금액). 행별 수정·삭제.
// 데이터는 page.tsx 가 노션에서 전체 read → AccountingForm → 여기로 전달. 삭제는 server action(노션 SoT).
// (다중선택·다중삭제·통합수정은 b단계에서 추가 예정)
import { useMemo, useState } from 'react'
import type { AcctOptions, InoutRow } from '@/lib/notion'
import { deleteInout } from './actions'

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    for (const a of options.accounts) m.set(a.id, a.name)
    return m
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
  }, [recent, fGubun, fItemId, fAccountId, q, sortKey, sortDir])

  const shownCount = useMemo(() => groups.reduce((s, g) => s + g.rows.length, 0), [groups])
  const hasFilter = fGubun !== '전체' || !!fItemId || !!fAccountId || !!q.trim()

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
    setQ('')
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

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-bold text-muted">
          거래 내역
          <span className="ml-1.5 font-normal text-faint">{shownCount}건</span>
        </h2>
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
        {/* 구분 토글 */}
        <div className="flex h-8 overflow-hidden rounded-lg border border-line text-xs">
          {(['전체', '수입', '지출'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setFGubun(g)
                setFItemId('') // 구분 바뀌면 항목 필터 리셋
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
        {/* 항목 */}
        <select value={fItemId} onChange={(e) => setFItemId(e.target.value)} className={`${ctl} min-w-[96px]`}>
          <option value="">항목 전체</option>
          {itemOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {/* 계좌 */}
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
        {/* 이름 검색 */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색"
          className={`${ctl} min-w-[120px] flex-1`}
        />
        {/* 정렬 — 모바일 보조(데스크탑은 헤더 클릭) */}
        <div className="flex h-8 items-center gap-1 md:hidden">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className={`${ctl}`}
          >
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
      </div>

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
                <tr className="border-b border-line bg-surface-subtle text-left text-[11px] text-faint">
                  <th className="px-3 py-2 font-medium">구분</th>
                  <th
                    className="cursor-pointer select-none px-3 py-2 font-medium hover:text-primary"
                    onClick={() => toggleSort('date')}
                  >
                    날짜{arrow('date')}
                  </th>
                  <th className="px-3 py-2 font-medium">항목</th>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th
                    className="cursor-pointer select-none px-3 py-2 text-right font-medium hover:text-primary"
                    onClick={() => toggleSort('amount')}
                  >
                    환산 (USD){arrow('amount')}
                  </th>
                  <th className="px-3 py-2 font-medium">계좌</th>
                  <th className="px-3 py-2 text-right font-medium">관리</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const isCollapsed = collapsed.has(g.key)
                return (
                  <tbody key={g.key} className="border-b border-line last:border-0">
                    {/* 그룹 헤더 */}
                    <tr className="bg-surface-subtle/60">
                      <td colSpan={7} className="px-3 py-1.5">
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
                    {/* 거래 행 */}
                    {!isCollapsed &&
                      g.rows.map((r) => (
                        <tr
                          key={r.id}
                          className={`border-t border-line ${editingId === r.id ? 'bg-primary-soft' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
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
                          <td className="px-3 py-2 text-muted">{r.date ?? '—'}</td>
                          <td className="px-3 py-2 text-ink">
                            {r.itemId ? (nameOf.get(r.itemId) ?? '—') : '—'}
                          </td>
                          <td className="px-3 py-2 text-ink">{r.name ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-display font-bold text-ink">
                            {fmtUsd(r.amountUsd)}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {r.accountId ? (nameOf.get(r.accountId) ?? '—') : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEdit(r)}
                                className="rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-primary hover:text-primary"
                              >
                                수정
                              </button>
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
                    {/* 그룹 합계(하단) */}
                    {!isCollapsed && (
                      <tr className="border-t border-line bg-surface-subtle/60">
                        <td colSpan={7} className="px-3 py-1.5 text-right">
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
                          className={`rounded-xl border bg-surface p-3 ${editingId === r.id ? 'border-primary' : 'border-line'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                r.gubun === '수입'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : r.gubun === '지출'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-surface-subtle text-faint'
                              }`}
                            >
                              {r.gubun ?? '—'}
                            </span>
                            <span className="font-display text-[14px] font-bold text-ink">
                              {fmtUsd(r.amountUsd)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-ink">
                            {r.itemId ? (nameOf.get(r.itemId) ?? '') : ''}
                            {r.name ? ` · ${r.name}` : ''}
                          </div>
                          <div className="mt-0.5 text-xs text-faint">
                            {r.date ?? ''}
                            {r.accountId ? ` · ${nameOf.get(r.accountId) ?? ''}` : ''}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => onEdit(r)}
                              className="flex-1 rounded-md border border-line py-1.5 text-[12px] text-muted transition active:scale-[0.98]"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(r)}
                              disabled={busyId === r.id}
                              className="flex-1 rounded-md border border-line py-1.5 text-[12px] text-muted transition active:scale-[0.98] disabled:opacity-40"
                            >
                              {busyId === r.id ? '…' : '삭제'}
                            </button>
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
