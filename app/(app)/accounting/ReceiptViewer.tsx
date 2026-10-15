'use client'
// MFH-RECEIPT-VIEWER-V1
// 내역 📎 → 영수증 크게 보기(서명 URL 1시간) · 교체(새 업로드 → setReceipt, 이전 파일은 서버 삭제) · 삭제.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { discardReceipt, receiptUrl, uploadReceipt } from '@/lib/receipt'
import { setReceipt } from './actions'

export default function ReceiptViewer({
  inoutId,
  path,
  date,
  title,
  onClose,
}: {
  inoutId: string
  path: string
  date: string | null
  title: string
  onClose: () => void
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    void receiptUrl(createClient(), path).then((u) => {
      if (!alive) return
      if (u) setUrl(u)
      else setErr('영수증을 불러오지 못했습니다')
    })
    return () => {
      alive = false
    }
  }, [path])

  async function onReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr('')
    setBusy(true)
    const sb = createClient()
    let next: string | null = null
    try {
      next = await uploadReceipt(sb, file, date ?? undefined)
      const res = await setReceipt(inoutId, next)
      if (!res.ok) throw new Error(res.error ?? '저장 실패')
      router.refresh()
      onClose()
    } catch (x) {
      if (next) void discardReceipt(sb, next)
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!window.confirm('영수증을 삭제할까요? (거래는 그대로 남습니다)')) return
    setErr('')
    setBusy(true)
    const res = await setReceipt(inoutId, null)
    setBusy(false)
    if (!res.ok) return setErr(res.error ?? '삭제 실패')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 @md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-surface p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="영수증"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-bold text-ink">영수증 · {title}</h3>
          <button type="button" onClick={onClose} className="shrink-0 text-xs text-muted hover:text-primary">
            닫기
          </button>
        </div>
        <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto rounded-lg bg-line/30">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" title="새 탭에서 원본 보기">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="영수증" className="max-h-[70vh] max-w-full object-contain" />
            </a>
          ) : (
            <span className="text-xs text-faint">{err || '불러오는 중…'}</span>
          )}
        </div>
        {err && url && <p className="mt-2 text-xs font-medium text-accent">{err}</p>}
        <input ref={fileRef} type="file" accept="image/*" onChange={onReplace} className="hidden" />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="h-9 rounded-lg border border-line px-3 text-xs text-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:opacity-40"
          >
            {busy ? '처리 중…' : '교체'}
          </button>
        </div>
      </div>
    </div>
  )
}
