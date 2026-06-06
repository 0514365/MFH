// MFH-INSIGHT-PUSH-V1
// Claude Code 가 생성한 ===MFH-INSIGHT=== 양식 텍스트를 받아 insights 테이블에 upsert + repo 아카이브.
// upsert 는 content·period·created_at·model 만 갱신, rating·feedback_note·in_letter 는 보존(핸드오프 3-2).
//   → insights 는 (user_id,domain) unique(patch81). onConflict 시 payload 에 없는 컬럼은 그대로 유지된다.
// 사용:  npx tsx scripts/insight-push.ts insights-archive/_result.md
//        cat result.md | npx tsx scripts/insight-push.ts
// ⚠ repo 루트에서 실행(.env.local·insights-archive 경로가 process.cwd() 기준).
// user_id = .env.local 의 MFH_USER_ID(저장 귀속 = 우진 1명). 분석 입력은 부부 공동이나 저장은 1명에게 귀속.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { parseInsightBundle } from '@/lib/insightImport'
import { isValidDomain } from '@/lib/insightExport'

// .env.local 파싱(따옴표 제거).
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

  // 입력: 파일 인자 우선, 없으면 stdin(fd 0).
  const fileArg = process.argv[2]
  let text = ''
  try {
    text = fileArg ? readFileSync(fileArg, 'utf8') : readFileSync(0, 'utf8')
  } catch (e) {
    console.error('입력을 읽지 못했습니다:', (e as Error).message)
    process.exit(1)
  }
  if (!text.trim()) {
    console.error('빈 입력입니다. ===MFH-INSIGHT=== 블록이 담긴 파일/텍스트를 넘겨 주세요.')
    process.exit(1)
  }

  const parsed = parseInsightBundle(text, 'overall')
  if (!parsed.length) {
    console.error('파싱된 인사이트가 없습니다. 회수 양식(===MFH-INSIGHT=== … ===END===)을 확인하세요.')
    process.exit(1)
  }

  // 아카이브 폴더 보장(gitignore 대상).
  const archiveDir = join(process.cwd(), 'insights-archive')
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true })

  const nowIso = new Date().toISOString()
  const results: string[] = []
  let ok = 0

  for (const p of parsed) {
    if (!isValidDomain(p.domain)) {
      results.push(`· skip (알 수 없는 도메인: ${p.domain})`)
      continue
    }
    // upsert payload — rating/feedback_note/in_letter 는 의도적으로 제외(보존).
    const row = {
      user_id: USER_ID,
      domain: p.domain,
      content: p.content,
      period_start: p.periodStart,
      period_end: p.periodEnd,
      model: 'claude-code',
      created_at: nowIso, // updated_at 컬럼이 없어 '최신'은 created_at 기준 → 명시 갱신.
    }
    const { error } = await sb.from('insights').upsert(row, { onConflict: 'user_id,domain' })
    if (error) {
      results.push(`✗ ${p.domain}: ${error.message}`)
      continue
    }
    // 영구 아카이브 — 도메인별 JSONL 누적(코드 참고용, 개인 사역내용이라 gitignore).
    const line = JSON.stringify({
      domain: p.domain,
      content: p.content,
      period_start: p.periodStart,
      period_end: p.periodEnd,
      model: 'claude-code',
      generated_at: nowIso,
    })
    appendFileSync(join(archiveDir, `${p.domain}.jsonl`), line + '\n')
    results.push(`✓ ${p.domain} (${p.content.length}자)`)
    ok++
  }

  console.log(`[insight-push] 저장 ${ok}/${parsed.length}건 (user_id=${USER_ID.slice(0, 8)}…)`)
  for (const r of results) console.log('  ' + r)
}

main().catch((e) => {
  console.error('[insight-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
