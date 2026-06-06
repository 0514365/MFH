'use client'
// MFH-INSIGHT-SAVED-CLIENT-V1
// 보관함 — 스크랩한 인사이트의 영구 복사본 목록(읽기 + 삭제).
// 인사이트는 도메인별 최신 1행만 유지되므로, 남기고 싶은 건 보관함에 모인다.
import { useEffect, useState } from 'react'
import { DOMAIN_LABEL, type InsightDomain } from '@/lib/insightExport'

export type ScrapRow = {
  id: string
  source_id: string | null
  domain: InsightDomain
  content: string | null
  period_start: string | null
  period_end: string | null
  rating: number | null
  feedback_note: string | null
  scrapped_at: string
}

export default function SavedClient({ initial }: { initial: ScrapRow[] }) {
  const [rows, setRows] = useState<ScrapRow[]>(initial)
  // 보관 시각(날짜+시:분) — 보는 사람 로컬 기준. SSR=날짜만(UTC) → 마운트 후 시:분(hydration 안전).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const fmtAt = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return mounted
      ? `${d.toLocaleDateString('en-CA')} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : d.toISOString().slice(0, 10)
  }

  async function remove(id: string) {
    const res = await fetch(`/api/insights/scraps/${id}`, { method: 'DELETE' })
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id))
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-faint">
        보관한 인사이트가 없습니다. 인사이트 카드에서 ‘보관’을 누르면 여기에 모입니다.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-primary">
              {DOMAIN_LABEL[row.domain] ?? row.domain}
            </div>
            <div className="text-[11px] text-faint">{fmtAt(row.scrapped_at)} · 보관</div>
          </div>
          <div className="mt-1 text-[11px] text-faint">
            {row.period_start} ~ {row.period_end}
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {row.content}
          </div>
          {row.feedback_note && (
            <div className="mt-2 rounded-lg bg-surface-subtle p-2 text-xs text-muted">
              메모: {row.feedback_note}
            </div>
          )}
          <div className="mt-3 flex items-center">
            {row.rating ? (
              <span className="text-xs text-accent">{'★'.repeat(row.rating)}</span>
            ) : (
              <span />
            )}
            <button onClick={() => remove(row.id)} className="ml-auto text-xs text-faint underline">
              삭제
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
