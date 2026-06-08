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
  const supabase = await createClient()
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
  const supabase = await createClient()
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

  // 같은 내용(content) 중복 보관 방지. 인사이트는 도메인당 id 고정(upsert)이라
  // source_id 만으로 막으면 재생성된 새 내용을 못 담는다 → content 기준(같은 source 우선).
  {
    let q = supabase.from('insight_scraps').select(SCRAP_COLS).eq('content', content)
    if (body.source_id) q = q.eq('source_id', body.source_id)
    const { data: existRows } = await q.limit(1)
    if (existRows && existRows.length > 0) {
      return NextResponse.json({ scrap: existRows[0], already: true }, { status: 200 })
    }
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

// DELETE — 보관 취소(라이브 카드 토글 해제). body { source_id, content } 의 그 스냅샷만 삭제.
//  · 인사이트는 도메인당 id 고정이라 source_id 만으로 지우면 그 도메인의 보관본 전체가 날아간다.
//    → content 까지 맞춰 "지금 보이는 그 내용"만 제거. content 없으면(구버전) source_id 전체 삭제.
//  · 구버전 폴백: 쿼리스트링 source_id. RLS: 본인 것만.
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  let sourceId: string | null = null
  let content: string | null = null
  try {
    const body = (await req.json()) as { source_id?: string; content?: string }
    sourceId = body.source_id ?? null
    content = typeof body.content === 'string' ? body.content.trim() : null
  } catch {
    sourceId = new URL(req.url).searchParams.get('source_id')
  }
  if (!sourceId) return NextResponse.json({ error: 'source_id 가 필요합니다.' }, { status: 400 })

  let q = supabase.from('insight_scraps').delete().eq('source_id', sourceId)
  if (content !== null) q = q.eq('content', content)
  const { error } = await q
  if (error) return NextResponse.json({ error: '보관 취소에 실패했습니다.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
