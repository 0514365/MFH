// MFH-QT-PUSH-V1
// Claude Code 가 만든 result.json(일일 QT)을 읽어 daily_qt 테이블에 upsert(하루 1행) + repo 아카이브.
//   · upsert — 같은 (user_id, qt_date) 는 덮어쓰기(하루 1행 유지). honduras_news(누적)와 다름.
//   · 본문 텍스트는 저장 안 함(저작권). passage 메타 + 핵심 절(개역개정 짧은 인용)만.
//   · 저장 귀속 user_id = .env.local 의 MFH_USER_ID.
// 사용:  npx tsx scripts/qt-push.ts                    (기본 insights-archive/_qt/result.json)
//        npx tsx scripts/qt-push.ts path/to/result.json
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

type Passage = { book: string; book_en: string; range: string; title: string; source_url: string | null }
type KeyVerse = { ref: string; text: string; summary: string }
type Application = { point: string; basis: string }
type Result = {
  qt_date?: string
  passage?: Record<string, unknown>
  key_verse?: Record<string, unknown>
  meditation?: string
  commentary?: unknown
  application?: unknown
  prayer_points?: unknown
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const strOrNull = (v: unknown): string | null => str(v) || null

async function main() {
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  const fileArg = process.argv[2] || join(process.cwd(), 'insights-archive', '_qt', 'result.json')
  const parsed = readJsonFile<Result>(fileArg)

  if (!isDate(parsed.qt_date)) {
    console.error('qt_date 가 YYYY-MM-DD 형식이 아닙니다.')
    process.exit(1)
  }

  // 본문 메타 — book·range 필수(저작권상 성경 본문 전체는 저장 안 함).
  const p = (parsed.passage ?? {}) as Record<string, unknown>
  const passage: Passage = {
    book: str(p.book),
    book_en: str(p.book_en),
    range: str(p.range),
    title: str(p.title),
    source_url: strOrNull(p.source_url),
  }
  if (!passage.book || !passage.range) {
    console.error('passage.book / passage.range 가 비었습니다(본문 메타 필수).')
    process.exit(1)
  }

  // 핵심 절 — ref(개역개정 책·장·절) 표기. text 는 짧은 인용(1절).
  const k = (parsed.key_verse ?? {}) as Record<string, unknown>
  const keyVerse: KeyVerse = { ref: str(k.ref), text: str(k.text), summary: str(k.summary) }

  const meditation = strOrNull(parsed.meditation)

  // 본문 설명 — [{heading, body}] 정규화(접이식, 묵상 앞). 신학 가드레일 안에서 작성된 자체 해설.
  const commentary: { heading: string; body: string }[] = Array.isArray(parsed.commentary)
    ? parsed.commentary
        .map((c) => {
          const o = (c ?? {}) as Record<string, unknown>
          const heading = str(o.heading)
          const body = str(o.body)
          return heading || body ? { heading, body } : null
        })
        .filter((x): x is { heading: string; body: string } => x !== null)
    : []

  // 적용 — [{point, basis}] 정규화. point 필수, basis(접목 근거)는 선택.
  const application: Application[] = Array.isArray(parsed.application)
    ? parsed.application
        .map((a) => {
          const o = (a ?? {}) as Record<string, unknown>
          const point = str(o.point)
          return point ? { point, basis: str(o.basis) } : null
        })
        .filter((x): x is Application => x !== null)
    : []

  // 기도 — 문자열 배열(빈 항목 제거).
  const prayerPoints = Array.isArray(parsed.prayer_points)
    ? parsed.prayer_points.map((x) => String(x ?? '').trim()).filter(Boolean)
    : []

  const nowIso = new Date().toISOString()
  const row = {
    user_id: USER_ID,
    qt_date: parsed.qt_date,
    passage,
    key_verse: keyVerse,
    commentary,
    meditation,
    application,
    prayer_points: prayerPoints,
    model: 'claude-code',
    created_at: nowIso,
  }
  const { error } = await sb.from('daily_qt').upsert(row, { onConflict: 'user_id,qt_date' })
  if (error) {
    console.error(`[qt-push] 저장 실패: ${error.message}`)
    process.exit(1)
  }

  // 영구 아카이브 — JSONL 누적(gitignore).
  appendArchiveJsonl('_qt', 'daily_qt.jsonl', { ...row, generated_at: nowIso })

  console.log(
    `[qt-push] 저장 ✓ ${parsed.qt_date} · ${passage.book} ${passage.range} · 핵심절 ${keyVerse.ref || '없음'} · 적용 ${application.length} · 기도 ${prayerPoints.length} (user_id=${USER_ID.slice(0, 8)}…)`,
  )
}

main().catch((e) => {
  console.error('[qt-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
