'use client'

// MFH-LOG-PANEL-V1
// 관계 히스토리 — 첫만남/선교발송/방문/연락/기도요청 기록 목록 + 인라인 추가/삭제.
// journal_id 연계(Phase B)를 위한 자리는 스키마에 마련됨(여기서는 null).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { SupporterLog, SupporterLogType } from '@/lib/types'
import { LOG_TYPES, LOG_TYPE_LABEL } from '@/lib/supporters'
import DateField from '../../journal/DateField'

function todayTegucigalpa(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
}

export default function LogPanel({
  supporterId,
  initial,
  canEdit,
}: {
  supporterId: string
  initial: SupporterLog[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [rows, setRows] = useState<SupporterLog[]>(initial)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState(todayTegucigalpa())
  const [ltype, setLtype] = useState<SupporterLogType>('contact')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  function resetForm() {
    setDate(todayTegucigalpa())
    setLtype('contact')
    setTitle('')
    setBody('')
    setMsg(null)
  }

  async function add() {
    if (!title.trim() && !body.trim()) {
      setMsg('제목 또는 내용을 입력해 주세요.')
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
      log_date: date,
      log_type: ltype,
      title: title.trim() || null,
      body: body.trim() || null,
      journal_id: null,
    }
    const { data, error } = await supabase
      .from('supporter_logs')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      setBusy(false)
      setMsg('저장 실패: ' + error.message)
      return
    }
    setRows((r) => [data as SupporterLog, ...r].sort((a, b) => b.log_date.localeCompare(a.log_date)))
    setBusy(false)
    setOpen(false)
    resetForm()
    router.refresh()
  }

  async function del(id: string) {
    if (!confirm('이 기록을 삭제할까요?')) return
    const supabase = createClient()
    const { error } = await supabase.from('supporter_logs').delete().eq('id', id)
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
      <div className="mb-4">
        <div className="mb-1 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
          History
        </div>
        <h2 className="text-[17px] font-bold tracking-tight text-ink">관계 히스토리</h2>
      </div>

      {canEdit && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-3 w-full rounded-xl border border-dashed border-line py-2.5 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
        >
          + 기록 추가
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
              <select value={ltype} onChange={(e) => setLtype(e.target.value as SupporterLogType)} className={input}>
                {LOG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LOG_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold text-faint">제목</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="예: 단기선교 방문" />
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold text-faint">내용</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className={`${input} resize-none [field-sizing:content]`}
              placeholder="상세 내용"
            />
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
        <p className="py-4 text-center text-xs text-faint">기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => (
            <li key={l.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                  {LOG_TYPE_LABEL[l.log_type as SupporterLogType] ?? l.log_type}
                </span>
                <span className="text-xs text-muted">{l.log_date}</span>
                {canEdit && (
                  <button type="button" onClick={() => del(l.id)} className="ml-auto text-xs text-faint hover:text-danger">
                    삭제
                  </button>
                )}
              </div>
              {l.title && <div className="mt-1.5 font-semibold text-ink">{l.title}</div>}
              {l.body && <div className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{l.body}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
