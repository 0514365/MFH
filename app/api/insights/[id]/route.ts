// MFH-INSIGHT-ID-API-V1
// /api/insights/[id]
//  - PATCH: rating(1~5)·feedback_note 저장(피드백 → 선호 프로파일).
//  - DELETE: 단건 삭제(잘못 생성/저장 정리).
// RLS 로 본인 행만 접근 가능.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  let body: { rating?: number | null; feedback_note?: string | null; in_letter?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const patch: { rating?: number | null; feedback_note?: string | null; in_letter?: boolean } = {}
  if ('rating' in body) {
    const r = body.rating
    if (r === null) patch.rating = null
    else if (typeof r === 'number' && r >= 1 && r <= 5) patch.rating = Math.round(r)
    else return NextResponse.json({ error: '별점은 1~5 입니다.' }, { status: 400 })
  }
  if ('feedback_note' in body) {
    patch.feedback_note = body.feedback_note ? String(body.feedback_note).slice(0, 2000) : null
  }
  if ('in_letter' in body) {
    patch.in_letter = body.in_letter === true
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('insights')
    .update(patch)
    .eq('id', params.id)
    .select('id,rating,feedback_note,in_letter')
    .single()
  if (error) {
    console.error('insights patch error', error)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ insight: data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { error } = await supabase.from('insights').delete().eq('id', params.id)
  if (error) {
    console.error('insights delete error', error)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
