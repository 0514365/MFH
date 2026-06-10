// MFH-FB-PUSH-V1
// Claude Code 가 만든 result.json(주간 게시안)을 읽어 weekly_fb 테이블에 upsert + repo 아카이브.
//   · upsert onConflict (user_id, week_start) → 같은 주 재생성은 덮어쓰기(주차당 1행).
//   · 저장 귀속 user_id = .env.local 의 MFH_USER_ID(분석 입력은 부부 공동이나 저장은 1명 귀속).
// 사용:  npx tsx scripts/fb-push.ts                       (기본 insights-archive/_fb/result.json)
//        npx tsx scripts/fb-push.ts path/to/result.json
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

type Photo = { path: string; caption?: string | null }
type Post = { text: string; photos?: Photo[]; hashtags?: string[]; rationale?: string | null }
type Result = { week_start?: string; week_end?: string; posts?: Post[] }

async function main() {
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

  const fileArg = process.argv[2] || join(process.cwd(), 'insights-archive', '_fb', 'result.json')
  const parsed = readJsonFile<Result>(fileArg)

  if (!isDate(parsed.week_start) || !isDate(parsed.week_end)) {
    console.error('week_start / week_end 가 YYYY-MM-DD 형식이 아닙니다.')
    process.exit(1)
  }
  if (!Array.isArray(parsed.posts) || !parsed.posts.length) {
    console.error('posts 배열이 비었습니다. 게시안을 1개 이상 작성하세요.')
    process.exit(1)
  }

  // 정규화 — text 필수, photos 는 path 있는 것만, hashtags/문자열 정리.
  const posts = parsed.posts
    .map((p) => {
      const text = typeof p.text === 'string' ? p.text.trim() : ''
      if (!text) return null
      const photos = Array.isArray(p.photos)
        ? p.photos
            .filter((ph) => ph && typeof ph.path === 'string' && ph.path.trim())
            .map((ph) => ({ path: ph.path.trim(), caption: (ph.caption ?? '').toString().trim() || null }))
        : []
      const hashtags = Array.isArray(p.hashtags)
        ? p.hashtags.map((h) => String(h).trim()).filter(Boolean)
        : []
      const rationale = (p.rationale ?? '').toString().trim() || null
      return { text, photos, hashtags, rationale }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (!posts.length) {
    console.error('유효한 게시안이 없습니다(각 게시안에 text 가 필요합니다).')
    process.exit(1)
  }

  const nowIso = new Date().toISOString()
  const row = {
    user_id: USER_ID,
    week_start: parsed.week_start,
    week_end: parsed.week_end,
    posts,
    model: 'claude-code',
    created_at: nowIso, // 재생성 시 '최신'으로 끌어올림.
  }
  const { error } = await sb.from('weekly_fb').upsert(row, { onConflict: 'user_id,week_start' })
  if (error) {
    console.error(`[fb-push] 저장 실패: ${error.message}`)
    process.exit(1)
  }

  // 영구 아카이브 — JSONL 누적(개인 사역내용이라 gitignore).
  appendArchiveJsonl('_fb', 'weekly_fb.jsonl', { ...row, generated_at: nowIso })

  const photoTotal = posts.reduce((n, p) => n + p.photos.length, 0)
  console.log(
    `[fb-push] 저장 ✓ ${parsed.week_start}~${parsed.week_end} · 게시안 ${posts.length}개 · 추천사진 ${photoTotal}장 (user_id=${USER_ID.slice(0, 8)}…)`,
  )
}

main().catch((e) => {
  console.error('[fb-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
