// MFH-NEWS-PUSH-V1
// Claude Code 가 만든 result.json(온두라스 동향 브리핑)을 읽어 honduras_news 테이블에 upsert + repo 아카이브.
//   · insert — 같은 날도 매번 새 행으로 누적(아침/저녁·반복 수동 생성 보관). 앱은 "날짜 (N)" 넘버링으로 구분.
//   · 저장 귀속 user_id = .env.local 의 MFH_USER_ID(분석은 WebSearch 공개정보, 저장은 1명 귀속).
// 사용:  npx tsx scripts/news-push.ts                       (기본 insights-archive/_news/result.json)
//        npx tsx scripts/news-push.ts path/to/result.json
// ⚠ repo 루트에서 실행(.env.local·insights-archive 경로가 process.cwd() 기준).
import { join } from 'path'
import {
  loadEnv,
  createServiceClient,
  requireUserId,
  isDate,
  readJsonFile,
  appendArchiveJsonl,
} from './_shared'

// 정규화 후 타입(source 는 항상 string|null 로 채움). 입력 파싱은 normItems 가 unknown 으로 받아 처리.
type SectionItem = { title: string; body: string; source: string | null }
type Sections = {
  politics?: SectionItem[]
  economy?: SectionItem[]
  society?: SectionItem[]
  culture?: SectionItem[]
}
type Highlight = { tag: string; title: string; body: string; source: string | null }
type Result = {
  news_date?: string
  sections?: Sections
  highlights?: Highlight[]
  insight?: string
  prayer_points?: unknown
}

const SECTION_KEYS = ['politics', 'economy', 'society', 'culture'] as const

// 섹션 항목 정규화 — title·body 필수, source 선택.
function normItems(arr: unknown): SectionItem[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>
      const title = typeof o.title === 'string' ? o.title.trim() : ''
      const body = typeof o.body === 'string' ? o.body.trim() : ''
      if (!title && !body) return null
      const source = typeof o.source === 'string' && o.source.trim() ? o.source.trim() : null
      return { title, body, source }
    })
    .filter((x): x is SectionItem => x !== null)
}

async function main() {
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  const fileArg = process.argv[2] || join(process.cwd(), 'insights-archive', '_news', 'result.json')
  const parsed = readJsonFile<Result>(fileArg)

  if (!isDate(parsed.news_date)) {
    console.error('news_date 가 YYYY-MM-DD 형식이 아닙니다.')
    process.exit(1)
  }

  // 섹션 정규화 — 4분야 각각.
  const sIn = parsed.sections ?? {}
  const sections: Sections = {}
  let itemTotal = 0
  for (const key of SECTION_KEYS) {
    const items = normItems(sIn[key])
    sections[key] = items
    itemTotal += items.length
  }

  // 하이라이트 정규화 — tag + title/body 필수.
  const highlights: Highlight[] = Array.isArray(parsed.highlights)
    ? parsed.highlights
        .map((h) => {
          const o = (h ?? {}) as Record<string, unknown>
          const tag = typeof o.tag === 'string' ? o.tag.trim() : ''
          const title = typeof o.title === 'string' ? o.title.trim() : ''
          const body = typeof o.body === 'string' ? o.body.trim() : ''
          if (!tag || (!title && !body)) return null
          const source = typeof o.source === 'string' && o.source.trim() ? o.source.trim() : null
          return { tag, title, body, source }
        })
        .filter((x): x is Highlight => x !== null)
    : []

  if (itemTotal === 0 && highlights.length === 0) {
    console.error('뉴스 항목이 비었습니다(섹션·하이라이트 모두 0건). 검색 결과를 1건 이상 정리하세요.')
    process.exit(1)
  }

  const insight = typeof parsed.insight === 'string' && parsed.insight.trim() ? parsed.insight.trim() : null

  // 기도 포인트 — 문자열 배열로 정규화(빈 항목 제거). 앱에서 별도 박스로 표시.
  const prayerPoints = Array.isArray(parsed.prayer_points)
    ? parsed.prayer_points.map((p) => String(p ?? '').trim()).filter(Boolean)
    : []

  const nowIso = new Date().toISOString()
  const row = {
    user_id: USER_ID,
    news_date: parsed.news_date,
    sections,
    highlights,
    insight,
    prayer_points: prayerPoints,
    model: 'claude-code',
    created_at: nowIso, // 각 행의 생성 시각(같은 날 여러 행이면 순번 기준).
  }
  const { error } = await sb.from('honduras_news').insert(row)
  if (error) {
    console.error(`[news-push] 저장 실패: ${error.message}`)
    process.exit(1)
  }

  // 영구 아카이브 — JSONL 누적(gitignore).
  appendArchiveJsonl('_news', 'honduras_news.jsonl', { ...row, generated_at: nowIso })

  const counts = SECTION_KEYS.map((k) => `${k} ${sections[k]?.length ?? 0}`).join(' · ')
  console.log(
    `[news-push] 저장 ✓ ${parsed.news_date} · ${counts} · 하이라이트 ${highlights.length} · 인사이트 ${insight ? '있음' : '없음'} · 기도포인트 ${prayerPoints.length} (user_id=${USER_ID.slice(0, 8)}…)`,
  )
}

main().catch((e) => {
  console.error('[news-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
