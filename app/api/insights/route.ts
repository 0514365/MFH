// MFH-INSIGHT-API-V1
// POST /api/insights — 자동 인사이트 생성(옵션 경로, API 종량제).
// 흐름: 세션 RLS 조회 → buildDataMarkdown → Anthropic /v1/messages(fetch) → insights insert → 반환.
// 키는 서버 전용(ANTHROPIC_API_KEY). SDK 미사용(fetch 직접) — npm 의존성 0.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  buildDataMarkdown,
  domainNeeds,
  isValidDomain,
  periodStart,
  todayStr,
  type InsightDomain,
  type ExportData,
} from '@/lib/insightExport'
import {
  buildSystemPrompt,
  buildFewShot,
  type FewShotExample,
} from '@/lib/insightPrompt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다. 수동(내보내기) 방식을 사용하세요.' },
      { status: 503 }
    )
  }

  let body: { domain?: string; periodDays?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const domain = (body.domain ?? 'overall') as InsightDomain
  if (!isValidDomain(domain)) {
    return NextResponse.json({ error: '알 수 없는 분야입니다.' }, { status: 400 })
  }
  const days = [7, 30, 90].includes(Number(body.periodDays)) ? Number(body.periodDays) : 30
  const pStart = periodStart(days)
  const pEnd = todayStr()

  const need = domainNeeds(domain)

  const data: ExportData = { domain, periodDays: days, periodStart: pStart, periodEnd: pEnd }

  if (need.journal) {
    const { data: rows } = await supabase
      .from('journal_entries')
      .select(
        'entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name'
      )
      .gte('entry_date', pStart)
      .lte('entry_date', pEnd)
      .order('entry_date', { ascending: true })
    data.journals = rows ?? []
  }
  if (need.project) {
    const { data: rows } = await supabase
      .from('projects')
      .select('title,description,status,importance,start_date,due_date,category')
      .order('due_date', { ascending: true })
    data.projects = rows ?? []
  }
  if (need.task) {
    const { data: rows } = await supabase
      .from('tasks')
      .select('title,description,status,done,importance,due_date,due_time,category')
      .order('due_date', { ascending: true })
    data.tasks = rows ?? []
  }

  // few-shot: rating>=4 과거 인사이트(같은 domain 우선, 없으면 overall 포함).
  const { data: liked } = await supabase
    .from('insights')
    .select('domain,content,rating,feedback_note')
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(6)
  const fewShot = buildFewShot((liked ?? []) as FewShotExample[])
  const system = buildSystemPrompt(domain, fewShot)
  const dataMd = buildDataMarkdown(data)

  // Anthropic 호출 — system 은 cache_control 로 캐싱(반복 호출 입력비 절감).
  let content = ''
  let modelUsed = MODEL
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: dataMd }],
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      const status = res.status === 402 || res.status === 429 ? res.status : 502
      const msg =
        res.status === 402
          ? 'API 크레딧이 부족합니다. 콘솔에서 결제수단을 등록하거나 수동 방식을 사용하세요.'
          : `생성에 실패했습니다. (${res.status})`
      console.error('anthropic error', res.status, errText.slice(0, 300))
      return NextResponse.json({ error: msg }, { status })
    }
    const json = await res.json()
    modelUsed = typeof json.model === 'string' ? json.model : MODEL
    content = Array.isArray(json.content)
      ? json.content
          .filter((b: { type?: string }) => b.type === 'text')
          .map((b: { text?: string }) => b.text ?? '')
          .join('\n')
          .trim()
      : ''
  } catch (e) {
    console.error('anthropic fetch failed', e)
    return NextResponse.json({ error: '생성 요청 중 오류가 발생했습니다.' }, { status: 502 })
  }
  if (!content) {
    return NextResponse.json({ error: '빈 응답을 받았습니다. 다시 시도해 주세요.' }, { status: 502 })
  }

  const { data: inserted, error: insErr } = await supabase
    .from('insights')
    .insert({
      domain,
      period_start: pStart,
      period_end: pEnd,
      content,
      model: modelUsed,
    })
    .select('id,domain,period_start,period_end,content,model,rating,feedback_note,created_at')
    .single()
  if (insErr) {
    console.error('insights insert error', insErr)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ insight: inserted }, { status: 201 })
}
