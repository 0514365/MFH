'use client'

// MFH-DOMAIN-INSIGHT-PANEL-V1
// 분야 페이지(일지/프로젝트/할일) 상단의 접이식 인사이트 패널.
//  · 기본 닫힘. 펼칠 때 해당 domain 인사이트를 조회(가벼운 lazy load).
//  · 본문은 InsightsClient 의 DomainInsightBody 재사용(기간칩 + 생성/가져오기 + 결과목록).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { DOMAIN_LABEL, type InsightDomain } from '@/lib/insightExport'
import { DomainInsightBody, type InsightRow } from '@/app/insights/InsightsClient'

const COLS = 'id,domain,period_start,period_end,content,model,rating,feedback_note,created_at'

export default function DomainInsightPanel({
  domain,
  hasApiKey,
}: {
  domain: InsightDomain
  hasApiKey: boolean
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<InsightRow[] | null>(null)

  // 펼칠 때 한 번만 조회(lazy). RLS 로 본인·멤버 데이터.
  useEffect(() => {
    if (!open || rows !== null) return
    let alive = true
    const supabase = createClient()
    void supabase
      .from('insights')
      .select(COLS)
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (alive) setRows((data ?? []) as InsightRow[])
      })
    return () => {
      alive = false
    }
  }, [open, rows, domain])

  const addRows = (added: InsightRow[]) => setRows((r) => [...added, ...(r ?? [])])
  const patchRow = (id: string, patch: Partial<InsightRow>) =>
    setRows((r) => (r ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeRow = (id: string) => setRows((r) => (r ?? []).filter((x) => x.id !== id))

  return (
    <div className="mb-5 rounded-2xl border border-line bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-primary"
      >
        <span>{DOMAIN_LABEL[domain]}</span>
        <span className="text-faint">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-4">
          {rows === null ? (
            <p className="text-sm text-faint">불러오는 중…</p>
          ) : (
            <DomainInsightBody
              domain={domain}
              rows={rows}
              hasApiKey={hasApiKey}
              onAdd={addRows}
              onPatch={patchRow}
              onRemove={removeRow}
            />
          )}
        </div>
      )}
    </div>
  )
}
