'use client'
// MFH-ACCOUNTING-FORM-V2
// 회계 입력·수정·삭제 — 데스크탑 가로(스프레드시트)·모바일 세로. 조건부 콤보·환산 자동·후원자 자동연결.
// 입력 폼 + 최근 거래 목록 통합(편집 모드 상태 공유). 저장/수정/삭제는 server action → 노션(SoT).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOption, AcctOptions, InoutRow } from '@/lib/notion'
import { saveInout, updateInout } from './actions'
import TransactionList from './TransactionList'

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
const inp =
  'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'
const labelCls = 'mb-1 block whitespace-nowrap text-[11px] font-medium text-faint'
// 통화별 기본환율(1 USD당 현지통화) — 통화 변경 시 자동 채움(수동 변경 가능).
const DEFAULT_RATE: Record<'KRW' | 'USD' | 'HNL', string> = { KRW: '1400', USD: '1', HNL: '26.5' }
// 항목 드롭다운 대분류 그룹 순서 — 노션 항목의 `대분류` select 기준.
const CAT_ORDER = ['후원', '헌금', '기타수입', '사역', '차량', '생활', '운영/행정']
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

export default function AccountingForm({
  options,
  recent,
}: {
  options: AcctOptions
  recent: InoutRow[]
}) {
  const router = useRouter()
  // 통화 매칭 기본계좌(자산 DB 통화 select) — 없으면 빈 선택.
  const accountByCurrency = useCallback(
    (cur: string) => options.accounts.find((a) => a.currency === cur)?.id ?? '',
    [options],
  )
  const [gubun, setGubun] = useState<'수입' | '지출'>('수입')
  const [date, setDate] = useState(todayLocal)
  const [itemId, setItemId] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'HNL'>('KRW')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState(DEFAULT_RATE.KRW)
  const [accountId, setAccountId] = useState(() => accountByCurrency('KRW'))
  const [supporterId, setSupporterId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const items = options.items[gubun]
  // 후원자 콤보·자동연결 대상 — 항목의 대분류가 '후원'(정기·일시후원·목적헌금)일 때.
  const isDonation = useMemo(() => {
    if (gubun !== '수입' || !itemId) return false
    return options.items['수입'].find((i) => i.id === itemId)?.category === '후원'
  }, [gubun, itemId, options])
  const usd = currency === 'USD'
  const amountUsd = useMemo(() => {
    const p = Number(principal)
    if (!p) return 0
    if (usd) return p
    const r = Number(rate)
    return r > 0 ? p / r : 0
  }, [principal, rate, usd])

  const reset = useCallback(() => {
    setEditingId(null)
    setItemId('')
    setName('')
    setPrincipal('')
    setRate(DEFAULT_RATE[currency])
    setAccountId(accountByCurrency(currency))
    setSupporterId('')
    setErr('')
  }, [currency, accountByCurrency])

  // 통화 변경 → 기본환율 + 통화 매칭 기본계좌 자동(둘 다 수동 변경 가능).
  function onCurrencyChange(next: 'KRW' | 'USD' | 'HNL') {
    setCurrency(next)
    setRate(DEFAULT_RATE[next])
    setAccountId(accountByCurrency(next))
  }

  // 후원 항목 + 적요가 후원자명과 일치하면 후원자 자동 연결(select 로 수동 변경 가능).
  useEffect(() => {
    if (!isDonation) {
      setSupporterId('')
      return
    }
    const match = options.supporters.find((s) => s.name.trim() === name.trim())
    if (match) setSupporterId(match.id)
  }, [name, isDonation, options])

  // 편집 중인 거래가 목록에서 사라지면(삭제 등) 폼을 초기화.
  useEffect(() => {
    if (editingId && !recent.some((r) => r.id === editingId)) reset()
  }, [recent, editingId, reset])

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
    setSupporterId(r.supporterId ?? '')
    setEditingId(r.id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSave() {
    setErr('')
    if (!itemId) return setErr('항목을 선택하세요')
    if (!principal || Number(principal) <= 0) return setErr('금액을 입력하세요')
    if (!usd && (!rate || Number(rate) <= 0)) return setErr('환율을 입력하세요')
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
      supporterId: supporterId || null,
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

        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-end md:gap-2">
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
          <div className="md:w-[104px] md:shrink-0">
            <label className={labelCls}>항목</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={inp}>
              <option value="">선택</option>
              {groupByCategory(items).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 이름 (후원금이면 후원자 콤보 + 자유입력) */}
          <div className="md:min-w-0 md:flex-1">
            <label className={labelCls}>적요{isDonation ? ' · 후원자' : ''}</label>
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

          {/* 적요까지 1행, 통화부터 2행 — 데스크탑 강제 줄바꿈 */}
          <div className="hidden basis-full md:block" aria-hidden="true" />

          {/* 통화 */}
          <div className="md:w-[78px] md:shrink-0">
            <label className={labelCls}>통화</label>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as 'KRW' | 'USD' | 'HNL')}
              className={inp}
            >
              <option value="KRW">KRW</option>
              <option value="USD">USD</option>
              <option value="HNL">HNL</option>
            </select>
          </div>

          {/* 금액(현지) */}
          <div className="md:w-[120px] md:shrink-0">
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
          <div className="md:w-[112px] md:shrink-0">
            <label className={labelCls}>환산 $</label>
            <div className="flex h-9 items-center justify-end rounded-lg border border-dashed border-line bg-surface-subtle px-2 text-sm text-muted">
              {amountUsd
                ? `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
          </div>

          {/* 계좌 */}
          <div className="md:w-[140px] md:shrink-0">
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

          {/* 후원자 연결 — 후원 항목일 때, 적요명으로 자동 연결되며 수동 변경 가능 */}
          {isDonation && (
            <div className="md:min-w-0 md:flex-1">
              <label className={labelCls}>후원자 연결</label>
              <select
                value={supporterId}
                onChange={(e) => setSupporterId(e.target.value)}
                className={inp}
              >
                <option value="">미연결</option>
                {options.supporters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* 거래 내역 — 월별 그룹·합계·필터·정렬 (별도 컴포넌트) */}
      <TransactionList
        recent={recent}
        options={options}
        editingId={editingId}
        onEdit={startEdit}
        onAfterMutate={() => router.refresh()}
      />
    </div>
  )
}
