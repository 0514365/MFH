// MFH-BIBLE-CHAPTER-API-V1 — GET /api/bible/chapter?ver=esv&seq=1000
//   → { served, seq, verses:[{chap_seq, book_order, chapter, verse, verse_end, body}] }
// bible_texts(patch105) 한 장 조회 — /bible/study 패널용. 로그인 필수(401), RLS is_member 이중 방어.
// 요청 버전에 그 장이 없으면(새한글·ESV 미비 구간) 개역개정으로 폴백하고 served 로 알린다.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { parseBibleVersion, type BibleVersion, type VerseRow } from '@/lib/bible/texts'
import { MAX_SEQ } from '@/lib/bible/ref'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const seq = Number(sp.get('seq'))
  const ver = parseBibleVersion(sp.get('ver'))
  if (!Number.isInteger(seq) || seq < 1 || seq > MAX_SEQ) {
    return NextResponse.json({ error: '요청 값이 올바르지 않습니다.' }, { status: 400 })
  }

  async function load(v: BibleVersion): Promise<VerseRow[]> {
    const { data } = await supabase
      .from('bible_texts')
      .select('chap_seq, book_order, chapter, verse, verse_end, body')
      .eq('version', v)
      .eq('chap_seq', seq)
      .order('verse')
    return (data ?? []) as VerseRow[]
  }

  let served: BibleVersion = ver
  let verses = await load(ver)
  if (verses.length === 0 && ver !== 'nkrv') {
    served = 'nkrv'
    verses = await load('nkrv')
  }
  return NextResponse.json({ served, seq, verses }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
}
