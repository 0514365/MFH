// MFH-INSIGHT-PULL-V2
// Supabase(service role)에서 부부 공동 데이터를 읽어, Claude Code 가 분석할 "작업지시서"(Markdown)를 stdout 출력.
// V2: 사진 캡션(일지 + 할 일·프로젝트 첨부 이미지, PDF 제외)을 "사진 기록(캡션)" 섹션으로 추가 — 텍스트 기반 인사이트에 시각 맥락 보탬.
// 가드레일·도메인 관점·회수 양식은 lib(앱과 동일)에서 가져온다 → 중복 0.
// 흐름:  insight-pull(이 스크립트) → Claude Code 분석(구독·가드레일 내장) → insight-push(DB upsert + 아카이브)
// 사용:  npx tsx scripts/insight-pull.ts             (기본 90일, 6도메인)
//        npx tsx scripts/insight-pull.ts --days 30
// ⚠ repo 루트에서 실행(.env.local·insights-archive 경로가 process.cwd() 기준).
// 키는 .env.local 의 SUPABASE_SERVICE_ROLE_KEY(RLS 우회). 분석 입력은 부부 멤버 공동 데이터(user_id 필터 없음).
import {
  buildDataMarkdown,
  buildLetterDigest,
  periodStart,
  todayStr,
  type ExportData,
  type InsightDomain,
  type JournalRow,
  type ProjectRow,
  type TaskRow,
  type LetterDigestRow,
  type ScrapRow,
  type SupporterRow,
  supporterBlock,
  isValidDomain,
} from '@/lib/insightExport'
import { buildBundleInstruction, buildFewShot, type FewShotExample } from '@/lib/insightPrompt'
import { IMPORT_FORMAT_GUIDE } from '@/lib/insightImport'
import { isImageAttachment, taskAttachmentDate, projectAttachmentDate } from '@/lib/attachments'
import type { Attachment, JournalPhoto } from '@/lib/types'
import { loadEnv, createServiceClient } from './_shared'

// 기본 생성 도메인(7) — balance(순수집계·무료)·비서 제외. --domains 로 덮어쓸 수 있다.
const GEN_DOMAINS: InsightDomain[] = ['overall', 'journal', 'project', 'task', 'prayer', 'fruit', 'letter']

async function main() {
  const sb = createServiceClient(loadEnv())

  // 인자: --days N (7/30/90 중 하나, 기본 90).
  const daysIdx = process.argv.indexOf('--days')
  const days =
    daysIdx >= 0 && [7, 30, 90].includes(Number(process.argv[daysIdx + 1]))
      ? Number(process.argv[daysIdx + 1])
      : 90
  const pStart = periodStart(days)
  const pEnd = todayStr()

  // 인자: --domains a,b,c (기본 GEN_DOMAINS). 비서(/assistant-update)는 --domains project_assist,task_assist 로 호출.
  const domIdx = process.argv.indexOf('--domains')
  const domains: InsightDomain[] =
    domIdx >= 0 && process.argv[domIdx + 1]
      ? process.argv[domIdx + 1].split(',').map((s) => s.trim()).filter(isValidDomain)
      : GEN_DOMAINS
  if (!domains.length) {
    console.error('유효한 도메인이 없습니다. --domains 값을 확인하세요(예: project_assist,task_assist).')
    process.exit(1)
  }

  // 데이터 조회(부부 공동). overall 한 장에 journal+project+task 모두 담겨 각 렌즈가 골라 본다.
  const { data: journals, error: jErr } = await sb
    .from('journal_entries')
    .select('entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name,photos')
    .gte('entry_date', pStart)
    .lte('entry_date', pEnd)
    .order('entry_date', { ascending: true })
  const { data: projects, error: pErr } = await sb
    .from('projects')
    .select('title,description,status,importance,start_date,due_date,category,attachments,created_at')
    .order('due_date', { ascending: true })
  const { data: tasks, error: tErr } = await sb
    .from('tasks')
    .select('title,description,status,done,importance,due_date,due_time,category,attachments,completed_at,created_at')
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

  // 후원자 데이터 — supporter_care 도메인일 때만 조회(헌금·관계기록을 후원자별로 묶음). 기간 무관 전체.
  let supporters: SupporterRow[] = []
  if (domains.includes('supporter_care')) {
    const [{ data: sups }, { data: dons }, { data: slogs }] = await Promise.all([
      sb
        .from('supporters')
        .select(
          'id,name,birth_date,affiliation,role,region,is_recurring,recurring_amount,recurring_currency,prayer_points,notes,is_active,first_met_date',
        )
        .order('name', { ascending: true }),
      sb.from('supporter_donations').select('supporter_id,donation_date,amount_usd,donation_type'),
      sb.from('supporter_logs').select('supporter_id,log_date,log_type,title,body'),
    ])
    type D = {
      supporter_id: string
      donation_date: string | null
      amount_usd: number | null
      donation_type: string | null
    }
    type L = {
      supporter_id: string
      log_date: string | null
      log_type: string | null
      title: string | null
      body: string | null
    }
    type S = { id: string } & Omit<SupporterRow, 'donations' | 'logs'>
    const donBy = new Map<string, D[]>()
    for (const d of (dons ?? []) as D[]) {
      const arr = donBy.get(d.supporter_id) ?? []
      arr.push(d)
      donBy.set(d.supporter_id, arr)
    }
    const logBy = new Map<string, L[]>()
    for (const l of (slogs ?? []) as L[]) {
      const arr = logBy.get(l.supporter_id) ?? []
      arr.push(l)
      logBy.set(l.supporter_id, arr)
    }
    supporters = ((sups ?? []) as S[]).map((s) => {
      const { id, ...rest } = s
      return {
        ...rest,
        donations: (donBy.get(id) ?? []).map((d) => ({
          donation_date: d.donation_date,
          amount_usd: d.amount_usd,
          donation_type: d.donation_type,
        })),
        logs: (logBy.get(id) ?? []).map((l) => ({
          log_date: l.log_date,
          log_type: l.log_type,
          title: l.title,
          body: l.body,
        })),
      }
    })
  }

  // few-shot: rating>=4 과거 인사이트(앱 별점 피드백 → 톤·구성 개인화).
  const { data: liked } = await sb
    .from('insights')
    .select('domain,content,rating,feedback_note')
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(6)
  const fewShot = buildFewShot((liked ?? []) as FewShotExample[])

  // letter 재료 — letter 생성 시에만 조회(비서 등 다른 도메인엔 불필요). 최근 인사이트(피드백 신호) + 보관.
  let letterDigest = ''
  if (domains.includes('letter')) {
    const { data: digestRows } = await sb
      .from('insights')
      .select('domain,content,period_start,period_end,rating,feedback_note,in_letter')
      .neq('domain', 'letter')
      .order('in_letter', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false })
    const { data: scrapRows } = await sb
      .from('insight_scraps')
      .select('domain,content,rating,feedback_note')
      .order('scrapped_at', { ascending: false })
    letterDigest = buildLetterDigest(
      (digestRows ?? []) as LetterDigestRow[],
      (scrapRows ?? []) as ScrapRow[],
    )
  }

  // 사진 캡션 모음 — 일지 + 할 일·프로젝트 첨부 이미지(PDF 제외). 같은 기간의 시각 기록 맥락.
  type JPhotoRow = { entry_date: string | null; category: string | null; photos: JournalPhoto[] | null }
  type AttRow = {
    title: string | null
    attachments: Attachment[] | null
    due_date?: string | null
    completed_at?: string | null
    start_date?: string | null
    created_at?: string | null
  }
  const captionLines: string[] = []
  for (const j of (journals ?? []) as unknown as JPhotoRow[]) {
    for (const ph of Array.isArray(j.photos) ? j.photos : []) {
      const cap = (ph.caption ?? ph.ai_caption)?.trim()
      if (cap) captionLines.push(`- (일지 ${j.entry_date ?? '?'}${j.category ? ` · ${j.category}` : ''}) ${cap}`)
    }
  }
  const addAttCaptions = (rows: AttRow[], dateFn: (r: AttRow) => string | null, label: string) => {
    for (const r of rows) {
      const d = dateFn(r)
      if (!d || d < pStart || d > pEnd) continue
      for (const a of r.attachments ?? []) {
        if (!isImageAttachment(a)) continue
        const cap = (a.caption ?? a.ai_caption)?.trim()
        if (cap) captionLines.push(`- (${label}${r.title ? ` · ${r.title}` : ''}) ${cap}`)
      }
    }
  }
  addAttCaptions((tasks ?? []) as unknown as AttRow[], taskAttachmentDate, '할 일 첨부')
  addAttCaptions((projects ?? []) as unknown as AttRow[], projectAttachmentDate, '프로젝트 첨부')
  const captionBlock = captionLines.length
    ? [
        '═══════════════════════ 사진 기록(캡션) ═══════════════════════',
        '아래는 같은 기간 사진에 달린 캡션입니다(인물·개인정보 제외). 활동의 분위기·현장 맥락 참고용입니다.',
        ...captionLines,
      ].join('\n')
    : ''

  // 후원자 섹션 — supporter_care 도메인일 때만. buildDataMarkdown 밖에서 별도 섹션으로 보탠다(captionBlock 패턴).
  const supporterSection =
    domains.includes('supporter_care') && supporters.length
      ? [
          '═══════════════════════ 후원자 데이터 ═══════════════════════',
          supporterBlock(supporters),
        ].join('\n')
      : ''

  // 작업지시서 = 가드레일·도메인 관점·회수양식(lib) + few-shot + 분석 데이터 + 사진 캡션 + 편지 재료 + 양식 가이드.
  const out = [
    buildBundleInstruction(domains),
    fewShot,
    '',
    `[분석 기간] 각 ===MFH-INSIGHT=== 블록의 PERIOD 는 ${pStart} ~ ${pEnd} 로 표기해 주세요.`,
    '',
    '═══════════════════════ 분석 데이터 ═══════════════════════',
    buildDataMarkdown(data),
    '',
    captionBlock,
    '',
    supporterSection,
    '',
    letterDigest,
    '',
    IMPORT_FORMAT_GUIDE,
  ].join('\n')

  process.stdout.write(out + '\n')
  console.error(
    `[insight-pull] ${pStart}~${pEnd} · 도메인 [${domains.join(', ')}] · 일지 ${journals?.length ?? 0} · 프로젝트 ${projects?.length ?? 0} · 할일 ${tasks?.length ?? 0} · 사진캡션 ${captionLines.length} · few-shot ${liked?.length ?? 0} → stdout`,
  )
}

main().catch((e) => {
  console.error('[insight-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
