'use client'
// MFH-ACCOUNTING-FORM-V1
// 회계 입력 폼 — 데스크탑 가로(스프레드시트형)·모바일 세로. 조건부 콤보·환산 자동·후원자 자동연결.
// 저장은 saveInout(server action) → 노션 write. 노션이 SoT.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions } from '@/lib/notion'
import { saveInout } from './actions'

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const inp =
  'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'
const labelCls = 'mb-1 block whitespace-nowrap text-[11px] font-medium text-faint'

export default function AccountingForm({ options }: { options: AcctOptions }) {
  const router = useRouter()
  const [gubun, setGubun] = useState<'수입' | '지출'>('수입')
  const [date, setDate] = useState(todayLocal)
  const [itemId, setItemId] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'HNL'>('KRW')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)
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

  function resetFields() {
    setItemId('')
    setName('')
    setPrincipal('')
    setRate('')
    setAccountId('')
  }

  async function onSave() {
    setErr('')
    if (!itemId) return setErr('항목을 선택하세요')
    if (!principal || Number(principal) <= 0) return setErr('금액을 입력하세요')
    if (!usd && (!rate || Number(rate) <= 0)) return setErr('환율을 입력하세요')
    const supporterId = isDonation
      ? (options.supporters.find((s) => s.name.trim() === name.trim())?.id ?? null)
      : null
    setSaving(true)
    const res = await saveInout({
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
    })
    setSaving(false)
    if (res.ok) {
      resetFields()
      router.refresh()
    } else {
      setErr(res.error ?? '저장 실패')
    }
  }

  return (
    <div>
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
            type="number"
            inputMode="decimal"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
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
            {amountUsd ? `$${amountUsd.toFixed(2)}` : '—'}
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

        {/* 저장 */}
        <div className="md:w-[72px] md:shrink-0">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex h-9 w-full items-center justify-center rounded-lg bg-accent text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? '…' : '저장'}
          </button>
        </div>
      </div>

      {err && <p className="mt-2 text-xs font-medium text-accent">{err}</p>}
    </div>
  )
}
