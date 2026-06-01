'use client'

// MFH-DOMAIN-INSIGHT-PANEL-V3
// 분야 페이지(일지/프로젝트/할일) 상단의 접이식 인사이트.
//  · 접이식 헤더는 항상 표시(인사이트가 없어도). 펼칠 때 그 분야 "최신 인사이트 1개"만 조회(lazy).
//  · 읽기 전용 — 생성·내보내기·가져오기 없음(입력은 인사이트 홈의 "전체 분석"에서만).
//  · 전체 히스토리는 인사이트 페이지의 분야별 메뉴에서 본다.
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
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<LatestRow | null | undefined>(undefined) // undefined = 아직 미조회

  useEffect(() => {
    if (!open || row !== undefined) return
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
  }, [open, row, domain])

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
          {row === undefined ? (
            <p className="text-sm text-faint">불러오는 중…</p>
          ) : row === null ? (
            <p className="text-sm text-faint">
              아직 인사이트가 없습니다. 인사이트의 “전체 분석”에서 생성하세요.
            </p>
          ) : (
            <>
              <div className="text-[11px] text-faint">
                {row.period_start} ~ {row.period_end} · {row.model === 'manual' ? '수동' : 'AI'} · 최신
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {row.content}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
