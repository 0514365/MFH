'use client'
// MFH-ACCOUNTING-FORM-V11 — 2027(회계 잔여 a): 폼 = 연회색 면 + 흰 입력칸 · 「새 기록/수정 중」 타이틀 알약 · 구분 4칸 = 선택 칸만 의미색 면(지출 연빨강·수입 연파랑·이체 페리윙클·조정 회색) · 저장 남색 · 최근 입력 = 타이틀 알약 + 흰 2줄 행
// MFH-ACCOUNTING-FORM-V10 — ?gubun=이체|조정 프리필(모바일 빠른 기록의 이체·조정 버튼)
// MFH-ACCOUNTING-FORM-V9 — 환율 입력 제거(2026-09~: 공시·마감 환율 자동, DB 트리거 patch116 가 최종 결정 · 화면은 잠정 환산 표시)
//   통화가 다른 이체 = 「입금 금액」(입금 계좌 통화)으로 양쪽 실제 금액 기록 → 실제 교환 비율 표시. 2026-08 이전 거래 수정은 예전처럼 환율 입력.
// MFH-ACCOUNTING-FORM-V8 — 달력 홈 ＋ 진입 ?date= 거래일 프리필
// MFH-ACCOUNTING-FORM-V7 — 영수증 첨부(ReceiptField, patch111): 저장 전 업로드분은 교체·취소 시 즉시 정리
// MFH-ACCOUNTING-FORM-V6 — 항목 콤보에서 숨긴 항목 제외(수정 중 현재 값은 유지) + 항목 관리(⚙)
// MFH-ACCOUNTING-FORM-V5 — 구매처(vendor) 입력(patch105)
// MFH-ACCOUNTING-FORM-V5 — 구분 '조정'(잔액 조정: 계좌·금액(±)·내용, patch108) 입력·수정
// MFH-ACCOUNTING-FORM-V4 — 구분 '이체'(출금계좌 → 입금계좌, 항목 없음) 추가(patch104)
// MFH-ACCOUNTING-FORM-V3
// 회계 입력·수정·삭제 — 데스크탑 가로(스프레드시트)·모바일 세로. 조건부 콤보·환산 자동·후원자 자동연결.
// 입력 폼 + '최근 입력' 5건(입력일순, 행 클릭→폼 수정, 수정 중엔 숨김). 전체 내역은 /accounting/ledger.
// 내역에서 수정 클릭 → /accounting/entry?edit=<id> 로 진입하면 해당 거래로 폼 프리필. server action → 노션(SoT).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { activeOnly, type AcctOption, type AcctOptions, type FxInfo, type InoutRow } from '@/lib/accounting-types'
import { saveInout, updateInout } from './actions'
import ItemAddButton from './ItemAddButton'
import ItemManageButton from './ItemManageButton'
import ReceiptField from './ReceiptField'
import { createClient } from '@/lib/supabase-browser'
import { discardReceipt } from '@/lib/receipt'

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// 금액 입력 — 숫자·소수점만 남긴 raw(점 1개만). 맨 앞 '-' 는 유지(조정의 − 금액용; 수입·지출은 저장 시 >0 검증).
function cleanNumeric(v: string): string {
  const neg = v.trim().startsWith('-')
  const c = v.replace(/[^\d.]/g, '')
  const parts = c.split('.')
  const body = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : c
  return neg ? `-${body}` : body
}
// raw 숫자 → 천단위 쉼표(소수부·부호 유지).
function withCommas(raw: string): string {
  if (!raw) return ''
  const neg = raw.startsWith('-')
  const body = neg ? raw.slice(1) : raw
  if (!body) return '-'
  const [int, dec] = body.split('.')
  const i = int ? Number(int).toLocaleString('en-US') : '0'
  return `${neg ? '-' : ''}${dec !== undefined ? `${i}.${dec}` : i}`
}
function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const inp =
  'h-[38px] w-full rounded-xl bg-b27-paper px-2.5 text-sm text-b27-ink outline-none transition focus:ring-2 focus:ring-b27-ink/15'
const labelCls = 'mb-1 block whitespace-nowrap font-num text-[11.5px] font-medium text-b27-muted'
// 자동 계산 칸(환율·환산) — 면 없이 회색 숫자
const autoCls = 'flex h-[38px] items-center justify-end gap-1.5 px-1 font-num text-sm text-b27-muted'
// 구분 칸 — 선택된 칸만 의미색 면(빠른 기록과 동일)
const GUBUN_ON: Record<string, string> = {
  수입: 'bg-b27-income-soft font-semibold text-b27-income',
  지출: 'bg-b27-expense-soft font-semibold text-b27-expense',
  이체: 'bg-b27-tint-8 font-semibold text-[#303C8D]',
  조정: 'bg-b27-card font-semibold text-b27-ink',
}
const gubunBtn = (on: boolean, g: string) =>
  `flex flex-1 items-center justify-center rounded-xl px-1 transition ${on ? GUBUN_ON[g] : 'bg-b27-paper text-b27-muted'}`
// 통화별 기본환율(1 USD당 현지통화) — 공시 환율이 없을 때·2026-08 이전 거래 수정 때만 쓰는 대체값.
const DEFAULT_RATE: Record<'KRW' | 'USD' | 'HNL', string> = { KRW: '1400', USD: '1', HNL: '26.5' }
// 항목 드롭다운 대분류 그룹 순서 — 항목(acct_items)의 `category` 기준.
const CAT_ORDER = ['후원', '헌금', '기타수입', '사역비', '생활비', '사역', '차량', '생활', '운영/행정']
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
  fx,
}: {
  options: AcctOptions
  recent: InoutRow[]
  fx?: FxInfo[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 항목 id → 이름(오늘 입력분 목록 표시용).
  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, i.name)
    for (const a of options.accounts) m.set(a.id, a.name)
    return m
  }, [options])
  // 통화 매칭 기본계좌(자산 DB 통화 select) — 없으면 빈 선택.
  const accountByCurrency = useCallback(
    (cur: string) => options.accounts.find((a) => a.currency === cur)?.id ?? '',
    [options],
  )
  const [gubun, setGubun] = useState<'수입' | '지출' | '이체' | '조정'>('수입')
  const [toAccountId, setToAccountId] = useState('')
  const isTransfer = gubun === '이체'
  const isAdjust = gubun === '조정'
  const noItem = isTransfer || isAdjust // 항목·구매처·후원자 없음
  const [date, setDate] = useState(todayLocal)
  const [itemId, setItemId] = useState('')
  const [name, setName] = useState('')
  const [vendor, setVendor] = useState('')
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'HNL'>('KRW')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState(DEFAULT_RATE.KRW)
  const [accountId, setAccountId] = useState(() => accountByCurrency('KRW'))
  const [toPrincipal, setToPrincipal] = useState('') // 통화가 다른 이체의 입금 금액(입금 계좌 통화)
  const [supporterId, setSupporterId] = useState('')
  const [receiptPath, setReceiptPath] = useState<string | null>(null)
  // 이 폼에서 올렸지만 아직 저장 안 된 영수증 — 교체·제거·취소 시 Storage 에서 바로 지운다(저장된 것은 서버가 정리).
  const freshReceipts = useRef<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // 최근 입력 5건 — 입력일(created_time) 기준. 방금 입력한 내역 검증용(전체는 /accounting/ledger).
  const recent5 = useMemo(
    () => [...recent].sort((a, b) => (b.createdTime ?? '').localeCompare(a.createdTime ?? '')).slice(0, 5),
    [recent],
  )

  const items = noItem ? [] : activeOnly(options.items[gubun as '수입' | '지출'], itemId)
  // 항목 추가 모달용 대분류 목록(해당 구분, 기존 순서).
  const categoriesOf = (g: '수입' | '지출') =>
    groupByCategory(activeOnly(options.items[g])).map(([c]) => c).filter((c) => c !== '기타')
  // 후원자 콤보·자동연결 대상 — 항목의 대분류가 '후원'(정기·일시후원·목적헌금)일 때.
  const isDonation = useMemo(() => {
    if (gubun !== '수입' || !itemId) return false
    return options.items['수입'].find((i) => i.id === itemId)?.category === '후원'
  }, [gubun, itemId, options])
  const usd = currency === 'USD'
  // 환율 기준(2026-09~): 수입·지출·조정은 공시·마감 환율 자동(입력 없음). 그 이전 거래 수정은 예전처럼 환율 입력.
  const legacy = date < '2026-09-01'
  const fxOf = useCallback((cur: string) => fx?.find((f) => f.currency === cur) ?? null, [fx])
  const curOfAcct = useCallback((id: string) => options.accounts.find((a) => a.id === id)?.currency ?? null, [options])
  const fromCur = isTransfer ? curOfAcct(accountId) : null
  const toCur = isTransfer ? curOfAcct(toAccountId) : null
  const crossFx = isTransfer && !legacy && !!fromCur && !!toCur && fromCur !== toCur // 통화가 다른 이체
  const autoFx = !usd && !legacy ? fxOf(currency) : null
  const effRate = usd ? 1 : legacy ? Number(rate) : (autoFx?.rate ?? Number(DEFAULT_RATE[currency]))
  const amountUsd = useMemo(() => {
    const p = Number(principal)
    if (!p) return 0
    if (crossFx) {
      if (fromCur === 'USD') return p
      const tp = Number(toPrincipal)
      if (toCur === 'USD') return tp > 0 ? tp : 0
      return effRate > 0 ? p / effRate : 0
    }
    if (usd) return p
    return effRate > 0 ? p / effRate : 0
  }, [principal, toPrincipal, crossFx, fromCur, toCur, usd, effRate])
  // 통화가 다른 이체의 실제 교환 비율(1 USD 당 현지통화) — 표시용.
  const crossRate = useMemo(() => {
    if (!crossFx) return null
    const p = Number(principal)
    const tp = Number(toPrincipal)
    if (!(p > 0) || !(tp > 0)) return null
    if (fromCur === 'USD') return { cur: toCur!, rate: tp / p }
    if (toCur === 'USD') return { cur: fromCur!, rate: p / tp }
    return null
  }, [crossFx, principal, toPrincipal, fromCur, toCur])

  // 이체는 통화 = 출금 계좌 통화(원금 = 출금 금액).
  useEffect(() => {
    if (isTransfer && fromCur && (fromCur === 'KRW' || fromCur === 'USD' || fromCur === 'HNL') && fromCur !== currency) setCurrency(fromCur)
  }, [isTransfer, fromCur, currency])

  // discard=false: 저장 성공 직후(올린 영수증이 DB 에 들어감) — 정리하지 않고 추적만 비운다.
  const reset = useCallback((discard = true) => {
    if (discard && freshReceipts.current.size) {
      const sb = createClient()
      for (const p of freshReceipts.current) void discardReceipt(sb, p)
    }
    freshReceipts.current.clear()
    setReceiptPath(null)
    setEditingId(null)
    setItemId('')
    setName('')
    setVendor('')
    setPrincipal('')
    setToPrincipal('')
    setRate(DEFAULT_RATE[currency])
    setAccountId(accountByCurrency(currency))
    setToAccountId('')
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
    setGubun(r.gubun === '지출' ? '지출' : r.gubun === '이체' ? '이체' : r.gubun === '조정' ? '조정' : '수입')
    setToAccountId(r.toAccountId ?? '')
    setDate(r.date ?? todayLocal())
    setItemId(r.itemId ?? '')
    setName(r.name ?? '')
    setVendor(r.vendor ?? '')
    setCurrency(r.currency === 'USD' || r.currency === 'HNL' ? r.currency : 'KRW')
    setPrincipal(r.principal != null ? String(r.principal) : '')
    setToPrincipal(r.toPrincipal != null ? String(r.toPrincipal) : '')
    setRate(r.rate != null ? String(r.rate) : '')
    setAccountId(r.accountId ?? '')
    setSupporterId(r.supporterId ?? '')
    if (freshReceipts.current.size) {
      const sb = createClient()
      for (const p of freshReceipts.current) void discardReceipt(sb, p)
      freshReceipts.current.clear()
    }
    setReceiptPath(r.receiptPath ?? null)
    setEditingId(r.id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 내역(/accounting/ledger)에서 수정 클릭 → ?edit=<id> 로 진입하면 해당 거래로 폼 프리필(1회).
  const handledEdit = useRef<string | null>(null)
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || handledEdit.current === editId) return
    const row = recent.find((r) => r.id === editId)
    if (row) {
      handledEdit.current = editId
      startEdit(row)
    }
    // startEdit 은 매 렌더 새 함수 — ref 가드로 1회만 실행하므로 deps 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, recent])

  // 달력 홈 ＋ → ?date=YYYY-MM-DD 로 진입하면 거래일 프리필(1회, 수정 진입이 아닐 때만).
  const handledDate = useRef<string | null>(null)
  useEffect(() => {
    const d = searchParams.get('date')
    if (!d || searchParams.get('edit') || handledDate.current === d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return
    handledDate.current = d
    setDate(d)
  }, [searchParams])
  // 모바일 빠른 기록의 [이체][조정] → ?gubun= 으로 구분 프리필(1회).
  const handledGubun = useRef<string | null>(null)
  useEffect(() => {
    const g = searchParams.get('gubun')
    if (!g || searchParams.get('edit') || handledGubun.current === g) return
    if (g !== '이체' && g !== '조정') return
    handledGubun.current = g
    setGubun(g)
    setItemId('')
  }, [searchParams])

  async function onSave() {
    setErr('')
    if (!noItem && !itemId) return setErr('항목을 선택하세요')
    if (isTransfer && (!accountId || !toAccountId)) return setErr('출금계좌와 입금계좌를 선택하세요')
    if (isTransfer && accountId === toAccountId) return setErr('출금계좌와 입금계좌가 같습니다')
    if (isAdjust && !accountId) return setErr('조정할 계좌를 선택하세요')
    if (isAdjust ? !principal || Number(principal) === 0 : !principal || Number(principal) <= 0) return setErr('금액을 입력하세요')
    if (legacy && !usd && (!rate || Number(rate) <= 0)) return setErr('환율을 입력하세요')
    if (crossFx && !(Number(toPrincipal) > 0)) return setErr(`입금 금액(${toCur})을 입력하세요`)
    const payload = {
      gubun,
      date,
      itemId: noItem ? '' : itemId,
      name: name.trim(),
      vendor: noItem ? null : vendor.trim() || null,
      currency,
      principal: Number(principal),
      rate: crossFx && crossRate && fromCur !== 'USD' ? crossRate.rate : effRate, // 최종값은 DB 트리거가 결정
      amountUsd: Math.round(amountUsd * 100) / 100,
      accountId: accountId || null,
      toAccountId: isTransfer ? toAccountId || null : null,
      toPrincipal: crossFx ? Number(toPrincipal) : null,
      supporterId: noItem ? null : supporterId || null,
      receiptPath,
    }
    setSaving(true)
    const res = editingId ? await updateInout(editingId, payload) : await saveInout(payload)
    setSaving(false)
    if (res.ok) {
      reset(false)
      router.refresh()
    } else {
      setErr(res.error ?? '저장 실패')
    }
  }

  return (
    <div>
      {/* 입력 / 수정 폼 */}
      <section className="rounded-2xl bg-b27-card p-3.5 @2xl:p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-b27-paper px-3 py-1 text-[13px] font-medium text-b27-ink">
            <i className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-2" aria-hidden="true" />
            {editingId ? '수정 중' : '새 기록'}
          </span>
          {editingId && (
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full bg-b27-paper px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70"
            >
              수정 취소
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 @2xl:flex-row @2xl:flex-wrap @2xl:items-end @2xl:gap-2">
          {/* 구분 토글 */}
          <div className="@2xl:w-[212px] @2xl:shrink-0">
            <label className={labelCls}>구분</label>
            <div className="flex h-[38px] gap-1 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  setGubun('수입')
                  setItemId('')
                }}
                className={gubunBtn(gubun === '수입', '수입')}
              >
                수입
              </button>
              <button
                type="button"
                onClick={() => {
                  setGubun('지출')
                  setItemId('')
                }}
                className={gubunBtn(gubun === '지출', '지출')}
              >
                지출
              </button>
              <button
                type="button"
                onClick={() => {
                  setGubun('이체')
                  setItemId('')
                  setSupporterId('')
                }}
                className={gubunBtn(gubun === '이체', '이체')}
              >
                이체
              </button>
              <button
                type="button"
                onClick={() => {
                  setGubun('조정')
                  setItemId('')
                  setSupporterId('')
                  setToAccountId('')
                }}
                className={gubunBtn(gubun === '조정', '조정')}
                title="잔액 조정 — 실제 잔액에 맞춰 ± 금액을 기록(수입·지출 집계 제외)"
              >
                조정
              </button>
            </div>
          </div>

          {/* 날짜 — 표시는 yyyy-mm-dd 고정(OS 로캘 무관), 네이티브 피커는 투명 오버레이로 */}
          <div className="@2xl:w-[130px] @2xl:shrink-0">
            <label className={labelCls}>날짜</label>
            <div className="relative">
              <div className={`${inp} flex items-center`} aria-hidden="true">
                {date || '날짜 선택'}
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="날짜"
              />
            </div>
          </div>

          {/* 항목 (이체는 없음) */}
          {!noItem && (
          <div className="@2xl:w-[104px] @2xl:shrink-0">
            <div className={`${labelCls} flex items-center justify-between`}>
              <span>항목</span>
              <span className="flex items-center gap-1">
              <ItemAddButton
                gubun={gubun as '수입' | '지출'}
                categories={categoriesOf(gubun as '수입' | '지출')}
                onCreated={(id) => setItemId(id)}
              />
              <ItemManageButton options={options} initialGubun={gubun as '수입' | '지출'} />
              </span>
            </div>
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
          )}

          {/* 이름 (후원금이면 후원자 콤보 + 자유입력) */}
          <div className="@2xl:min-w-0 @2xl:flex-1">
            <label className={labelCls}>내용{isDonation ? ' · 후원자' : ''}</label>
            <input
              list={isDonation ? 'acct-sup-list' : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDonation ? '후원자 (단체·무명 직접)' : isTransfer ? '예: 9월 카드대금 상환' : isAdjust ? '예: 2026-10-31 실잔액 기준 조정' : ''}
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

          {/* 구매처(어디서, 선택) — 이체는 없음 */}
          {!noItem && (
            <div className="@2xl:w-[150px] @2xl:shrink-0">
              <label className={labelCls}>구매처</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="상점·거래처"
                className={inp}
              />
            </div>
          )}

          {/* 구매처까지 1행, 통화부터 2행 — 데스크탑 강제 줄바꿈 */}
          <div className="hidden basis-full @2xl:block" aria-hidden="true" />

          {/* 통화 */}
          <div className="@2xl:w-[78px] @2xl:shrink-0">
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
          <div className="@2xl:w-[120px] @2xl:shrink-0">
            <label className={labelCls}>{isAdjust ? '금액 (+늘림 / −줄임)' : '금액'}</label>
            <input
              type="text"
              inputMode="decimal"
              value={withCommas(principal)}
              onChange={(e) => setPrincipal(cleanNumeric(e.target.value))}
              className={`${inp} text-right`}
            />
          </div>

          {/* 환율 — 2026-09~ 자동(공시·마감, 표시만) · 통화가 다른 이체는 입금 금액 · 2026-08 이전 거래 수정만 입력 */}
          {crossFx ? (
            <div className="@2xl:w-[120px] @2xl:shrink-0">
              <label className={labelCls}>입금 금액 ({toCur})</label>
              <input
                type="text"
                inputMode="decimal"
                value={withCommas(toPrincipal)}
                onChange={(e) => setToPrincipal(cleanNumeric(e.target.value))}
                placeholder="실제 들어온 금액"
                className={`${inp} text-right`}
              />
            </div>
          ) : legacy ? (
            <div className="@2xl:w-[88px] @2xl:shrink-0">
              <label className={labelCls}>환율</label>
              <input
                type="text"
                inputMode="decimal"
                value={usd ? '1' : withCommas(rate)}
                onChange={(e) => setRate(cleanNumeric(e.target.value))}
                disabled={usd}
                className={`${inp} text-right disabled:opacity-40`}
              />
            </div>
          ) : (
            <div className="@2xl:w-[88px] @2xl:shrink-0">
              <label className={labelCls}>환율 (자동)</label>
              <div
                className={autoCls}
                title={usd ? '달러 거래' : autoFx ? `공시 ${autoFx.date} — 월 마감 때 그달 마감 환율로 확정` : '공시 환율 없음 — 기본값으로 잠정 계산'}
              >
                {usd ? '1' : withCommas(String(effRate))}
              </div>
            </div>
          )}

          {/* 환산(USD, 자동) — 잠정(월 마감 때 확정) · 통화가 다른 이체는 실제 교환 비율 */}
          <div className="@2xl:w-[112px] @2xl:shrink-0">
            <label className={labelCls}>{crossFx ? '교환 비율 · $' : legacy || usd ? '환산 $' : '환산 $ (잠정)'}</label>
            <div className={autoCls}>
              {crossRate && <span className="text-[10px] text-b27-muted">{crossRate.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>}
              {amountUsd
                ? `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
          </div>

          {/* 계좌 — 수입=입금 · 지출=지불 · 이체=출금 */}
          <div className="@2xl:w-[140px] @2xl:shrink-0">
            <label className={labelCls}>{gubun === '수입' ? '입금계좌' : gubun === '이체' ? '출금계좌' : gubun === '조정' ? '조정 계좌' : '지불계좌'}</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inp}>
              <option value="">선택</option>
              {options.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* 이체 입금계좌 */}
          {isTransfer && (
            <div className="@2xl:w-[140px] @2xl:shrink-0">
              <label className={labelCls}>입금계좌</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={inp}>
                <option value="">선택</option>
                {options.accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 후원자 연결 — 후원 항목일 때, 적요명으로 자동 연결되며 수동 변경 가능 */}
          {isDonation && (
            <div className="@2xl:min-w-0 @2xl:flex-1">
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

          {/* 영수증(선택) */}
          <ReceiptField
            value={receiptPath}
            date={date}
            labelCls={labelCls}
            onChange={(next, prev) => {
              if (prev && freshReceipts.current.has(prev)) {
                void discardReceipt(createClient(), prev)
                freshReceipts.current.delete(prev)
              }
              if (next) freshReceipts.current.add(next)
              setReceiptPath(next)
            }}
          />

          {/* 저장 / 수정 */}
          <div className="@2xl:w-[72px] @2xl:shrink-0">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex h-[38px] w-full items-center justify-center rounded-xl bg-b27-ink text-sm font-medium text-white transition active:opacity-80 disabled:opacity-50"
            >
              {saving ? '…' : editingId ? '수정' : '저장'}
            </button>
          </div>
        </div>

        {err && <p className="mt-2 text-xs font-medium text-b27-expense">{err}</p>}
      </section>

      {/* 최근 입력 — 방금 입력한 내역 검증용(입력일순 5건). 행 클릭 → 위 폼에서 수정. 수정 중엔 숨김 */}
      {!editingId && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-b27-card px-3 py-1 text-[13px] font-medium text-b27-ink">
              <i className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-2" aria-hidden="true" />
              최근 입력
              <span className="font-num text-[12px] font-normal text-b27-muted">{recent5.length}</span>
            </span>
            <Link
              href="/accounting/ledger"
              className="rounded-full bg-b27-card px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70"
            >
              전체 내역 →
            </Link>
          </div>
          {recent5.length === 0 ? (
            <p className="rounded-2xl bg-b27-card py-5 text-center text-xs text-b27-muted">입력한 거래가 없습니다.</p>
          ) : (
            <ul>
              {recent5.map((r) => (
                <li key={r.id} className="border-b border-b27-line last:border-0">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="flex w-full items-start justify-between gap-2 px-0.5 py-2.5 text-left transition active:opacity-70"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          r.gubun === '수입'
                            ? 'bg-b27-income-soft text-b27-income'
                            : r.gubun === '지출'
                              ? 'bg-b27-expense-soft text-b27-expense'
                              : r.gubun === '이체'
                                ? 'bg-b27-tint-8 text-[#303C8D]'
                                : 'bg-b27-card text-b27-muted'
                        }`}
                      >
                        {r.gubun ?? '—'}
                      </span>
                      <span className="min-w-0 break-words text-sm text-b27-ink">
                        {r.gubun === '이체'
                          ? `${nameOf.get(r.accountId ?? '') ?? ''} → ${nameOf.get(r.toAccountId ?? '') ?? ''}`
                          : r.itemId
                            ? (nameOf.get(r.itemId) ?? '')
                            : ''}
                        {r.name ? <span className="text-b27-muted"> · {r.name}</span> : ''}
                        {r.vendor ? <span className="text-b27-muted"> · {r.vendor}</span> : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`font-num text-sm font-semibold ${
                          r.gubun === '지출' ? 'text-b27-expense' : r.gubun === '수입' ? 'text-b27-income' : 'text-b27-ink'
                        }`}
                      >
                        {fmtUsd(r.amountUsd)}
                      </span>
                      <span className="hidden font-num text-[11px] text-b27-muted @xl:inline">{r.date ?? ''}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
