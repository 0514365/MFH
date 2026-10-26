'use client'
// MFH-CARD-REPAY-BUTTON-V14 — 2027 5-④: 잔액 0 체크박스 마룬 → 남색(accent-[#2B3160]).
// MFH-CARD-REPAY-BUTTON-V13 — 2027(회계 잔여 b): 상환·잔액 0 모달 = 그림자 없는 흰 시트(24px) · Manrope 제목 + 닫기 알약 · 표·안내 = 연회색 면 · 방식 = 알약 세그먼트
// MFH-CARD-REPAY-BUTTON-V12 — 2027(회계 잔여 a): 넓은 화면 「카드 미상환」 줄 = 연한 빨강 면 + 색 사각형 · 「상환 입력」 터키석 알약 · 「잔액 0 맞춤」 흰 알약 (모달은 b 단계)
// MFH-CARD-REPAY-BUTTON-V11 — compact 「상환」 = 터키석(행동색), 「잔액 0」 = 흰 알약(연한 빨강 면 위용)
// MFH-CARD-REPAY-BUTTON-V10 — compact 알약 2027 톤(Manrope 500 · 연회색 면 「잔액 0」)
// MFH-CARD-REPAY-BUTTON-V9 — compact 모드(달력 카드대금 제목 줄: 작은 「상환」·「잔액 0」 알약 버튼 + 같은 모달)
// MFH-CARD-REPAY-BUTTON-V8 — 청구 주기 카드: 상환일 기본값 = 확정 청구 상환일, 상환 금액 기본값 = 확정 청구 원화분 · 확정/이용 중 안내
// MFH-CARD-REPAY-BUTTON-V7 — 원화 카드 상환일 기본값 = 카드 상환일(dueDay, patch117) 중 오늘 이후 가장 가까운 날
// MFH-CARD-REPAY-BUTTON-V6 — 원화 카드(삼성 7092 진아): 렘피라 분할은 HNL 카드만, 원화 카드는 「원화 카드」 탭에서 원화 계좌 → 카드 이체 1건
//   (달러 결제분도 원화로 청구 → 원화 상환, 남는 환차는 「잔액 0 맞춤」)
// MFH-CARD-REPAY-BUTTON-V5 — actionsOnly(자산 탭 신용카드 카드 안: 요약 없이 「상환 입력」·「잔액 0 맞춤」 버튼만)
// MFH-CARD-REPAY-BUTTON-V4 — HNL 상환분 = 통화가 다른 이체(출금 USD + 입금 금액 HNL, patch116)
// MFH-CARD-REPAY-BUTTON-V3 — 환차익/수수료 항목은 보이는 것 우선(숨겨도 동작)
// MFH-CARD-REPAY-BUTTON-V2 — '잔액 0 맞춤'(환차 정리): 카드 잔액 ≠ 0 → 수입/환차익 또는 지출/수수료 1건으로 0 맞춤(상환 직후 잔차용)
// MFH-CARD-REPAY-BUTTON-V1
// 카드대금 상환 도우미 — 기록 탭 카드. 신용카드 계좌(4956 우진 · 7697 진아)의 미상환 잔액을 보여주고,
// 상환 총액(HNL, 선택 USD)·환율·날짜·출금계좌만 입력하면 카드별 잔액 비율로 자동 분할 → 이체 N건 저장(bulkCreateInout, source=manual).
// 분할액은 미리보기에서 수정 가능. 잔차(환차)는 카드 잔액에 남겨 월 1회 환차익/수수료로 0 맞춤(설계 §5).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, AcctOptions, InoutInput } from '@/lib/accounting-types'
import { bulkCreateInout } from './actions'
import { amtColor, fmtLocal, fmtUsd } from './BalanceGroups'

const inp =
  'h-10 w-full rounded-xl bg-b27-card px-3 text-sm text-b27-ink outline-none transition focus:ring-2 focus:ring-b27-ink/15'
const lbl = 'mb-1 block text-[11px] font-medium text-b27-muted'
const r2 = (n: number) => Math.round(n * 100) / 100
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// 다가오는 상환일(오늘 포함) — 이번 달 day 가 지났으면 다음 달. 말일보다 크면 말일.
const nextDue = (day: number) => {
  const d = new Date()
  const at = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate()
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
  }
  const cur = at(d.getFullYear(), d.getMonth())
  return cur >= today() ? cur : at(d.getFullYear(), d.getMonth() + 1)
}
// 총액을 카드별 부채(음수 잔액) 비율로 분할. 부채가 없으면 균등. 마지막 카드가 잔여분(합계 정확).
function split(total: number, cards: AccountBalance[]): number[] {
  if (!cards.length || !(total > 0)) return cards.map(() => 0)
  const debts = cards.map((c) => Math.max(0, -c.balanceUsd))
  const sum = debts.reduce((s, d) => s + d, 0)
  const w = sum > 0 ? debts.map((d) => d / sum) : cards.map(() => 1 / cards.length)
  const out = w.map((x) => r2(total * x))
  out[out.length - 1] = r2(total - out.slice(0, -1).reduce((s, v) => s + v, 0))
  return out
}
const cardLabel = (c: AccountBalance) => `${c.name.replace(' 신용카드 ', ' ')}${c.info ? ` (${c.info})` : ''}`

export default function CardRepayButton({
  compact = false,
  balances,
  options,
  actionsOnly = false,
}: {
  balances: AccountBalance[]
  options?: AcctOptions
  actionsOnly?: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const cards = useMemo(() => balances.filter((b) => b.kind === '신용카드'), [balances])
  const hnlCards = useMemo(() => cards.filter((c) => c.currency !== 'KRW'), [cards])
  const krwCards = useMemo(() => cards.filter((c) => c.currency === 'KRW'), [cards])
  const sources = useMemo(() => balances.filter((b) => b.kind !== '신용카드' && b.currency === 'USD'), [balances])
  const krwSources = useMemo(() => balances.filter((b) => b.kind !== '신용카드' && b.currency === 'KRW'), [balances])
  const defaultRate = useMemo(() => balances.find((b) => b.currency === 'HNL' && b.rate)?.rate ?? 26.5, [balances])
  const krwRate = useMemo(() => balances.find((b) => b.currency === 'KRW' && b.rate)?.rate ?? 1350, [balances])
  const debt = cards.reduce((s, c) => s + c.balanceUsd, 0)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'HNL' | 'KRW'>(hnlCards.length ? 'HNL' : 'KRW')
  // 원화 카드 상환(원화 계좌 → 카드, 같은 통화 이체 1건)
  const [krwCard, setKrwCard] = useState(krwCards[0]?.id ?? '')
  const [krwFrom, setKrwFrom] = useState(krwSources.find((s) => s.name.includes('6154'))?.id ?? krwSources[0]?.id ?? '')
  const [krwAmt, setKrwAmt] = useState('')
  const [date, setDate] = useState(today())
  const [from, setFrom] = useState(sources.find((s) => s.cardLast4 === '3070')?.id ?? sources[0]?.id ?? '')
  const [totalHnl, setTotalHnl] = useState('')
  const [totalUsd, setTotalUsd] = useState('')
  const [rate, setRate] = useState(String(defaultRate))
  const [hnlOverride, setHnlOverride] = useState<Record<string, string>>({})
  const [usdOverride, setUsdOverride] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  // 잔액 0 맞춤 모달
  const [zeroOpen, setZeroOpen] = useState(false)
  const [zeroDate, setZeroDate] = useState(today())
  const [zeroPick, setZeroPick] = useState<Record<string, boolean>>({})
  const [zeroAmt, setZeroAmt] = useState<Record<string, string>>({})
  const pickItem = (g: '수입' | '지출', name: string) => {
    const list = options?.items[g].filter((i) => i.name === name) ?? []
    return list.find((i) => i.active !== false) ?? list[0]
  }
  const gainItem = pickItem('수입', '환차익')
  const feeItem = pickItem('지출', '수수료')

  const tHnl = Number(totalHnl) || 0
  const tUsd = Number(totalUsd) || 0
  const rt = Number(rate) || 0
  const autoHnl = useMemo(() => split(tHnl, hnlCards), [tHnl, hnlCards])
  const autoUsd = useMemo(() => split(tUsd, hnlCards), [tUsd, hnlCards])
  const rowHnl = (i: number) => (hnlOverride[hnlCards[i].id] !== undefined ? Number(hnlOverride[hnlCards[i].id]) || 0 : autoHnl[i])
  const rowUsd = (i: number) => (usdOverride[hnlCards[i].id] !== undefined ? Number(usdOverride[hnlCards[i].id]) || 0 : autoUsd[i])
  const sumHnl = hnlCards.reduce((s, _, i) => s + rowHnl(i), 0)
  const sumUsd = hnlCards.reduce((s, _, i) => s + rowUsd(i), 0)
  const kAmt = Number(krwAmt) || 0
  const kCard = krwCards.find((c) => c.id === krwCard)
  // 원화 카드 탭: 상환일 기본값 = 카드 상환일 · 렘피라 탭: 오늘
  const kDueDay = kCard?.dueDay ?? null
  const kCycle = kCard?.cycle ?? null
  useEffect(() => {
    if (!open) return
    if (mode !== 'KRW') return setDate(today())
    // 확정 청구가 남아 있으면 그 상환일(지났으면 오늘), 없으면 다가오는 상환일
    if (kCycle && kCycle.billed.valueUsd > 0.005) {
      setDate(kCycle.dueDate < today() ? today() : kCycle.dueDate)
      setKrwAmt((v) => v || (kCycle.billed.own > 0 ? String(kCycle.billed.own) : ''))
    } else setDate(kDueDay ? nextDue(kDueDay) : today())
  }, [open, mode, kDueDay, kCycle])
  const kDue = kCard ? -(kCard.holdings.find((h) => h.currency === 'KRW')?.amount ?? 0) : 0
  const kDueUsd = kCard ? -(kCard.holdings.find((h) => h.currency === 'USD')?.amount ?? 0) : 0

  function close() {
    setOpen(false)
    setErr('')
    setHnlOverride({})
    setUsdOverride({})
  }

  async function onSaveKrw() {
    if (saving) return
    if (!krwFrom) return setErr('출금계좌를 선택하세요')
    if (!krwCard) return setErr('카드를 선택하세요')
    if (!(kAmt > 0)) return setErr('상환 금액을 입력하세요')
    // 같은 통화(KRW) 이체 — 금액(USD)은 DB 트리거가 마감·공시 환율로 확정(여기 값은 잠정)
    const item: InoutInput = { gubun: '이체', date, itemId: '', name: '카드대금 상환', currency: 'KRW', principal: Math.round(kAmt), rate: krwRate, amountUsd: r2(kAmt / krwRate), accountId: krwFrom, toAccountId: krwCard, source: 'manual' }
    setSaving(true)
    setErr('')
    const res = await bulkCreateInout([item])
    setSaving(false)
    if (!res.ok) return setErr(res.error ?? '저장 실패')
    close()
    setKrwAmt('')
    router.refresh()
  }

  async function onSave() {
    if (saving) return
    if (mode === 'KRW') return onSaveKrw()
    if (!from) return setErr('출금계좌를 선택하세요')
    if (!(rt > 0)) return setErr('환율을 입력하세요')
    if (!(tHnl > 0) && !(tUsd > 0)) return setErr('상환 금액을 입력하세요')
    if (Math.abs(sumHnl - tHnl) > 0.009 || Math.abs(sumUsd - tUsd) > 0.009) return setErr('분할 합계가 총액과 다릅니다')
    const items: InoutInput[] = []
    hnlCards.forEach((c, i) => {
      const h = rowHnl(i)
      const u = rowUsd(i)
      if (h > 0)
        // 통화가 다른 이체(patch116): 원금 = 출금 USD, 입금 금액 = 카드에 들어간 HNL(실제 교환 비율 = 입력 환율)
        items.push({ gubun: '이체', date, itemId: '', name: '카드대금 상환', currency: 'USD', principal: r2(h / rt), rate: 1, amountUsd: r2(h / rt), accountId: from, toAccountId: c.id, toPrincipal: r2(h), source: 'manual' })
      if (u > 0)
        items.push({ gubun: '이체', date, itemId: '', name: '카드대금 상환 (USD)', currency: 'USD', principal: r2(u), rate: 1, amountUsd: r2(u), accountId: from, toAccountId: c.id, source: 'manual' })
    })
    if (!items.length) return setErr('저장할 분할액이 없습니다')
    setSaving(true)
    setErr('')
    const res = await bulkCreateInout(items)
    setSaving(false)
    if (!res.ok) return setErr(res.error ?? '저장 실패')
    close()
    setTotalHnl('')
    setTotalUsd('')
    router.refresh()
  }

  function openZero() {
    const pick: Record<string, boolean> = {}
    const amt: Record<string, string> = {}
    for (const c of cards) {
      pick[c.id] = c.balanceUsd !== 0 && Math.abs(c.balanceUsd) < 100 // 작은 잔차만 기본 선택
      amt[c.id] = String(r2(-c.balanceUsd))
    }
    setZeroPick(pick)
    setZeroAmt(amt)
    setZeroDate(today())
    setErr('')
    setZeroOpen(true)
  }
  async function onZeroSave() {
    if (saving) return
    if (!gainItem || !feeItem) return setErr('항목 환차익(수입)·수수료(지출)가 필요합니다')
    const items: InoutInput[] = []
    for (const c of cards) {
      if (!zeroPick[c.id]) continue
      const v = Number(zeroAmt[c.id]) || 0
      if (!v) continue
      // v > 0 = 잔액을 늘림(미상환 잔차 → 환차익 수입) · v < 0 = 잔액을 줄임(과납 → 수수료 지출)
      items.push(
        v > 0
          ? { gubun: '수입', date: zeroDate, itemId: gainItem.id, name: '카드 환차 정리', vendor: null, currency: 'USD', principal: r2(v), rate: 1, amountUsd: r2(v), accountId: c.id, source: 'manual' }
          : { gubun: '지출', date: zeroDate, itemId: feeItem.id, name: '카드 환차 정리', vendor: null, currency: 'USD', principal: r2(-v), rate: 1, amountUsd: r2(-v), accountId: c.id, source: 'manual' },
      )
    }
    if (!items.length) return setErr('정리할 카드를 선택하세요')
    setSaving(true)
    setErr('')
    const res = await bulkCreateInout(items)
    setSaving(false)
    if (!res.ok) return setErr(res.error ?? '저장 실패')
    setZeroOpen(false)
    router.refresh()
  }

  if (!cards.length) return null

  const actions = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 rounded-full bg-b27-plus px-3.5 text-[12.5px] font-medium text-white transition active:opacity-80"
      >
        상환 입력
      </button>
      <button
        type="button"
        onClick={openZero}
        title="상환 후 남은 환차 잔액을 환차익/수수료 1건으로 0 맞춤"
        className="h-8 rounded-full bg-b27-paper px-3.5 text-[12.5px] text-b27-ink transition active:opacity-70"
      >
        잔액 0 맞춤
      </button>
    </>
  )

  const compactActions = (
    <span className="flex items-center gap-1.5">
      <button type="button" onClick={() => setOpen(true)} className="h-8 rounded-full bg-b27-plus px-3.5 font-num text-[13px] font-medium text-white transition active:opacity-80">
        상환
      </button>
      <button type="button" onClick={openZero} className="h-8 rounded-full bg-b27-card px-3.5 font-num text-[13px] font-medium text-b27-muted transition active:opacity-80">
        잔액 0
      </button>
    </span>
  )

  return (
    <>
      {compact ? (
        compactActions
      ) : actionsOnly ? (
        <div className="flex justify-end gap-2">{actions}</div>
      ) : (
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-b27-expense-soft px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-b27-ink">
            <i className="inline-block h-2 w-2 rounded-[2px] bg-b27-expense" aria-hidden="true" />
            카드 미상환
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-b27-muted">
            {cards.map((c) => (
              <span key={c.id}>
                {cardLabel(c)} <b className={`font-num font-semibold ${amtColor(c.balanceUsd)}`}>{fmtUsd(c.balanceUsd)}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-num text-[15px] font-semibold ${amtColor(debt)}`}>{fmtUsd(debt)}</span>
          {actions}
        </div>
      </div>
      )}

      {zeroOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center" onClick={() => setZeroOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-b27-paper p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="카드 잔액 0 맞춤">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-num text-[16px] font-semibold text-b27-ink">카드 잔액 0 맞춤 (환차 정리)</h3>
              <button type="button" onClick={() => setZeroOpen(false)} className="rounded-full bg-b27-card px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70">닫기</button>
            </div>
            <div className="mb-3">
              <label className={lbl}>정리일</label>
              <input type="date" value={zeroDate} onChange={(e) => setZeroDate(e.target.value)} className={inp} />
            </div>
            <div className="overflow-hidden rounded-xl bg-b27-card">
              <table className="w-full text-[12px]">
                <thead className="bg-b27-card text-[10px] text-b27-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">카드</th>
                    <th className="px-2 py-1.5 text-right font-medium">현재 잔액</th>
                    <th className="px-2 py-1.5 text-right font-medium">조정액 (USD)</th>
                    <th className="px-2 py-1.5 text-left font-medium">기록</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => {
                    const v = Number(zeroAmt[c.id]) || 0
                    return (
                      <tr key={c.id} className={`border-t border-b27-line ${zeroPick[c.id] ? '' : 'opacity-50'}`}>
                        <td className="px-2 py-1.5">
                          <label className="flex items-center gap-1.5 text-b27-ink">
                            <input type="checkbox" checked={!!zeroPick[c.id]} onChange={(e) => setZeroPick((p) => ({ ...p, [c.id]: e.target.checked }))} className="h-4 w-4 accent-[#2B3160]" />
                            {cardLabel(c)}
                          </label>
                        </td>
                        <td className={`px-2 py-1.5 text-right font-num ${amtColor(c.balanceUsd)}`}>{fmtUsd(c.balanceUsd)}</td>
                        <td className="px-1 py-1">
                          <input type="number" inputMode="decimal" step="0.01" value={zeroAmt[c.id] ?? ''} onChange={(e) => setZeroAmt((a) => ({ ...a, [c.id]: e.target.value }))} className="h-8 w-24 rounded-full bg-b27-paper px-2 text-right text-[12px] text-b27-ink outline-none focus:ring-2 focus:ring-b27-ink/15" />
                        </td>
                        <td className="px-2 py-1.5 text-[11px] text-b27-muted">{v > 0 ? '수입 · 환차익' : v < 0 ? '지출 · 수수료' : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-b27-muted">조정액 = 현재 잔액의 반대 부호(저장 후 잔액 0). 미상환 결제가 남아 있는 카드는 선택을 해제하세요. 기본 선택 = 잔액 $100 미만.</p>
            {err && <p className="mt-2 text-xs text-b27-expense">{err}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setZeroOpen(false)} className="h-10 rounded-full bg-b27-card px-4 text-sm text-b27-muted">취소</button>
              <button type="button" onClick={onZeroSave} disabled={saving} className="h-10 rounded-full bg-b27-ink px-4 text-sm font-medium text-white disabled:opacity-50">
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center" onClick={close}>
          <div className="w-full max-w-md rounded-3xl bg-b27-paper p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="카드대금 상환">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-num text-[16px] font-semibold text-b27-ink">카드대금 상환</h3>
              <button type="button" onClick={close} className="rounded-full bg-b27-card px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70">닫기</button>
            </div>
            {hnlCards.length > 0 && krwCards.length > 0 && (
              <div className="mb-3 flex h-9 rounded-full bg-b27-card p-[3px] text-xs">
                {(['HNL', 'KRW'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setErr('') }}
                    className={`flex-1 rounded-full ${mode === m ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted'}`}
                  >
                    {m === 'HNL' ? 'Ficohsa (렘피라)' : '원화 카드'}
                  </button>
                ))}
              </div>
            )}
            {mode === 'KRW' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={lbl}>상환일</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>출금계좌</label>
                    <select value={krwFrom} onChange={(e) => setKrwFrom(e.target.value)} className={inp}>
                      {krwSources.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>카드</label>
                    <select value={krwCard} onChange={(e) => setKrwCard(e.target.value)} className={inp}>
                      {krwCards.map((c) => (
                        <option key={c.id} value={c.id}>{cardLabel(c)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>상환 금액 (원)</label>
                    <input type="number" inputMode="numeric" value={krwAmt} onChange={(e) => setKrwAmt(e.target.value)} placeholder="명세서 청구 금액" className={inp} autoFocus />
                  </div>
                </div>
                {kCycle && (
                  <div className="mt-3 space-y-0.5 rounded-xl bg-b27-card px-3 py-2 text-[12px] text-b27-muted">
                    <div>
                      확정 청구 ({Number(kCycle.closeDate.slice(5, 7))}/{Number(kCycle.closeDate.slice(8, 10))} 마감 · {Number(kCycle.dueDate.slice(5, 7))}/{Number(kCycle.dueDate.slice(8, 10))} 상환){' '}
                      <b className={`font-num ${kCycle.overdue ? 'text-b27-expense' : 'text-b27-ink'}`}>
                        {fmtLocal(kCycle.billed.own, 'KRW')}
                        {kCycle.billed.usd > 0.005 ? ` + ${fmtUsd(kCycle.billed.usd)}` : ''}
                      </b>
                    </div>
                    <div>
                      이용 중 ({Number(kCycle.nextDueDate.slice(5, 7))}/{Number(kCycle.nextDueDate.slice(8, 10))} 예정){' '}
                      <b className="font-num text-b27-ink">
                        {fmtLocal(kCycle.unbilled.own, 'KRW')}
                        {kCycle.unbilled.usd > 0.005 ? ` + ${fmtUsd(kCycle.unbilled.usd)}` : ''}
                      </b>
                    </div>
                  </div>
                )}
                {kCard && !kCycle && (
                  <div className="mt-3 rounded-xl bg-b27-card px-3 py-2 text-[12px] text-b27-muted">
                    현재 미상환{' '}
                    <b className="font-num text-b27-ink">
                      {fmtLocal(Math.max(0, kDue), 'KRW')}
                      {kDueUsd > 0.005 ? ` + ${fmtUsd(kDueUsd)}` : ''}
                    </b>{' '}
                    · 평가 <span className={`font-num ${amtColor(kCard.valueUsd ?? kCard.balanceUsd)}`}>{fmtUsd(kCard.valueUsd ?? kCard.balanceUsd)}</span>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-b27-muted">달러 결제분도 원화로 청구된 금액을 합쳐 입력하세요. 상환 후 남는 환차는 「잔액 0 맞춤」으로 정리합니다.</p>
              </>
            ) : (
            <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>상환일</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>출금계좌</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={inp}>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>상환 총액 (HNL)</label>
                <input type="number" inputMode="decimal" value={totalHnl} onChange={(e) => { setTotalHnl(e.target.value); setHnlOverride({}) }} placeholder="명세서 렘피라 합계" className={inp} autoFocus />
              </div>
              <div>
                <label className={lbl}>환율 (1 USD = HNL)</label>
                <input type="number" inputMode="decimal" step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>USD 결제분 (선택)</label>
                <input type="number" inputMode="decimal" value={totalUsd} onChange={(e) => { setTotalUsd(e.target.value); setUsdOverride({}) }} placeholder="달러로 청구된 금액이 있으면" className={inp} />
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl bg-b27-card">
              <table className="w-full text-[12px]">
                <thead className="bg-b27-card text-[10px] text-b27-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">카드</th>
                    <th className="px-2 py-1.5 text-right font-medium">현재</th>
                    <th className="px-2 py-1.5 text-right font-medium">HNL</th>
                    {tUsd > 0 && <th className="px-2 py-1.5 text-right font-medium">USD</th>}
                    <th className="px-2 py-1.5 text-right font-medium">상환 후</th>
                  </tr>
                </thead>
                <tbody>
                  {hnlCards.map((c, i) => {
                    const after = r2(c.balanceUsd + (rt > 0 ? rowHnl(i) / rt : 0) + rowUsd(i))
                    return (
                      <tr key={c.id} className="border-t border-b27-line">
                        <td className="px-2 py-1.5 text-b27-ink">{cardLabel(c)}</td>
                        <td className={`px-2 py-1.5 text-right font-num ${amtColor(c.balanceUsd)}`}>{fmtUsd(c.balanceUsd)}</td>
                        <td className="px-1 py-1">
                          <input type="number" inputMode="decimal" value={hnlOverride[c.id] ?? String(autoHnl[i] || '')} onChange={(e) => setHnlOverride((o) => ({ ...o, [c.id]: e.target.value }))} className="h-8 w-24 rounded-full bg-b27-paper px-2 text-right text-[12px] text-b27-ink outline-none focus:ring-2 focus:ring-b27-ink/15" />
                        </td>
                        {tUsd > 0 && (
                          <td className="px-1 py-1">
                            <input type="number" inputMode="decimal" value={usdOverride[c.id] ?? String(autoUsd[i] || '')} onChange={(e) => setUsdOverride((o) => ({ ...o, [c.id]: e.target.value }))} className="h-8 w-20 rounded-full bg-b27-paper px-2 text-right text-[12px] text-b27-ink outline-none focus:ring-2 focus:ring-b27-ink/15" />
                          </td>
                        )}
                        <td className={`px-2 py-1.5 text-right font-num font-semibold ${amtColor(after)}`}>{fmtUsd(after)}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-b27-line bg-b27-card text-[11px] text-b27-muted">
                    <td className="px-2 py-1.5">합계</td>
                    <td />
                    <td className={`px-2 py-1.5 text-right ${Math.abs(sumHnl - tHnl) > 0.009 ? 'text-b27-expense' : ''}`}>{fmtLocal(sumHnl, 'HNL')}</td>
                    {tUsd > 0 && <td className={`px-2 py-1.5 text-right ${Math.abs(sumUsd - tUsd) > 0.009 ? 'text-b27-expense' : ''}`}>{fmtUsd(sumUsd)}</td>}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-b27-muted">카드별 미상환 잔액 비율로 자동 분할됩니다. 칸을 고치면 그 값으로 저장되며, 합계는 총액과 같아야 합니다. 상환 후 남는 잔차는 월말 환차익/수수료 1건으로 정리하세요.</p>
            </>
            )}
            {err && <p className="mt-2 text-xs text-b27-expense">{err}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={close} className="h-10 rounded-full bg-b27-card px-4 text-sm text-b27-muted">취소</button>
              <button type="button" onClick={onSave} disabled={saving} className="h-10 rounded-full bg-b27-ink px-4 text-sm font-medium text-white disabled:opacity-50">
                {saving ? '저장 중…' : `이체 저장`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
