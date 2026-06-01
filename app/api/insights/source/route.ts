// MFH-INSIGHT-SOURCE-API-V1
// /api/insights/source — 드롭박스 준자동 회수(1b).
//  · GET    현재 소스 조회(링크·마지막 회수 시각·건수)
//  · PUT    { url } 등록/수정 — 드롭박스 공유 링크만 허용
//  · DELETE 소스 해제
//  · POST   동기화: 드롭박스 fetch → 내용 해시 비교 → 바뀐 경우에만 parseInsightBundle 로 분배 insert.
// 모두 무료(Anthropic 호출 없음). 회수 본문은 /api/insights/import 와 동일 경로(parseInsightBundle).
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase-server'
import { periodStart, todayStr } from '@/lib/insightExport'
import { parseInsightBundle } from '@/lib/insightImport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 드롭박스 호스트만 허용(서버 fetch SSRF 완화).
const ALLOWED_HOSTS = new Set(['www.dropbox.com', 'dropbox.com', 'dl.dropboxusercontent.com'])
const MAX_BYTES = 1_000_000
const FETCH_TIMEOUT_MS = 10_000
const BLOCK_MARKER = '===MFH-INSIGHT==='
const SOURCE_COLS = 'url,last_hash,last_fetched_at,last_imported_at,last_count'

// 드롭박스 공유 링크를 직접 다운로드(raw) 형태로 변환 + 호스트 검증. 허용 외면 null.
function toRawDropboxUrl(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null
  if (!ALLOWED_HOSTS.has(u.hostname)) return null
  // dl.dropboxusercontent.com 은 이미 raw. dropbox.com 계열은 dl=1 강제.
  if (u.hostname !== 'dl.dropboxusercontent.com') u.searchParams.set('dl', '1')
  return u.toString()
}

async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  const { data } = await supabase
    .from('insight_sources')
    .select(SOURCE_COLS)
    .eq('user_id', user.id)
    .maybeSingle()
  return NextResponse.json({ source: data ?? null })
}

export async function PUT(req: Request) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const url = (body.url ?? '').trim()
  if (!url) return NextResponse.json({ error: '링크를 입력해 주세요.' }, { status: 400 })
  if (!toRawDropboxUrl(url)) {
    return NextResponse.json({ error: '드롭박스 공유 링크만 등록할 수 있습니다.' }, { status: 400 })
  }

  // 링크가 바뀌면 다음 동기화에서 무조건 재회수하도록 해시 초기화.
  const { data, error } = await supabase
    .from('insight_sources')
    .upsert(
      { user_id: user.id, url, last_hash: null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select(SOURCE_COLS)
    .maybeSingle()
  if (error) return NextResponse.json({ error: `저장에 실패했습니다. (${error.message})` }, { status: 500 })
  return NextResponse.json({ source: data })
}

export async function DELETE() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  const { error } = await supabase.from('insight_sources').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: `해제에 실패했습니다. (${error.message})` }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { data: src } = await supabase
    .from('insight_sources')
    .select('url,last_hash')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!src) return NextResponse.json({ error: '등록된 소스가 없습니다.' }, { status: 404 })
  const fetchUrl = toRawDropboxUrl(src.url)
  if (!fetchUrl) return NextResponse.json({ error: '소스 링크가 올바르지 않습니다.' }, { status: 400 })

  // 드롭박스 fetch (타임아웃 + 크기 제한).
  let text: string
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(fetchUrl, { signal: ctrl.signal, redirect: 'follow' })
    if (!res.ok) {
      return NextResponse.json({ error: `드롭박스에서 가져오지 못했습니다. (${res.status})` }, { status: 502 })
    }
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) return NextResponse.json({ error: '파일이 너무 큽니다.' }, { status: 413 })
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: '파일이 너무 큽니다.' }, { status: 413 })
    text = new TextDecoder('utf-8').decode(buf)
  } catch {
    return NextResponse.json({ error: '드롭박스 연결에 실패했습니다.' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }

  const nowIso = new Date().toISOString()
  const hash = createHash('sha256').update(text).digest('hex')

  // 내용 변화 없음 → 회수 skip, fetch 시각만 갱신.
  if (hash === src.last_hash) {
    await supabase
      .from('insight_sources')
      .update({ last_fetched_at: nowIso, updated_at: nowIso })
      .eq('user_id', user.id)
    return NextResponse.json({ unchanged: true, imported: 0, insights: [] })
  }

  // 자동 회수는 양식 블록이 있는 파일만 인정(오등록·무관 파일 통짜 저장 방지).
  if (!text.includes(BLOCK_MARKER)) {
    await supabase
      .from('insight_sources')
      .update({ last_hash: hash, last_fetched_at: nowIso, updated_at: nowIso })
      .eq('user_id', user.id)
    return NextResponse.json({ unchanged: false, imported: 0, insights: [], noBlocks: true })
  }

  const parsed = parseInsightBundle(text, 'overall')
  if (parsed.length === 0) {
    await supabase
      .from('insight_sources')
      .update({ last_hash: hash, last_fetched_at: nowIso, updated_at: nowIso })
      .eq('user_id', user.id)
    return NextResponse.json({ unchanged: false, imported: 0, insights: [], noBlocks: true })
  }

  const defStart = periodStart(30)
  const defEnd = todayStr()
  // RLS insert 정책(auth.uid() = user_id)을 통과하려면 user_id 명시.
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
    console.error('insight source sync insert error', error)
    return NextResponse.json({ error: `저장에 실패했습니다. (${error.message})` }, { status: 500 })
  }

  const count = inserted?.length ?? 0
  await supabase
    .from('insight_sources')
    .update({ last_hash: hash, last_fetched_at: nowIso, last_imported_at: nowIso, last_count: count, updated_at: nowIso })
    .eq('user_id', user.id)

  return NextResponse.json({ unchanged: false, imported: count, insights: inserted ?? [] }, { status: 201 })
}
