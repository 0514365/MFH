'use client'
// MFH-JOURNAL-LINK-PANEL-V2 — 2027(4-7): theme-2027 · 남색 글자 · 연회색/살구 면 · 강조 = 진한 살구 · 굵기 600 이하.

// MFH-JOURNAL-LINK-PANEL-V1
// 후원자 ↔ 일지 연계(후원자 주도) — 연결된 일지 목록 + 기존 일지 연결/해제.
// journal_entries.supporter_id 를 세팅/해제. 일지 update 권한(본인/마스터 — patch73/91)에 따름.
// 남의 일지를 연결하려다 실패하면(마스터 아님) 에러 메시지로 안내.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

type JItem = { id: string; entry_date: string; headline: string | null }

export default function JournalLinkPanel({
  supporterId,
  linked,
  candidates,
  canEdit,
}: {
  supporterId: string
  linked: JItem[]
  candidates: JItem[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [rows, setRows] = useState<JItem[]>(linked)
  const [pool, setPool] = useState<JItem[]>(candidates)
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function link() {
    if (!pick) {
      setMsg('연결할 일지를 선택해 주세요.')
      return
    }
    setBusy(true)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('journal_entries')
      .update({ supporter_id: supporterId })
      .eq('id', pick)
    if (error) {
      setBusy(false)
      setMsg('연결 실패: ' + error.message)
      return
    }
    const moved = pool.find((j) => j.id === pick)
    if (moved) {
      setRows((r) => [moved, ...r].sort((a, b) => b.entry_date.localeCompare(a.entry_date)))
      setPool((p) => p.filter((j) => j.id !== pick))
    }
    setPick('')
    setOpen(false)
    setBusy(false)
    router.refresh()
  }

  async function unlink(id: string) {
    if (!confirm('이 일지 연결을 해제할까요?')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('journal_entries')
      .update({ supporter_id: null })
      .eq('id', id)
    if (error) {
      alert('해제 실패: ' + error.message)
      return
    }
    const moved = rows.find((j) => j.id === id)
    setRows((r) => r.filter((j) => j.id !== id))
    if (moved) setPool((p) => [moved, ...p].sort((a, b) => b.entry_date.localeCompare(a.entry_date)))
    router.refresh()
  }

  return (
    <section className="border-t border-b27-line px-5 py-7">
      <div className="mb-4">
        <div className="mb-2 font-num text-[12px] font-medium text-b27-muted">연결된 일지</div>
        <h2 className="text-[17px] font-semibold tracking-tight text-b27-ink">연결된 일지</h2>
      </div>

      {canEdit && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-3 w-full rounded-xl border border-dashed border-b27-line py-2.5 text-sm font-medium text-b27-muted transition hover:border-b27-muted hover:text-b27-ink"
        >
          + 일지 연결
        </button>
      )}

      {canEdit && open && (
        <div className="mb-4 space-y-3 rounded-2xl bg-b27-card p-4">
          {pool.length === 0 ? (
            <p className="text-xs text-b27-muted">연결할 수 있는 일지가 없습니다.</p>
          ) : (
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="w-full rounded-xl bg-b27-card px-3 py-2.5 text-sm text-b27-ink outline-none placeholder:text-b27-muted"
            >
              <option value="">일지 선택…</option>
              {pool.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.entry_date} · {j.headline || '(제목 없음)'}
                </option>
              ))}
            </select>
          )}
          {msg && <p className="text-sm text-b27-expense">{msg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={link}
              disabled={busy || !pick}
              className="flex-1 rounded-xl bg-b27-ink py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? '연결 중…' : '연결'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setPick('')
                setMsg(null)
              }}
              className="rounded-xl bg-b27-paper px-4 py-2.5 text-sm font-medium text-b27-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-b27-muted">연결된 일지가 없습니다.</p>
      ) : (
        <ul>
          {rows.map((j) => (
            <li key={j.id} className="flex items-center gap-3 border-b border-b27-line px-1 py-2.5 last:border-b-0">
              <Link href={`/journal/${j.id}`} className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-b27-ink">{j.headline || '(제목 없음)'}</div>
                <div className="mt-0.5 text-xs text-b27-muted">{j.entry_date}</div>
              </Link>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => unlink(j.id)}
                  className="shrink-0 text-xs text-b27-muted hover:text-danger"
                >
                  해제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
