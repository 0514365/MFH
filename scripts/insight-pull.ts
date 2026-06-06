// MFH-INSIGHT-PULL-V1
// Supabase(service role)에서 부부 공동 데이터를 읽어, Claude Code 가 분석할 "작업지시서"(Markdown)를 stdout 출력.
// 가드레일·도메인 관점·회수 양식은 lib(앱과 동일)에서 가져온다 → 중복 0.
// 흐름:  insight-pull(이 스크립트) → Claude Code 분석(구독·가드레일 내장) → insight-push(DB upsert + 아카이브)
// 사용:  npx tsx scripts/insight-pull.ts             (기본 90일, 6도메인)
//        npx tsx scripts/insight-pull.ts --days 30
// ⚠ repo 루트에서 실행(.env.local·insights-archive 경로가 process.cwd() 기준).
// 키는 .env.local 의 SUPABASE_SERVICE_ROLE_KEY(RLS 우회). 분석 입력은 부부 멤버 공동 데이터(user_id 필터 없음).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildDataMarkdown,
  periodStart,
  todayStr,
  type ExportData,
  type InsightDomain,
  type JournalRow,
  type ProjectRow,
  type TaskRow,
} from '@/lib/insightExport'
import { buildBundleInstruction, buildFewShot, type FewShotExample } from '@/lib/insightPrompt'
import { IMPORT_FORMAT_GUIDE } from '@/lib/insightImport'

// 생성 도메인 — letter(선교편지 팀)·balance(순수집계·무료) 제외.
const GEN_DOMAINS: InsightDomain[] = ['overall', 'journal', 'project', 'task', 'prayer', 'fruit']

// .env.local 파싱(따옴표 제거). fetch-letter-materials.mjs 와 동일 규칙.
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
  if (!URL_ || !KEY) {
    console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const sb = createClient(URL_, KEY, { auth: { persistSession: false } })

  // 인자: --days N (7/30/90 중 하나, 기본 90).
  const daysIdx = process.argv.indexOf('--days')
  const days =
    daysIdx >= 0 && [7, 30, 90].includes(Number(process.argv[daysIdx + 1]))
      ? Number(process.argv[daysIdx + 1])
      : 90
  const pStart = periodStart(days)
  const pEnd = todayStr()

  // 데이터 조회(부부 공동). overall 한 장에 journal+project+task 모두 담겨 각 렌즈가 골라 본다.
  const { data: journals, error: jErr } = await sb
    .from('journal_entries')
    .select('entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name')
    .gte('entry_date', pStart)
    .lte('entry_date', pEnd)
    .order('entry_date', { ascending: true })
  const { data: projects, error: pErr } = await sb
    .from('projects')
    .select('title,description,status,importance,start_date,due_date,category')
    .order('due_date', { ascending: true })
  const { data: tasks, error: tErr } = await sb
    .from('tasks')
    .select('title,description,status,done,importance,due_date,due_time,category')
    .order('due_date', { ascending: true })

  if (jErr || pErr || tErr) {
    console.error('조회 오류:', (jErr ?? pErr ?? tErr)?.message)
    process.exit(1)
  }

  const data: ExportData = {
    domain: 'overall',
    periodDays: days,
    periodStart: pStart,
    periodEnd: pEnd,
    journals: (journals ?? []) as JournalRow[],
    projects: (projects ?? []) as ProjectRow[],
    tasks: (tasks ?? []) as TaskRow[],
  }

  // few-shot: rating>=4 과거 인사이트(앱 별점 피드백 → 톤·구성 개인화).
  const { data: liked } = await sb
    .from('insights')
    .select('domain,content,rating,feedback_note')
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(6)
  const fewShot = buildFewShot((liked ?? []) as FewShotExample[])

  // 작업지시서 = 가드레일·도메인 관점·회수양식(lib) + few-shot + 분석 데이터 + 양식 가이드.
  const out = [
    buildBundleInstruction(GEN_DOMAINS),
    fewShot,
    '',
    `[분석 기간] 각 ===MFH-INSIGHT=== 블록의 PERIOD 는 ${pStart} ~ ${pEnd} 로 표기해 주세요.`,
    '',
    '═══════════════════════ 분석 데이터 ═══════════════════════',
    buildDataMarkdown(data),
    '',
    IMPORT_FORMAT_GUIDE,
  ].join('\n')

  process.stdout.write(out + '\n')
  console.error(
    `[insight-pull] ${pStart}~${pEnd} · 일지 ${journals?.length ?? 0} · 프로젝트 ${projects?.length ?? 0} · 할일 ${tasks?.length ?? 0} · few-shot ${liked?.length ?? 0} → stdout(작업지시서)`,
  )
}

main().catch((e) => {
  console.error('[insight-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
