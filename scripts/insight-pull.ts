// MFH-INSIGHT-PULL-V3
// Supabase(service role)에서 부부 공동 데이터를 읽어, Claude Code 가 분석할 "작업지시서"(Markdown)를 stdout 출력.
// V3: letter 렌즈를 "직전 호 기준"으로 재정의 — letters 최신 행(호수·제목·summary·period_end)을 기준점으로,
//     그 종료일 다음날~오늘의 일지·할 일·프로젝트·QT 묵상(daily_qt)·사진 캡션·온두라스 브리핑(honduras_news)을
//     「직전 호 이후 기록」 섹션으로 따로 싣는다(다른 6도메인의 90일 창과 별개). period_end 컬럼이 없으면 year_month 다음달 1일로 폴백.
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

const JOURNAL_COLS = 'entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name,photos'

// ── letter 기준점 유틸 ─────────────────────────────────────────
type LatestLetter = {
  number: string | null
  title: string | null
  year_month: string | null
  summary: string | null
  period_end: string | null
}

// YYYY-MM-DD 다음날.
function nextDay(d: string): string {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}
// 'YYYY-MM' 의 다음달 1일 (period_end 미입력 시 폴백).
function nextMonthFirst(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const t = new Date(Date.UTC(y, m, 1)) // m 은 0-based 라 그대로 넣으면 다음달
  return t.toISOString().slice(0, 10)
}
// 직전 호 번호('2608') → 다음 호('2609', 12월이면 다음해 01). 형식이 다르면 year_month 로 계산.
function nextIssueNumber(number: string | null, ym: string | null, fallbackEnd: string): string {
  if (number && /^\d{4}$/.test(number)) {
    const yy = Number(number.slice(0, 2))
    const mm = Number(number.slice(2, 4))
    return mm >= 12 ? `${String(yy + 1).padStart(2, '0')}01` : `${String(yy).padStart(2, '0')}${String(mm + 1).padStart(2, '0')}`
  }
  const base = ym && /^\d{4}-\d{2}$/.test(ym) ? nextMonthFirst(ym) : fallbackEnd
  return `${base.slice(2, 4)}${base.slice(5, 7)}`
}
function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1)
}
function clip(s: string | null | undefined, n: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

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
    .select(JOURNAL_COLS)
    // 비밀글은 공유 산출물(인사이트)에서 제외 — 타계정 유출 방지(patch102). 비공개는 포함(편지·페북만 제외).
    .eq('is_secret', false)
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
  // 기간(from~to) 안의 캡션 줄 모으기 — 90일 창과 letter 창에서 각각 쓴다.
  const collectCaptions = (jRows: JPhotoRow[], from: string, to: string): string[] => {
    const lines: string[] = []
    for (const j of jRows) {
      if (!j.entry_date || j.entry_date < from || j.entry_date > to) continue
      for (const ph of Array.isArray(j.photos) ? j.photos : []) {
        const cap = (ph.caption ?? ph.ai_caption)?.trim()
        if (cap) lines.push(`- (일지 ${j.entry_date}${j.category ? ` · ${j.category}` : ''}) ${cap}`)
      }
    }
    const addAtt = (rows: AttRow[], dateFn: (r: AttRow) => string | null, label: string) => {
      for (const r of rows) {
        const d = dateFn(r)
        if (!d || d < from || d > to) continue
        for (const a of r.attachments ?? []) {
          if (!isImageAttachment(a)) continue
          const cap = (a.caption ?? a.ai_caption)?.trim()
          if (cap) lines.push(`- (${label} ${d}${r.title ? ` · ${r.title}` : ''}) ${cap}`)
        }
      }
    }
    addAtt((tasks ?? []) as unknown as AttRow[], taskAttachmentDate, '할 일 첨부')
    addAtt((projects ?? []) as unknown as AttRow[], projectAttachmentDate, '프로젝트 첨부')
    return lines
  }
  const captionLines = collectCaptions((journals ?? []) as unknown as JPhotoRow[], pStart, pEnd)
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

  // ── letter 기준점 — 직전 호 + 그 이후 기록 (letter 도메인일 때만) ──────────────
  // 다른 6도메인은 90일 창을 보지만, 편지 방향은 "직전 호 자료 기간 종료일 다음날 ~ 오늘" 만 본다.
  let letterSection = ''
  let letterSince = ''
  let letterStat = ''
  if (domains.includes('letter')) {
    // 최신 호 조회. period_end 컬럼(supabase/letters-period-end.sql)이 아직 없으면 컬럼 없이 재조회.
    const baseCols = 'number,title,year_month,summary'
    let latest: LatestLetter | null = null
    let periodEndAvailable = true
    {
      const r1 = await sb
        .from('letters')
        .select(`${baseCols},period_end`)
        .order('year_month', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
      if (r1.error) {
        periodEndAvailable = false
        const r2 = await sb
          .from('letters')
          .select(baseCols)
          .order('year_month', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
        latest = r2.data?.[0] ? { ...(r2.data[0] as Omit<LatestLetter, 'period_end'>), period_end: null } : null
      } else {
        latest = (r1.data?.[0] as LatestLetter | undefined) ?? null
      }
    }
    const ym = latest?.year_month && /^\d{4}-\d{2}$/.test(latest.year_month) ? latest.year_month : null
    const since = latest?.period_end
      ? nextDay(latest.period_end)
      : ym
        ? nextMonthFirst(ym)
        : pStart
    const sinceSource = latest?.period_end
      ? 'letters.period_end 다음날'
      : ym
        ? `period_end 미입력 → year_month(${ym}) 다음달 1일로 폴백`
        : '직전 호 없음 → 90일 창 시작일'
    letterSince = since
    const nextNo = nextIssueNumber(latest?.number ?? null, ym, pEnd)

    // 직전 호 이후 일지 — 별도 조회(직전 호가 90일보다 오래됐을 수도 있음). 비밀글 제외 규칙 동일.
    const { data: sinceJournals } = await sb
      .from('journal_entries')
      .select(JOURNAL_COLS)
      .eq('is_secret', false)
      .gte('entry_date', since)
      .lte('entry_date', pEnd)
      .order('entry_date', { ascending: true })
    // 할 일·프로젝트 — 기간 안에 손댄 것(생성·완료·마감·시작일)만.
    type Touch = { created_at?: string | null; completed_at?: string | null; due_date?: string | null; start_date?: string | null }
    const touched = (r: Touch) =>
      [r.created_at?.slice(0, 10), r.completed_at?.slice(0, 10), r.due_date, r.start_date].some(
        (d) => !!d && d >= since && d <= pEnd,
      )
    const sinceTasks = ((tasks ?? []) as (TaskRow & Touch)[]).filter(touched)
    const sinceProjects = ((projects ?? []) as (ProjectRow & Touch)[]).filter(touched)

    // QT 묵상(daily_qt) — 본문·핵심절 요약·묵상 앞부분·기도. 편지의 묵상 줄기를 잡는 재료.
    type QtRow = {
      qt_date: string
      passage: { book?: string; range?: string } | null
      key_verse: { ref?: string; summary?: string } | null
      meditation: string | null
      prayer_points: string[] | null
    }
    const { data: qts } = await sb
      .from('daily_qt')
      .select('qt_date,passage,key_verse,meditation,prayer_points')
      .gte('qt_date', since)
      .lte('qt_date', pEnd)
      .order('qt_date', { ascending: true })
    const qtLines = ((qts ?? []) as QtRow[]).map((q) => {
      const ref = [q.passage?.book, q.passage?.range].filter(Boolean).join(' ')
      const kv = q.key_verse?.ref ? ` · 핵심절 ${q.key_verse.ref}${q.key_verse.summary ? `: ${clip(q.key_verse.summary, 80)}` : ''}` : ''
      const med = q.meditation ? ` · 묵상: ${clip(q.meditation, 220)}` : ''
      const pr = q.prayer_points?.length ? ` · 기도: ${q.prayer_points.map((p) => clip(p, 80)).join(' / ')}` : ''
      return `- ${q.qt_date} ${ref}${kv}${med}${pr}`
    })

    // 온두라스 동향 브리핑(honduras_news) — 강조 항목 + 경제·사회·문화 제목 + 함의. 정치 섹션은 싣지 않는다(거명 차단).
    type NewsItem = { tag?: string; title?: string; body?: string }
    type NewsRow = {
      news_date: string
      highlights: NewsItem[] | null
      sections: Record<string, NewsItem[] | undefined> | null
      insight: string | null
    }
    const { data: news } = await sb
      .from('honduras_news')
      .select('news_date,highlights,sections,insight')
      .gte('news_date', since)
      .lte('news_date', pEnd)
      .order('news_date', { ascending: true })
    const newsLines: string[] = []
    for (const n of (news ?? []) as NewsRow[]) {
      newsLines.push(`### ${n.news_date}`)
      for (const h of n.highlights ?? []) {
        if (h.title) newsLines.push(`- [${h.tag ?? '강조'}] ${h.title}${h.body ? ` — ${clip(h.body, 160)}` : ''}`)
      }
      for (const [key, label] of [
        ['economy', '경제'],
        ['society', '사회'],
        ['culture', '문화'],
      ] as const) {
        for (const it of n.sections?.[key] ?? []) if (it.title) newsLines.push(`- (${label}) ${it.title}`)
      }
      if (n.insight) newsLines.push(`- 함의: ${clip(n.insight, 300)}`)
    }

    const sinceCaptions = collectCaptions((sinceJournals ?? []) as unknown as JPhotoRow[], since, pEnd)
    const sinceData: ExportData = {
      domain: 'letter',
      periodDays: daysBetween(since, pEnd),
      periodStart: since,
      periodEnd: pEnd,
      journals: (sinceJournals ?? []) as JournalRow[],
      projects: sinceProjects as ProjectRow[],
      tasks: sinceTasks as TaskRow[],
    }

    letterSection = [
      '═══════════════════════ 편지 기준점 — 직전 호 ═══════════════════════',
      latest
        ? `- 직전 호: MFH #${latest.number ?? '?'} 「${latest.title ?? '(제목 없음)'}」 (${latest.year_month ?? '?'}) · 자료 기간 종료일: ${latest.period_end ?? '(미입력)'} → 분석 시작일 ${since} (${sinceSource})`
        : `- 직전 호 없음(letters 테이블 비어 있음) → 분석 시작일 ${since} (${sinceSource})`,
      `- 다음 호 번호: MFH #${nextNo}`,
      `- LENS: letter 블록의 PERIOD 는 ${since} ~ ${pEnd} 로 표기합니다(다른 렌즈의 90일 기간과 다름).`,
      '- 직전 호 요약(letters.summary — 이미 후원자에게 보고·종결된 내용. 재서술 금지. 이번 달에 응답·전환·새 국면으로 이어진 것만 "달라진 흐름"으로 반영):',
      latest?.summary ? latest.summary.trim().split('\n').map((l) => `  ${l}`).join('\n') : '  (summary 미입력)',
      periodEndAvailable ? '' : '- ⚠ letters.period_end 컬럼이 아직 없습니다 — supabase/letters-period-end.sql 실행 후 set-letter-summary.mjs --period 로 입력하면 폴백 없이 정확한 기준일을 씁니다.',
      '',
      `═══════════════════════ 직전 호 이후 기록 (${since} ~ ${pEnd}) ═══════════════════════`,
      '아래는 이번 호에 담을 새 재료입니다. 위의 90일 분석 데이터는 사역의 흐름·맥락으로 함께 보고, 직전 호 요약은 제외 기준으로 삼아 이번 달의 핵심을 골라 주세요.',
      buildDataMarkdown(sinceData),
      '',
      '── QT 묵상 (daily_qt) ──',
      qtLines.length ? qtLines.join('\n') : '(기간 내 QT 없음)',
      '',
      '── 사진 기록(캡션) — 직전 호 이후 ──',
      sinceCaptions.length ? sinceCaptions.join('\n') : '(기간 내 캡션 없음)',
      '',
      '── 온두라스 동향 브리핑 (honduras_news) — 직전 호 이후 · 이 안에 있는 사실만 편지에 씁니다 ──',
      newsLines.length ? newsLines.join('\n') : '(기간 내 브리핑 없음 — 온두라스 소식은 "브리핑 없음"으로 적고 지어내지 않습니다)',
    ]
      .filter((l) => l !== null)
      .join('\n')
    letterStat = ` · letter[${since}~${pEnd}: 일지 ${sinceJournals?.length ?? 0} · 할일 ${sinceTasks.length} · 프로젝트 ${sinceProjects.length} · QT ${qts?.length ?? 0} · 브리핑 ${news?.length ?? 0} · 캡션 ${sinceCaptions.length}]`
  }

  // 작업지시서 = 가드레일·도메인 관점·회수양식(lib) + few-shot + 분석 데이터 + 사진 캡션 + (letter 기준점·이후 기록) + 편지 재료 + 양식 가이드.
  const out = [
    buildBundleInstruction(domains),
    fewShot,
    '',
    `[분석 기간] 각 ===MFH-INSIGHT=== 블록의 PERIOD 는 ${pStart} ~ ${pEnd} 로 표기해 주세요.${letterSince ? ` (예외: LENS: letter 는 ${letterSince} ~ ${pEnd})` : ''}`,
    '',
    '═══════════════════════ 분석 데이터 ═══════════════════════',
    buildDataMarkdown(data),
    '',
    captionBlock,
    '',
    supporterSection,
    '',
    letterSection,
    '',
    letterDigest,
    '',
    IMPORT_FORMAT_GUIDE,
  ].join('\n')

  process.stdout.write(out + '\n')
  console.error(
    `[insight-pull] ${pStart}~${pEnd} · 도메인 [${domains.join(', ')}] · 일지 ${journals?.length ?? 0} · 프로젝트 ${projects?.length ?? 0} · 할일 ${tasks?.length ?? 0} · 사진캡션 ${captionLines.length} · few-shot ${liked?.length ?? 0}${letterStat} → stdout`,
  )
}

main().catch((e) => {
  console.error('[insight-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
