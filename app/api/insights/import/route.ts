// MFH-INSIGHT-IMPORT-API-V1
// POST /api/insights/import — claude.ai(Max) 분석 결과(회수 양식)를 파싱해 렌즈별로 분배 저장.
// API 호출 없음(무료). 붙여넣기/파일 업로드/드롭박스 링크 본문이 모두 이 경로로 회수된다.
//  · 양식 블록이 여러 개면 각 LENS 로 분배 insert(멀티 렌즈 한 번에 업데이트).
//  · 블록 마커가 없으면 fallback domain 단일 저장(레거시 붙여넣기 호환).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isValidDomain, periodStart, todayStr, type InsightDomain } from '@/lib/insightExport'
import { parseInsightBundle } from '@/lib/insightImport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  let body: { domain?: string; periodDays?: number; content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const fallbackRaw = (body.domain ?? 'overall') as string
  const fallbackDomain: InsightDomain = isValidDomain(fallbackRaw) ? fallbackRaw : 'overall'
  const content = (body.content ?? '').trim()
  if (!content) return NextResponse.json({ error: '내용이 비어 있습니다.' }, { status: 400 })
  const days = [7, 30, 90].includes(Number(body.periodDays)) ? Number(body.periodDays) : 30
  const defStart = periodStart(days)
  const defEnd = todayStr()

  const parsed = parseInsightBundle(content, fallbackDomain)
  if (parsed.length === 0) {
    return NextResponse.json({ error: '인식할 내용이 없습니다.' }, { status: 400 })
  }

  // RLS insert 정책(auth.uid() = user_id)을 통과하려면 user_id 를 명시해야 한다.
  const payload = parsed.map((p) => ({
    user_id: user.id,
    domain: p.domain,
    period_start: p.periodStart ?? defStart,
    period_end: p.periodEnd ?? defEnd,
    content: p.content,
    model: 'manual',
    rating: p.rating,
  }))

  const { data: inserted, error } = await supabase
    .from('insights')
    .insert(payload)
    .select('id,domain,period_start,period_end,content,model,rating,feedback_note,created_at')
  if (error) {
    console.error('insights import error', error)
    return NextResponse.json({ error: `저장에 실패했습니다. (${error.message})` }, { status: 500 })
  }

  return NextResponse.json({ insights: inserted ?? [] }, { status: 201 })
}
