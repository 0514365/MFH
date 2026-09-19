'use client'
// MFH-ACCOUNT-ADD-FORM-V1
// 계좌 추가 미니폼 — 요약 Balances 카드 안에서 펼침. 이름·통화·계좌정보(선택) → saveAccount(노션 자산 DB).
// 입금계좌·지불계좌는 같은 자산 DB 를 쓰므로 하나로 둘 다 해결. 수정·삭제는 노션에서(A안).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAccount } from './actions'

type Cur = 'KRW' | 'USD' | 'HNL'
const CURRENCIES: Cur[] = ['KRW', 'USD', 'HNL']
const inp =
  'h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none transition focus:border-primary'
const labelCls = 'mb-1 block whitespace-nowrap text-[11px] font-medium text-faint'

export default function AccountAddForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Cur>('KRW')
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function onSave() {
    if (saving) return
    if (!name.trim()) {
      setErr('계좌 이름을 입력하세요')
      return
    }
    setSaving(true)
    setErr('')
    const res = await saveAccount({ name: name.trim(), currency, info: info.trim() || null })
    setSaving(false)
    if (!res.ok) {
      setErr(res.error ?? '저장 실패')
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-line bg-surface-subtle p-3">
      <div className="grid grid-cols-[1fr_84px] gap-2">
        <div>
          <label className={labelCls}>계좌 이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 국민은행"
            autoFocus
            className={inp}
          />
        </div>
        <div>
          <label className={labelCls}>통화</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Cur)} className={inp}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2">
        <label className={labelCls}>계좌정보 (선택)</label>
        <input
          type="text"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder="계좌번호 · 용도 등"
          className={inp}
        />
      </div>
      {err && <p className="mt-2 text-xs font-medium text-accent">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-9 flex-1 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? '…' : '계좌 추가'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex h-9 w-20 items-center justify-center rounded-lg border border-line bg-surface text-sm font-medium text-muted transition hover:text-ink disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </div>
  )
}
