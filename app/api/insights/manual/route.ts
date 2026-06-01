// MFH-INSIGHT-MANUAL-API-V1
// POST /api/insights/manual — claude.ai(Max)에서 받은 인사이트 텍스트를 저장.
// API 호출 없음. model='manual' 로 표기해 자동 생성분과 구분.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isValidDomain, periodStart, todayStr, type InsightDomain } from '@/lib/insightExport'

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
  const domain = (body.domain ?? 'overall') as InsightDomain
  if (!isValidDomain(domain)) return NextResponse.json({ error: '알 수 없는 분야입니다.' }, { status: 400 })
  const content = (body.content ?? '').trim()
  if (!content) return NextResponse.json({ error: '내용이 비어 있습니다.' }, { status: 400 })
  const days = [7, 30, 90].includes(Number(body.periodDays)) ? Number(body.periodDays) : 30

  const { data: inserted, error } = await supabase
    .from('insights')
    .insert({
      user_id: user.id,
      domain,
      period_start: periodStart(days),
      period_end: todayStr(),
      content: content.slice(0, 20000),
      model: 'manual',
    })
    .select('id,domain,period_start,period_end,content,model,rating,feedback_note,created_at')
    .single()
  if (error) {
    console.error('manual insert error', error)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ insight: inserted }, { status: 201 })
}
