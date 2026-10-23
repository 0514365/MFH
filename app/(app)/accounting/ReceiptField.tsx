'use client'
// MFH-RECEIPT-FIELD-2027 — 회계 잔여 a: 흰 칸(연회색 폼 면 위) · 테두리·점선 제거
// MFH-RECEIPT-FIELD-V1
// 기록 폼 영수증 칸 — 📎 버튼(모바일: 카메라/앨범) → 1600px 축소 업로드(lib/receipt) → 썸네일 미리보기(탭 = 크게) · ✕ 제거.
// 값은 Storage 경로 하나(acct_inout.receipt_path). 저장 전 업로드분 정리는 호출부(onChange 의 prev)가 판단한다.
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { receiptUrl, uploadReceipt } from '@/lib/receipt'

export default function ReceiptField({
  value,
  date,
  onChange,
  labelCls,
}: {
  value: string | null
  date: string
  onChange: (next: string | null, prev: string | null) => void
  labelCls: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    let alive = true
    setUrl(null)
    if (value) void receiptUrl(createClient(), value).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [value])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      const path = await uploadReceipt(createClient(), file, date)
      onChange(path, value)
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="@2xl:shrink-0">
      <label className={labelCls}>영수증</label>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      {value ? (
        <div className="flex h-[38px] items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="h-[38px] w-[38px] overflow-hidden rounded-xl bg-b27-paper"
            aria-label="영수증 크게 보기"
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] text-b27-muted">…</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="h-[38px] rounded-xl bg-b27-paper px-2.5 text-[12px] text-b27-ink transition active:opacity-70 disabled:opacity-40"
          >
            {busy ? '…' : '교체'}
          </button>
          <button
            type="button"
            onClick={() => onChange(null, value)}
            disabled={busy}
            aria-label="영수증 제거"
            className="h-[38px] w-7 rounded-xl text-sm text-b27-muted transition active:text-b27-expense"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-[38px] w-full items-center justify-center gap-1 rounded-xl bg-b27-paper px-3 text-[12px] text-b27-ink transition active:opacity-70 disabled:opacity-40 @2xl:w-auto"
        >
          {busy ? '업로드 중…' : '📎 첨부'}
        </button>
      )}
      {err && <p className="mt-1 text-[11px] text-b27-expense">{err}</p>}

      {zoom && url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="영수증" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
