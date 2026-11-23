// MFH-HONDURAS-SPEECH-V1
// 온두라스 동향 낭독(듣기) 텍스트 — 앱 "듣기" 버튼과 시리 단축어 API(/api/honduras/speech)가 공유한다.
//   · speech_script(patch122, /news-update 가 쓴 듣기용 대본)가 있으면 그대로 쓴다.
//   · 없으면(지난 동향·대본 누락) 제목·본문으로 즉석 조립한다 — 출처·URL·발행일은 읽지 않는다.
//   · 순수 함수(서버·클라이언트 공용). DB 조회는 fetchSpeechScript 만.
import type { SupabaseClient } from '@supabase/supabase-js'

type SpeechItem = { title?: string | null; body?: string | null }
type SpeechHighlight = SpeechItem & { tag?: string | null }
export type SpeechSource = {
  news_date: string
  sections: Partial<Record<'politics' | 'economy' | 'society' | 'culture', SpeechItem[]>> | null
  highlights: SpeechHighlight[] | null
  insight: string | null
  prayer_points: string[] | null
}

const SECTION_LABELS = [
  ['politics', '정치'],
  ['economy', '경제'],
  ['society', '사회'],
  ['culture', '문화'],
] as const

// "2026-11-23" → "11월 23일". 형식이 아니면 빈 문자열.
function spokenDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  return m ? `${Number(m[2])}월 ${Number(m[3])}일` : ''
}

// 문장 끝을 마침표로 맞춘다(낭독 시 문장 사이가 붙지 않게).
function sentence(s?: string | null): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return /[.!?。…]$/.test(t) ? t : `${t}.`
}

function itemLines(it: SpeechItem): string[] {
  return [sentence(it.title), sentence(it.body)].filter(Boolean)
}

// 대본이 없을 때의 즉석 조립본 — 화면 순서(주목 → 4분야 → 인사이트 → 기도 포인트) 그대로.
export function buildSpeechFallback(row: SpeechSource): string {
  const out: string[] = []
  const date = spokenDate(row.news_date)
  out.push(date ? `${date} 온두라스 동향입니다.` : '온두라스 동향입니다.')

  const highlights = (row.highlights ?? []).filter((h) => h && ((h.title ?? '').trim() || (h.body ?? '').trim()))
  if (highlights.length) {
    out.push('먼저 주목할 소식입니다.')
    for (const h of highlights) out.push(...itemLines(h))
  }

  for (const [key, label] of SECTION_LABELS) {
    const items = (row.sections?.[key] ?? []).filter((it) => it && ((it.title ?? '').trim() || (it.body ?? '').trim()))
    if (!items.length) continue
    out.push(`${label} 소식입니다.`)
    for (const it of items) out.push(...itemLines(it))
  }

  const insight = sentence(row.insight)
  if (insight) out.push('선교 인사이트입니다.', insight)

  const prayers = (row.prayer_points ?? []).map((p) => sentence(String(p ?? ''))).filter(Boolean)
  if (prayers.length) out.push('기도 포인트입니다.', ...prayers)

  out.push('이상 온두라스 동향이었습니다.')
  return out.join('\n')
}

// 읽을 텍스트 결정 — 저장된 대본 우선, 없으면 조립본.
export function speechText(row: SpeechSource, script?: string | null): string {
  const s = (script ?? '').trim()
  return s || buildSpeechFallback(row)
}

// speech_script 만 따로 조회 — patch122 미적용(컬럼 없음)이어도 화면이 깨지지 않도록 오류는 null 로 흡수.
export async function fetchSpeechScript(supabase: SupabaseClient, id: string): Promise<string | null> {
  const { data, error } = await supabase.from('honduras_news').select('speech_script').eq('id', id).maybeSingle()
  if (error || !data) return null
  const v = (data as { speech_script?: unknown }).speech_script
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
