// MFH-INSIGHT-SCRAP-DELETE-API-V1
// DELETE /api/insights/scraps/[id] — 보관 항목 삭제(RLS: 본인 것만).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  const { error } = await supabase.from('insight_scraps').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
