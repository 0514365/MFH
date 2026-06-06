// MFH-INSIGHT-SCRAPS-API-V1
// /api/insights/scraps — 인사이트 "보관"(스크랩) 저장·목록.
//  · POST  { source_id?, domain, content, period_start?, period_end?, rating?, feedback_note? }
//          → 생성 시점 복사본 insert. 같은 source_id 가 이미 있으면 그 행을 반환(중복 보관 방지).
//  · GET   보관 목록(최신순).
// 인사이트는 도메인별 최신 1행만 유지(루틴 upsert)되므로, 남기고 싶은 건 여기에 복사 보관한다.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isValidDomain } from '@/lib/insightExport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SCRAP_COLS =
  'id,source_id,domain,content,period_start,period_end,rating,feedback_note,scrapped_at'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  const { data } = await supabase
    .from('insight_scraps')
    .select(SCRAP_COLS)
    .order('scrapped_at', { ascending: false })
  return NextResponse.json({ scraps: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  let body: {
    source_id?: string
    domain?: string
    content?: string
    period_start?: string | null
    period_end?: string | null
    rating?: number | null
    feedback_note?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const domain = (body.domain ?? '') as string
  if (!isValidDomain(domain)) return NextResponse.json({ error: '알 수 없는 분야입니다.' }, { status: 400 })
  const content = (body.content ?? '').trim()
  if (!content) return NextResponse.json({ error: '내용이 비어 있습니다.' }, { status: 400 })

  // 같은 원본 중복 보관 방지.
  if (body.source_id) {
    const { data: exist } = await supabase
      .from('insight_scraps')
      .select(SCRAP_COLS)
      .eq('source_id', body.source_id)
      .maybeSingle()
    if (exist) return NextResponse.json({ scrap: exist, already: true }, { status: 200 })
  }

  const { data: inserted, error } = await supabase
    .from('insight_scraps')
    .insert({
      user_id: user.id,
      source_id: body.source_id ?? null,
      domain,
      content: content.slice(0, 20000),
      period_start: body.period_start ?? null,
      period_end: body.period_end ?? null,
      rating: body.rating ?? null,
      feedback_note: body.feedback_note ?? null,
    })
    .select(SCRAP_COLS)
    .single()
  if (error) return NextResponse.json({ error: `보관에 실패했습니다. (${error.message})` }, { status: 500 })
  return NextResponse.json({ scrap: inserted }, { status: 201 })
}
