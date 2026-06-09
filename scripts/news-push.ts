// MFH-NEWS-PUSH-V1
// Claude Code 가 만든 result.json(온두라스 동향 브리핑)을 읽어 honduras_news 테이블에 upsert + repo 아카이브.
//   · upsert onConflict (user_id, news_date) → 같은 날 재실행은 덮어쓰기(하루 1행).
//   · 저장 귀속 user_id = .env.local 의 MFH_USER_ID(분석은 WebSearch 공개정보, 저장은 1명 귀속).
// 사용:  npx tsx scripts/news-push.ts                       (기본 insights-archive/_news/result.json)
//        npx tsx scripts/news-push.ts path/to/result.json
// ⚠ repo 루트에서 실행(.env.local·insights-archive 경로가 process.cwd() 기준).
import { createClient } from '@supabase/supabase-js'
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// 정규화 후 타입(source 는 항상 string|null 로 채움). 입력 파싱은 normItems 가 unknown 으로 받아 처리.
type SectionItem = { title: string; body: string; source: string | null }
type Sections = {
  politics?: SectionItem[]
  economy?: SectionItem[]
  society?: SectionItem[]
  culture?: SectionItem[]
}
type Highlight = { tag: string; title: string; body: string; source: string | null }
type Result = { news_date?: string; sections?: Sections; highlights?: Highlight[]; insight?: string }

const SECTION_KEYS = ['politics', 'economy', 'society', 'culture'] as const

function loadEnv(): Record<string, string> {
  const text = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  return Object.fromEntries(
    text
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      }),
  )
}

// 날짜 형식(YYYY-MM-DD) 최소 검증.
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

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
  const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY
  const USER_ID = env.MFH_USER_ID
  if (!URL_ || !KEY) {
    console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!USER_ID) {
    console.error(
      'MFH_USER_ID 누락 — .env.local 에 저장 귀속 user_id 를 추가하세요.\n' +
        '  (Supabase 콘솔 Authentication > Users 의 honduras0691@gmail.com ID)',
    )
    process.exit(1)
  }
  const sb = createClient(URL_, KEY, { auth: { persistSession: false } })

  const fileArg = process.argv[2] || join(process.cwd(), 'insights-archive', '_news', 'result.json')
  let parsed: Result
  try {
    parsed = JSON.parse(readFileSync(fileArg, 'utf8')) as Result
  } catch (e) {
    console.error(`입력(result.json)을 읽지 못했습니다: ${fileArg}\n  ${(e as Error).message}`)
    process.exit(1)
  }

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

  const nowIso = new Date().toISOString()
  const row = {
    user_id: USER_ID,
    news_date: parsed.news_date,
    sections,
    highlights,
    insight,
    model: 'claude-code',
    created_at: nowIso, // 재생성 시 '최신'으로 끌어올림.
  }
  const { error } = await sb.from('honduras_news').upsert(row, { onConflict: 'user_id,news_date' })
  if (error) {
    console.error(`[news-push] 저장 실패: ${error.message}`)
    process.exit(1)
  }

  // 영구 아카이브 — JSONL 누적(gitignore).
  const archiveDir = join(process.cwd(), 'insights-archive', '_news')
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true })
  appendFileSync(
    join(archiveDir, 'honduras_news.jsonl'),
    JSON.stringify({ ...row, generated_at: nowIso }) + '\n',
  )

  const counts = SECTION_KEYS.map((k) => `${k} ${sections[k]?.length ?? 0}`).join(' · ')
  console.log(
    `[news-push] 저장 ✓ ${parsed.news_date} · ${counts} · 하이라이트 ${highlights.length} · 인사이트 ${insight ? '있음' : '없음'} (user_id=${USER_ID.slice(0, 8)}…)`,
  )
}

main().catch((e) => {
  console.error('[news-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
