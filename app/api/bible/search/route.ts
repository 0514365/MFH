// MFH-BIBLE-SEARCH-API-V1 — GET /api/bible/search?q=사랑 은혜&ver=nkrv&scope=all|ot|nt|book:43&offset=0
//   → { total, offset, limit, rows:[{chap_seq, book_order, chapter, verse, verse_end, body}] }
// 단어 검색(부분일치 ilike, 여러 단어는 AND, 최대 5단어). 결과는 정경 순서, 100건 페이지.
// 로그인 필수(401), RLS is_member 이중 방어. patch106(pg_trgm GIN)은 속도용 — 없어도 동작.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { parseBibleVersion, type VerseRow } from '@/lib/bible/texts'
import { parseScope } from '@/lib/bible/ref'

export const dynamic = 'force-dynamic'

const LIMIT = 100
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const words = (sp.get('q') ?? '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 5)
  if (words.length === 0 || words.join('').length < 2) {
    return NextResponse.json({ error: '검색어는 2자 이상 입력하세요.' }, { status: 400 })
  }
  const ver = parseBibleVersion(sp.get('ver'))
  const scope = parseScope(sp.get('scope'))
  const offset = Math.max(0, Number(sp.get('offset')) || 0)

  let q = supabase
    .from('bible_texts')
    .select('chap_seq, book_order, chapter, verse, verse_end, body', { count: 'exact' })
    .eq('version', ver)
  if (scope === 'ot') q = q.lte('book_order', 39)
  else if (scope === 'nt') q = q.gte('book_order', 40)
  else if (scope.startsWith('book:')) q = q.eq('book_order', Number(scope.slice(5)))
  for (const w of words) q = q.ilike('body', `%${escapeLike(w)}%`)

  const { data, count, error } = await q.order('chap_seq').order('verse').range(offset, offset + LIMIT - 1)
  if (error) return NextResponse.json({ error: '검색에 실패했습니다.' }, { status: 500 })
  return NextResponse.json(
    { total: count ?? 0, offset, limit: LIMIT, rows: (data ?? []) as VerseRow[] },
    { headers: { 'Cache-Control': 'private, max-age=600' } },
  )
}
