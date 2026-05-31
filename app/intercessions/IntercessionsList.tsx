'use client'
// MFH-INTERCESSIONS-LIST-V1
// 멤버 전용 메시지함 — 받은 중보기도 목록 + 읽음 토글 · 삭제.
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export type Intercession = {
  id: string
  visitor_name: string
  message: string
  is_read: boolean
  created_at: string
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}. ${mm}. ${dd} ${hh}:${mi}`
}

export default function IntercessionsList({ initial }: { initial: Intercession[] }) {
  const [items, setItems] = useState<Intercession[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)

  const unread = items.filter((i) => !i.is_read).length

  async function toggleRead(it: Intercession) {
    if (busy) return
    setBusy(it.id)
    const next = !it.is_read
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, is_read: next } : x)))
    try {
      const supabase = createClient()
      const { error } = await supabase.from('intercessions').update({ is_read: next }).eq('id', it.id)
      if (error) throw error
    } catch {
      setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, is_read: it.is_read } : x)))
      alert('처리에 실패했습니다.')
    } finally {
      setBusy(null)
    }
  }

  async function remove(it: Intercession) {
    if (busy) return
    if (!confirm('이 메시지를 삭제할까요? 되돌릴 수 없습니다.')) return
    setBusy(it.id)
    const prev = items
    setItems((arr) => arr.filter((x) => x.id !== it.id))
    try {
      const supabase = createClient()
      const { error } = await supabase.from('intercessions').delete().eq('id', it.id)
      if (error) throw error
    } catch {
      setItems(prev)
      alert('삭제에 실패했습니다.')
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) {
    return (
      <p className="mt-16 text-center text-sm leading-relaxed text-faint">
        아직 받은 메시지가 없습니다.
        <br />
        공개 페이지에서 방문자가 남긴 기도·응원이 여기에 모입니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-3 text-xs text-muted">
        전체 {items.length}개{unread > 0 && <span className="ml-1 font-semibold text-accent">· 안 읽음 {unread}</span>}
      </p>
      <ul className="space-y-3">
        {items.map((it) => (
          <li
            key={it.id}
            className={`rounded-2xl border bg-surface p-4 ${it.is_read ? 'border-line' : 'border-primary'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!it.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                <span className="font-bold text-ink">{it.visitor_name}</span>
              </div>
              <span className="shrink-0 text-[11px] text-faint">{fmtDateTime(it.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{it.message}</p>
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-2.5">
              <button
                type="button"
                onClick={() => toggleRead(it)}
                disabled={busy === it.id}
                className="text-xs font-semibold text-muted underline transition hover:text-primary disabled:opacity-50"
              >
                {it.is_read ? '안 읽음으로' : '읽음으로'}
              </button>
              <button
                type="button"
                onClick={() => remove(it)}
                disabled={busy === it.id}
                className="text-xs font-semibold text-accent underline transition hover:opacity-80 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
