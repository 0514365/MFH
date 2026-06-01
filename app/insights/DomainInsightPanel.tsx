'use client'

// MFH-DOMAIN-INSIGHT-PANEL-V2
// 분야 페이지(일지/프로젝트/할일) 상단 — 그 분야의 "최신 인사이트 1개"만 읽기 전용으로 표시.
//  · 생성·내보내기·가져오기 없음(입력은 인사이트 홈의 "전체 분석"에서만).
//  · 전체 히스토리는 인사이트 페이지의 분야별 메뉴에서 본다.
//  · 인사이트가 아직 없으면 아무것도 그리지 않는다(분야 페이지를 깔끔히).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { DOMAIN_LABEL, type InsightDomain } from '@/lib/insightExport'

type LatestRow = {
  period_start: string | null
  period_end: string | null
  content: string | null
  model: string | null
}

export default function DomainInsightPanel({ domain }: { domain: InsightDomain }) {
  const [row, setRow] = useState<LatestRow | null>(null)

  useEffect(() => {
    let alive = true
    const supabase = createClient()
    void supabase
      .from('insights')
      .select('period_start,period_end,content,model')
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setRow((data ?? null) as LatestRow | null)
      })
    return () => {
      alive = false
    }
  }, [domain])

  if (!row) return null

  return (
    <div className="mb-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-primary">{DOMAIN_LABEL[domain]}</div>
        <div className="text-[11px] text-faint">
          {row.period_start} ~ {row.period_end} · {row.model === 'manual' ? '수동' : 'AI'}
        </div>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{row.content}</div>
    </div>
  )
}
