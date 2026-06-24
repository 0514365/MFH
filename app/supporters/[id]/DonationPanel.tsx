'use client'

// MFH-DONATION-PANEL-V1
// 헌금 이력 — USD 합계 + 목록 + 인라인 추가/삭제.
// 통화 KRW/USD 선택, KRW 는 환율 입력(직전 환율 기본값) → amount_usd 환산 저장.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { SupporterDonation, Currency, DonationType } from '@/lib/types'
import {
  CURRENCIES,
  DONATION_TYPES,
  DONATION_TYPE_LABEL,
  donationTotalUsd,
  formatMoney,
  formatUsd,
  toUsd,
} from '@/lib/supporters'
import DateField from '../../journal/DateField'

const METHODS: { value: string; label: string }[] = [
  { value: 'transfer', label: '이체' },
  { value: 'cash', label: '현금' },
  { value: 'other', label: '기타' },
]
function methodLabel(v?: string | null): string {
  return METHODS.find((m) => m.value === v)?.label ?? v ?? ''
}

function todayTegucigalpa(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
}

export default function DonationPanel({
  supporterId,
  initial,
  canEdit,
  lastRate,
}: {
  supporterId: string
  initial: SupporterDonation[]
  canEdit: boolean
  lastRate: number | null
}) {
  const router = useRouter()
  const [rows, setRows] = useState<SupporterDonation[]>(initial)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [date, setDate] = useState(todayTegucigalpa())
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [rate, setRate] = useState(lastRate ? String(lastRate) : '')
  const [dtype, setDtype] = useState<DonationType>('regular')
  const [purpose, setPurpose] = useState('')
  const [method, setMethod] = useState('transfer')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const total = donationTotalUsd(rows)
  const amtNum = Number(amount) || 0
  const rateNum = Number(rate) || 0
  const previewUsd = currency === 'USD' ? amtNum : rateNum > 0 ? toUsd(amtNum, 'KRW', rateNum) : 0

  function resetForm() {
    setDate(todayTegucigalpa())
    setAmount('')
    setCurrency('USD')
    setRate(lastRate ? String(lastRate) : '')
    setDtype('regular')
    setPurpose('')
    setMethod('transfer')
    setNote('')
    setMsg(null)
  }

  async function add() {
    if (!amount || amtNum <= 0) {
      setMsg('금액을 입력해 주세요.')
      return
    }
    if (currency === 'KRW' && rateNum <= 0) {
      setMsg('환율을 입력해 주세요.')
      return
    }
    setBusy(true)
    setMsg(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const payload = {
      supporter_id: supporterId,
      user_id: user.id,
      donation_date: date,
      amount: amtNum,
      currency,
      exchange_rate: currency === 'KRW' ? rateNum : null,
      amount_usd: previewUsd,
      donation_type: dtype,
      purpose: purpose.trim() || null,
      method,
      note: note.trim() || null,
    }
    const { data, error } = await supabase
      .from('supporter_donations')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      setBusy(false)
      setMsg('저장 실패: ' + error.message)
      return
    }
    setRows((r) =>
      [data as SupporterDonation, ...r].sort((a, b) => b.donation_date.localeCompare(a.donation_date)),
    )
    setBusy(false)
    setOpen(false)
    resetForm()
    router.refresh()
  }

  async function del(id: string) {
    if (!confirm('이 헌금 기록을 삭제할까요?')) return
    const supabase = createClient()
    const { error } = await supabase.from('supporter_donations').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    setRows((r) => r.filter((x) => x.id !== id))
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary'

  return (
    <section className="border-t border-line px-5 py-7">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            Donations
          </div>
          <h2 className="text-[17px] font-bold tracking-tight text-ink">헌금 이력</h2>
        </div>
        <div className="text-right">
          <div className="font-display text-[8px] font-bold uppercase tracking-[0.15em] text-faint">
            Total (USD)
          </div>
          <div className="font-display text-[16px] font-bold text-ink">{formatUsd(total)}</div>
        </div>
      </div>

      {canEdit && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-3 w-full rounded-xl border border-dashed border-line py-2.5 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
        >
          + 헌금 기록 추가
        </button>
      )}

      {canEdit && open && (
        <div className="mb-4 space-y-3 rounded-2xl border border-line bg-surface-subtle p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-faint">날짜</span>
              <DateField value={date} onChange={setDate} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-faint">유형</span>
              <select value={dtype} onChange={(e) => setDtype(e.target.value as DonationType)} className={input}>
                {DONATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DONATION_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-faint">금액</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className={input} inputMode="decimal" placeholder="0" />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-faint">통화</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={`${input} w-auto`}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {currency === 'KRW' && (
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-faint">환율 (1 USD = ? KRW)</span>
                <input value={rate} onChange={(e) => setRate(e.target.value)} className={input} inputMode="decimal" placeholder="예: 1380" />
              </div>
              <div className="pb-2.5 text-sm font-semibold text-accent">= {formatUsd(previewUsd)}</div>
            </div>
          )}
          <div>
            <span className="mb-1 block text-[11px] font-semibold text-faint">목적 (선택)</span>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={input} placeholder="목적헌금 메모" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-faint">방법</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-faint">메모 (선택)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
            </div>
          </div>
          {msg && <p className="text-sm text-danger">{msg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? '저장 중…' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-faint">헌금 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[13px] font-bold text-ink">{formatUsd(d.amount_usd)}</span>
                  {d.currency === 'KRW' && (
                    <span className="text-[11px] text-muted">({formatMoney(d.amount, 'KRW')})</span>
                  )}
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
                    {DONATION_TYPE_LABEL[d.donation_type as DonationType] ?? d.donation_type}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {d.donation_date}
                  {d.purpose ? ` · ${d.purpose}` : ''}
                  {d.method ? ` · ${methodLabel(d.method)}` : ''}
                </div>
              </div>
              {canEdit && (
                <button type="button" onClick={() => del(d.id)} className="shrink-0 text-xs text-faint hover:text-danger">
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
