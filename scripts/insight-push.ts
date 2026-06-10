// MFH-INSIGHT-PUSH-V1
// Claude Code 가 생성한 ===MFH-INSIGHT=== 양식 텍스트를 받아 insights 테이블에 upsert + repo 아카이브.
// upsert 는 content·period·created_at·model 갱신. 내용이 실제 바뀐 도메인은 rating·feedback_note 초기화(옛 평가가 새 내용에 따라붙지 않도록), in_letter 는 보존.
//   → insights 는 (user_id,domain) unique(patch81b). onConflict 시 payload 에 없는 컬럼은 그대로 유지된다.
// 사용:  npx tsx scripts/insight-push.ts insights-archive/_result.md
//        cat result.md | npx tsx scripts/insight-push.ts
// ⚠ repo 루트에서 실행(.env.local·insights-archive 경로가 process.cwd() 기준).
// user_id = .env.local 의 MFH_USER_ID(저장 귀속 = 우진 1명). 분석 입력은 부부 공동이나 저장은 1명에게 귀속.
import { readFileSync } from 'fs'
import { parseInsightBundle } from '@/lib/insightImport'
import { isValidDomain } from '@/lib/insightExport'
import { loadEnv, createServiceClient, requireUserId, appendArchiveJsonl } from './_shared'

async function main() {
  const env = loadEnv()
  const sb = createServiceClient(env)
  const USER_ID = requireUserId(env)

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

  const nowIso = new Date().toISOString()
  const results: string[] = []
  let ok = 0

  // 기존 도메인별 content — 내용이 실제 바뀐 도메인만 별점·메모를 초기화하기 위한 비교 기준(옵션 A).
  const { data: existingRows } = await sb
    .from('insights')
    .select('domain,content')
    .eq('user_id', USER_ID)
  const prevContent = new Map<string, string>(
    (existingRows ?? []).map((r) => [r.domain as string, r.content as string]),
  )

  for (const p of parsed) {
    if (!isValidDomain(p.domain)) {
      results.push(`· skip (알 수 없는 도메인: ${p.domain})`)
      continue
    }
    // 내용이 실제로 바뀐 도메인은 rating·feedback_note 초기화(옛 평가가 새 내용에 따라붙지 않도록). in_letter 는 보존.
    // 내용이 동일하면 두 필드를 payload 에서 제외 → upsert onConflict 로 기존 값 유지.
    const contentChanged = prevContent.get(p.domain) !== p.content
    const row = {
      user_id: USER_ID,
      domain: p.domain,
      content: p.content,
      period_start: p.periodStart,
      period_end: p.periodEnd,
      model: 'claude-code',
      created_at: nowIso, // updated_at 컬럼이 없어 '최신'은 created_at 기준 → 명시 갱신.
      ...(contentChanged ? { rating: null, feedback_note: null } : {}),
    }
    const { error } = await sb.from('insights').upsert(row, { onConflict: 'user_id,domain' })
    if (error) {
      results.push(`✗ ${p.domain}: ${error.message}`)
      continue
    }
    // 영구 아카이브 — 도메인별 JSONL 누적(코드 참고용, 개인 사역내용이라 gitignore).
    appendArchiveJsonl('', `${p.domain}.jsonl`, {
      domain: p.domain,
      content: p.content,
      period_start: p.periodStart,
      period_end: p.periodEnd,
      model: 'claude-code',
      generated_at: nowIso,
    })
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
