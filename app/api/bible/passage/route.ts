// MFH-BIBLE-PASSAGE-API-V1 — GET /api/bible/passage?book=사사기&range=10:1-18&ver=nkt
//   → { served, verses:[{chap_seq, book_order, chapter, verse, verse_end, body}] }
// bible_texts(patch105) 조회 — QT 「본문 읽기」 접이식용. 로그인 필수(401), 열람 범위는 RLS is_member 가 막는다(이중 방어).
// 요청 버전에 해당 장이 없으면(새한글·ESV 미비 구간) 개역개정으로 폴백하고 served 로 알린다. Manna route V1 이식.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  bookOrderOf,
  getPassageVerses,
  parseBibleVersion,
  parsePassageRange,
  type BibleVersion,
} from '@/lib/bible/texts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  const sp = new URL(request.url).searchParams
  const order = bookOrderOf(sp.get('book') ?? '')
  const range = parsePassageRange(sp.get('range') ?? '')
  const ver = parseBibleVersion(sp.get('ver'))
  if (!order || !range) {
    return NextResponse.json({ error: '요청 값이 올바르지 않습니다.' }, { status: 400 })
  }

  let served: BibleVersion = ver
  let verses = await getPassageVerses(supabase, ver, order, range)
  // 요청 범위의 장이 하나라도 비면 개역개정 폴백(하루치 전체 — /bible/read 와 같은 규칙)
  const chapters = new Set(verses.map((v) => v.chapter))
  const wantChapters = range.c2 - range.c1 + 1
  if (ver !== 'nkrv' && chapters.size < wantChapters) {
    served = 'nkrv'
    verses = await getPassageVerses(supabase, 'nkrv', order, range)
  }
  return NextResponse.json({ served, verses }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
}
