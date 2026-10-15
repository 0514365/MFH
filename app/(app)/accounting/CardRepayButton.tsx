'use client'
// MFH-CARD-REPAY-BUTTON-V1
// 카드대금 상환 도우미 — 기록 탭 카드. 신용카드 계좌(4956 우진 · 7697 진아)의 미상환 잔액을 보여주고,
// 상환 총액(HNL, 선택 USD)·환율·날짜·출금계좌만 입력하면 카드별 잔액 비율로 자동 분할 → 이체 N건 저장(bulkCreateInout, source=manual).
// 분할액은 미리보기에서 수정 가능. 잔차(환차)는 카드 잔액에 남겨 월 1회 환차익/수수료로 0 맞춤(설계 §5).
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, InoutInput } from '@/lib/accounting-types'
import { bulkCreateInout } from './actions'
import { amtColor, fmtLocal, fmtUsd } from './BalanceGroups'

const inp =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-primary'
const lbl = 'mb-1 block text-[11px] font-medium text-faint'
const r2 = (n: number) => Math.round(n * 100) / 100
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

export default function CardRepayButton({ balances }: { balances: AccountBalance[] }) {
  const router = useRouter()
  const cards = useMemo(() => balances.filter((b) => b.kind === '신용카드'), [balances])
  const sources = useMemo(() => balances.filter((b) => b.kind !== '신용카드' && b.currency === 'USD'), [balances])
  const defaultRate = useMemo(() => balances.find((b) => b.currency === 'HNL' && b.rate)?.rate ?? 26.5, [balances])
  const debt = cards.reduce((s, c) => s + c.balanceUsd, 0)

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [from, setFrom] = useState(sources.find((s) => s.cardLast4 === '3070')?.id ?? sources[0]?.id ?? '')
  const [totalHnl, setTotalHnl] = useState('')
  const [totalUsd, setTotalUsd] = useState('')
  const [rate, setRate] = useState(String(defaultRate))
  const [hnlOverride, setHnlOverride] = useState<Record<string, string>>({})
  const [usdOverride, setUsdOverride] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const tHnl = Number(totalHnl) || 0
  const tUsd = Number(totalUsd) || 0
  const rt = Number(rate) || 0
  const autoHnl = useMemo(() => split(tHnl, cards), [tHnl, cards])
  const autoUsd = useMemo(() => split(tUsd, cards), [tUsd, cards])
  const rowHnl = (i: number) => (hnlOverride[cards[i].id] !== undefined ? Number(hnlOverride[cards[i].id]) || 0 : autoHnl[i])
  const rowUsd = (i: number) => (usdOverride[cards[i].id] !== undefined ? Number(usdOverride[cards[i].id]) || 0 : autoUsd[i])
  const sumHnl = cards.reduce((s, _, i) => s + rowHnl(i), 0)
  const sumUsd = cards.reduce((s, _, i) => s + rowUsd(i), 0)

  function close() {
    setOpen(false)
    setErr('')
    setHnlOverride({})
    setUsdOverride({})
  }

  async function onSave() {
    if (saving) return
    if (!from) return setErr('출금계좌를 선택하세요')
    if (!(rt > 0)) return setErr('환율을 입력하세요')
    if (!(tHnl > 0) && !(tUsd > 0)) return setErr('상환 금액을 입력하세요')
    if (Math.abs(sumHnl - tHnl) > 0.009 || Math.abs(sumUsd - tUsd) > 0.009) return setErr('분할 합계가 총액과 다릅니다')
    const items: InoutInput[] = []
    cards.forEach((c, i) => {
      const h = rowHnl(i)
      const u = rowUsd(i)
      if (h > 0)
        items.push({ gubun: '이체', date, itemId: '', name: '카드대금 상환', currency: 'HNL', principal: r2(h), rate: rt, amountUsd: r2(h / rt), accountId: from, toAccountId: c.id, source: 'manual' })
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

  if (!cards.length) return null

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-ink">카드 미상환</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
            {cards.map((c) => (
              <span key={c.id}>
                {cardLabel(c)} <b className={`font-display ${amtColor(c.balanceUsd)}`}>{fmtUsd(c.balanceUsd)}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-display text-[14px] font-bold ${amtColor(debt)}`}>{fmtUsd(debt)}</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-bold text-white transition hover:opacity-90"
          >
            상환 입력
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center" onClick={close}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="카드대금 상환">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink">카드대금 상환</h3>
              <button type="button" onClick={close} className="text-xs text-muted hover:text-primary">닫기</button>
            </div>
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

            <div className="mt-3 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-[12px]">
                <thead className="bg-surface-subtle text-[10px] text-faint">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">카드</th>
                    <th className="px-2 py-1.5 text-right font-medium">현재</th>
                    <th className="px-2 py-1.5 text-right font-medium">HNL</th>
                    {tUsd > 0 && <th className="px-2 py-1.5 text-right font-medium">USD</th>}
                    <th className="px-2 py-1.5 text-right font-medium">상환 후</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c, i) => {
                    const after = r2(c.balanceUsd + (rt > 0 ? rowHnl(i) / rt : 0) + rowUsd(i))
                    return (
                      <tr key={c.id} className="border-t border-line">
                        <td className="px-2 py-1.5 text-ink">{cardLabel(c)}</td>
                        <td className={`px-2 py-1.5 text-right font-display ${amtColor(c.balanceUsd)}`}>{fmtUsd(c.balanceUsd)}</td>
                        <td className="px-1 py-1">
                          <input type="number" inputMode="decimal" value={hnlOverride[c.id] ?? String(autoHnl[i] || '')} onChange={(e) => setHnlOverride((o) => ({ ...o, [c.id]: e.target.value }))} className="h-8 w-24 rounded-md border border-line bg-surface px-2 text-right text-[12px] text-ink outline-none focus:border-primary" />
                        </td>
                        {tUsd > 0 && (
                          <td className="px-1 py-1">
                            <input type="number" inputMode="decimal" value={usdOverride[c.id] ?? String(autoUsd[i] || '')} onChange={(e) => setUsdOverride((o) => ({ ...o, [c.id]: e.target.value }))} className="h-8 w-20 rounded-md border border-line bg-surface px-2 text-right text-[12px] text-ink outline-none focus:border-primary" />
                          </td>
                        )}
                        <td className={`px-2 py-1.5 text-right font-display font-bold ${amtColor(after)}`}>{fmtUsd(after)}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-line bg-surface-subtle text-[11px] text-muted">
                    <td className="px-2 py-1.5">합계</td>
                    <td />
                    <td className={`px-2 py-1.5 text-right ${Math.abs(sumHnl - tHnl) > 0.009 ? 'text-red-700' : ''}`}>{fmtLocal(sumHnl, 'HNL')}</td>
                    {tUsd > 0 && <td className={`px-2 py-1.5 text-right ${Math.abs(sumUsd - tUsd) > 0.009 ? 'text-red-700' : ''}`}>{fmtUsd(sumUsd)}</td>}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-faint">카드별 미상환 잔액 비율로 자동 분할됩니다. 칸을 고치면 그 값으로 저장되며, 합계는 총액과 같아야 합니다. 상환 후 남는 잔차는 월말 환차익/수수료 1건으로 정리하세요.</p>
            {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={close} className="h-10 rounded-lg border border-line px-4 text-sm text-muted">취소</button>
              <button type="button" onClick={onSave} disabled={saving} className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">
                {saving ? '저장 중…' : `이체 저장`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
