'use client'
// MFH-ACCOUNTING-FORM-V2
// 회계 입력·수정·삭제 — 데스크탑 가로(스프레드시트)·모바일 세로. 조건부 콤보·환산 자동·후원자 자동연결.
// 입력 폼 + 최근 거래 목록 통합(편집 모드 상태 공유). 저장/수정/삭제는 server action → 노션(SoT).
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions, InoutRow } from '@/lib/notion'
import { saveInout, updateInout, deleteInout } from './actions'

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// 금액 입력 — 숫자·소수점만 남긴 raw(점 1개만).
function cleanNumeric(v: string): string {
  const c = v.replace(/[^\d.]/g, '')
  const parts = c.split('.')
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : c
}
// raw 숫자 → 천단위 쉼표(소수부 유지).
function withCommas(raw: string): string {
  if (!raw) return ''
  const [int, dec] = raw.split('.')
  const i = int ? Number(int).toLocaleString('en-US') : '0'
  return dec !== undefined ? `${i}.${dec}` : i
}
function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inp =
  'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'
const labelCls = 'mb-1 block whitespace-nowrap text-[11px] font-medium text-faint'

export default function AccountingForm({
  options,
  recent,
}: {
  options: AcctOptions
  recent: InoutRow[]
}) {
  const router = useRouter()
  const [gubun, setGubun] = useState<'수입' | '지출'>('수입')
  const [date, setDate] = useState(todayLocal)
  const [itemId, setItemId] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'HNL'>('KRW')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const items = options.items[gubun]
  const donationId = useMemo(
    () => options.items['수입'].find((i) => i.name === '후원금')?.id ?? '',
    [options],
  )
  const isDonation = gubun === '수입' && itemId === donationId
  const usd = currency === 'USD'
  const amountUsd = useMemo(() => {
    const p = Number(principal)
    if (!p) return 0
    if (usd) return p
    const r = Number(rate)
    return r > 0 ? p / r : 0
  }, [principal, rate, usd])

  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    for (const a of options.accounts) m.set(a.id, a.name)
    return m
  }, [options])

  function reset() {
    setEditingId(null)
    setItemId('')
    setName('')
    setPrincipal('')
    setRate('')
    setAccountId('')
    setErr('')
  }

  function startEdit(r: InoutRow) {
    setErr('')
    setGubun(r.gubun === '지출' ? '지출' : '수입')
    setDate(r.date ?? todayLocal())
    setItemId(r.itemId ?? '')
    setName(r.name ?? '')
    setCurrency(r.currency === 'USD' || r.currency === 'HNL' ? r.currency : 'KRW')
    setPrincipal(r.principal != null ? String(r.principal) : '')
    setRate(r.rate != null ? String(r.rate) : '')
    setAccountId(r.accountId ?? '')
    setEditingId(r.id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSave() {
    setErr('')
    if (!itemId) return setErr('항목을 선택하세요')
    if (!principal || Number(principal) <= 0) return setErr('금액을 입력하세요')
    if (!usd && (!rate || Number(rate) <= 0)) return setErr('환율을 입력하세요')
    const supporterId = isDonation
      ? (options.supporters.find((s) => s.name.trim() === name.trim())?.id ?? null)
      : null
    const payload = {
      gubun,
      date,
      itemId,
      name: name.trim(),
      currency,
      principal: Number(principal),
      rate: usd ? 1 : Number(rate),
      amountUsd: Math.round(amountUsd * 100) / 100,
      accountId: accountId || null,
      supporterId,
    }
    setSaving(true)
    const res = editingId ? await updateInout(editingId, payload) : await saveInout(payload)
    setSaving(false)
    if (res.ok) {
      reset()
      router.refresh()
    } else {
      setErr(res.error ?? '저장 실패')
    }
  }

  async function onDelete(r: InoutRow) {
    if (
      !window.confirm(
        `이 거래를 삭제할까요?\n${r.date ?? ''} · ${r.name ?? ''} · ${fmtUsd(r.amountUsd)}\n(노션 휴지통으로 — 복구 가능)`,
      )
    )
      return
    setBusyId(r.id)
    const res = await deleteInout(r.id)
    setBusyId(null)
    if (res.ok) {
      if (editingId === r.id) reset()
      router.refresh()
    } else {
      setErr(res.error ?? '삭제 실패')
    }
  }

  return (
    <div>
      {/* 입력 / 수정 폼 */}
      <section className="rounded-2xl border border-line bg-surface p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            {editingId ? 'Edit entry · 수정 중' : 'New entry'}
          </div>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-line px-3 py-1 text-[11px] font-medium text-muted transition hover:border-primary"
            >
              수정 취소
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:gap-2">
          {/* 구분 토글 */}
          <div className="md:w-[92px] md:shrink-0">
            <label className={labelCls}>구분</label>
            <div className="flex h-9 overflow-hidden rounded-lg border border-line text-sm">
              <button
                type="button"
                onClick={() => {
                  setGubun('수입')
                  setItemId('')
                }}
                className={`flex flex-1 items-center justify-center ${gubun === '수입' ? 'bg-emerald-100 font-bold text-emerald-700' : 'text-faint'}`}
              >
                수입
              </button>
              <button
                type="button"
                onClick={() => {
                  setGubun('지출')
                  setItemId('')
                }}
                className={`flex flex-1 items-center justify-center ${gubun === '지출' ? 'bg-red-100 font-bold text-red-700' : 'text-faint'}`}
              >
                지출
              </button>
            </div>
          </div>

          {/* 날짜 */}
          <div className="md:w-[130px] md:shrink-0">
            <label className={labelCls}>날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </div>

          {/* 항목 */}
          <div className="md:min-w-0 md:flex-1">
            <label className={labelCls}>항목</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={inp}>
              <option value="">선택</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          {/* 이름 (후원금이면 후원자 콤보 + 자유입력) */}
          <div className="md:min-w-0 md:flex-1">
            <label className={labelCls}>이름{isDonation ? ' · 후원자' : ''}</label>
            <input
              list={isDonation ? 'acct-sup-list' : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDonation ? '후원자 (단체·무명 직접)' : ''}
              className={inp}
            />
            {isDonation && (
              <datalist id="acct-sup-list">
                {options.supporters.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            )}
          </div>

          {/* 통화 */}
          <div className="md:w-[78px] md:shrink-0">
            <label className={labelCls}>통화</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'KRW' | 'USD' | 'HNL')}
              className={inp}
            >
              <option value="KRW">KRW</option>
              <option value="USD">USD</option>
              <option value="HNL">HNL</option>
            </select>
          </div>

          {/* 금액(현지) */}
          <div className="md:w-[96px] md:shrink-0">
            <label className={labelCls}>금액</label>
            <input
              type="text"
              inputMode="decimal"
              value={withCommas(principal)}
              onChange={(e) => setPrincipal(cleanNumeric(e.target.value))}
              className={`${inp} text-right`}
            />
          </div>

          {/* 환율 */}
          <div className="md:w-[78px] md:shrink-0">
            <label className={labelCls}>환율</label>
            <input
              type="number"
              inputMode="decimal"
              value={usd ? '1' : rate}
              onChange={(e) => setRate(e.target.value)}
              disabled={usd}
              className={`${inp} text-right disabled:opacity-40`}
            />
          </div>

          {/* 환산(USD, 자동) */}
          <div className="md:w-[88px] md:shrink-0">
            <label className={labelCls}>환산 $</label>
            <div className="flex h-9 items-center justify-end rounded-lg border border-dashed border-line bg-surface-subtle px-2 text-sm text-muted">
              {amountUsd
                ? `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
          </div>

          {/* 계좌 */}
          <div className="md:min-w-0 md:flex-1">
            <label className={labelCls}>{gubun === '수입' ? '입금계좌' : '지불계좌'}</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inp}>
              <option value="">선택</option>
              {options.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* 저장 / 수정 */}
          <div className="md:w-[72px] md:shrink-0">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-accent text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? '…' : editingId ? '수정' : '저장'}
            </button>
          </div>
        </div>

        {err && <p className="mt-2 text-xs font-medium text-accent">{err}</p>}
      </section>

      {/* 최근 거래 */}
      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[13px] font-bold text-muted">최근 거래</h2>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-faint">거래가 없습니다.</p>
        ) : (
          <>
            {/* 데스크탑 — 테이블 */}
            <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-left text-[11px] text-faint">
                    <th className="px-3 py-2 font-medium">구분</th>
                    <th className="px-3 py-2 font-medium">날짜</th>
                    <th className="px-3 py-2 font-medium">항목</th>
                    <th className="px-3 py-2 font-medium">이름</th>
                    <th className="px-3 py-2 text-right font-medium">환산 (USD)</th>
                    <th className="px-3 py-2 font-medium">계좌</th>
                    <th className="px-3 py-2 text-right font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-line last:border-0 ${editingId === r.id ? 'bg-primary-soft' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.gubun === '수입' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                        >
                          {r.gubun ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted">{r.date ?? '—'}</td>
                      <td className="px-3 py-2 text-ink">{r.itemId ? (nameOf.get(r.itemId) ?? '—') : '—'}</td>
                      <td className="px-3 py-2 text-ink">{r.name ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-display font-bold text-ink">{fmtUsd(r.amountUsd)}</td>
                      <td className="px-3 py-2 text-muted">{r.accountId ? (nameOf.get(r.accountId) ?? '—') : '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
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
                </tbody>
              </table>
            </div>
            {/* 모바일 — 카드 */}
            <ul className="space-y-2 md:hidden">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-xl border bg-surface p-3 ${editingId === r.id ? 'border-primary' : 'border-line'}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.gubun === '수입' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {r.gubun ?? '—'}
                    </span>
                    <span className="font-display text-[14px] font-bold text-ink">{fmtUsd(r.amountUsd)}</span>
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
                      onClick={() => startEdit(r)}
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
          </>
        )}
      </section>
    </div>
  )
}
