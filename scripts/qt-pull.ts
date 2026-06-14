// MFH-QT-PULL-V1
// 일일 QT "작업지시서"(Markdown)를 stdout 출력.
//   · 성서유니온 매일성경 Ajax 에서 그날(localToday) 본문 메타(책·장절·찬송)와 개역개정 본문을 직접 가져온다.
//     - BodyMatterDetail → Bible_name·Bible_chapter·New_song(찬송).  BodyBible(Ver_cd 생략=개역개정 1001) → 절 배열.
//     - ⚠ 성서유니온의 QT 제목·해설(Qt_sj/Qt_Brf/Qt_a2)은 저작권 → 가져오지 않는다(자체 묵상 작성).
//   · Supabase 에서 최근 일지·프로젝트·할일을 읽어 "사역 접목"용 재료로 함께 넘긴다.
//   · 흐름: qt-pull → Claude Code(묵상·적용·기도 작성, 가드레일 내장) → qt-push(daily_qt 저장)
// 사용:  npx tsx scripts/qt-pull.ts                 (오늘 = 로컬 타임존)
//        npx tsx scripts/qt-pull.ts --date 2026-06-13
//        npx tsx scripts/qt-pull.ts --days 30       (접목용 일지·사역 회수 기간, 기본 21)
// ⚠ repo 루트에서 실행(.env.local 경로가 process.cwd() 기준).
import { loadEnv, createServiceClient } from './_shared'
import { MISSION_BACKGROUND, PRAYER_GUARDRAILS, TONE_GUIDE } from '@/lib/insightPrompt'

const SUM_BASE = 'https://sum.su.or.kr:8888/Ajax/Bible'
const QT_TY = 'QT1' // 매일성경
const KRV_VER_CD = 1001 // 개역개정
const SOURCE_URL = 'https://sum.su.or.kr:8888/bible/today'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localToday(): string {
  return ymd(new Date())
}
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return ymd(d)
}
function clip(s: string | null | undefined, n: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

// 성서유니온 Ajax(POST JSON) 호출. 20s 타임아웃.
async function sumPost<T>(path: string, baseDe: string): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(`${SUM_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ qt_ty: QT_TY, Base_de: baseDe }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`${path} HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

type MatterDetail = { Bible_name?: string; Bible_chapter?: string; New_song?: number; Bible_song?: number }
type BibleVerse = { Chapter?: number; Verse?: number; Bible_Cn?: string; Ver_Cd?: number }
type JournalRow = {
  entry_date: string
  category: string | null
  headline: string | null
  today: string | null
  thanks: string | null
  meditation: string | null
  prayer: string | null
  prayer_candidate: boolean | null
  place_name: string | null
}
type ProjRow = { title: string; category: string | null; status: string | null; due_date: string | null }
type TaskRow = { title: string; category: string | null; due_date: string | null }

async function main() {
  // 인자
  const dateIdx = process.argv.indexOf('--date')
  const qtDate =
    dateIdx >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[dateIdx + 1] ?? '')
      ? process.argv[dateIdx + 1]
      : localToday()
  const daysIdx = process.argv.indexOf('--days')
  const days = daysIdx >= 0 && Number(process.argv[daysIdx + 1]) > 0 ? Math.floor(Number(process.argv[daysIdx + 1])) : 21

  const sb = createServiceClient(loadEnv())

  // 1) 본문 메타(책·장절·찬송) — QT 제목·해설은 저작권이라 무시.
  let book = '', bookEn = '', chapter = '', hymn = ''
  try {
    const md = await sumPost<MatterDetail>('BodyMatterDetail', qtDate)
    const name = (md.Bible_name ?? '').trim()
    const m = name.match(/^(.+?)\s*\((.+?)\)\s*$/)
    if (m) { book = m[1].trim(); bookEn = m[2].trim() } else { book = name }
    chapter = (md.Bible_chapter ?? '').replace(/\s+/g, ' ').trim()
    if (md.New_song && md.New_song > 0) hymn = `새찬송가 ${md.New_song}장`
    else if (md.Bible_song && md.Bible_song > 0) hymn = `통일찬송가 ${md.Bible_song}장`
  } catch (e) {
    console.error(`[qt-pull] 본문 메타 조회 실패(${qtDate}): ${(e as Error).message}`)
    process.exit(1)
  }

  // 2) 개역개정 본문 절 배열 — 핵심절 정확 인용·묵상용(저장은 핵심절 1개만).
  let passageText = ''
  try {
    const verses = await sumPost<BibleVerse[]>('BodyBible', qtDate)
    passageText = (Array.isArray(verses) ? verses : [])
      .filter((v) => !v.Ver_Cd || v.Ver_Cd === KRV_VER_CD)
      .map((v) => `${v.Chapter ?? ''}:${v.Verse ?? ''} ${(v.Bible_Cn ?? '').trim()}`)
      .join('\n')
  } catch (e) {
    console.error(`[qt-pull] 본문 조회 실패(${qtDate}): ${(e as Error).message}`)
    process.exit(1)
  }
  if (!book || !chapter || !passageText) {
    console.error(`[qt-pull] 본문이 비었습니다(${qtDate}). 성서유니온에 해당 날짜 매일성경이 없을 수 있습니다.`)
    process.exit(1)
  }

  // 3) 접목 재료 — 최근 일지·프로젝트·할일(부부 공동, RLS 우회 service role).
  const since = daysAgo(days)
  const { data: journals } = await sb
    .from('journal_entries')
    .select('entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name')
    .gte('entry_date', since)
    .order('entry_date', { ascending: false })
  const { data: projects } = await sb
    .from('projects')
    .select('title,category,status,due_date')
    .order('due_date', { ascending: true })
  const { data: tasks } = await sb
    .from('tasks')
    .select('title,category,due_date')
    .eq('done', false)
    .order('due_date', { ascending: true })
    .limit(10)

  const jBlock = ((journals ?? []) as JournalRow[]).slice(0, 30).map((j) => {
    const head = `(${j.entry_date}${j.category ? ' · ' + j.category : ''}) ${clip(j.headline, 40) || '(제목 없음)'}`
    const lines = [head]
    if (j.today) lines.push(`  오늘: ${clip(j.today, 100)}`)
    const tp: string[] = []
    if (j.thanks) tp.push(`감사: ${clip(j.thanks, 60)}`)
    if (j.prayer) tp.push(`기도: ${clip(j.prayer, 60)}${j.prayer_candidate ? ' [기도후보]' : ''}`)
    if (tp.length) lines.push('  ' + tp.join('  '))
    return lines.join('\n')
  }).join('\n')
  const pBlock = ((projects ?? []) as ProjRow[]).slice(0, 8)
    .map((p) => `- ${clip(p.title, 40)}${p.category ? ` (${p.category})` : ''}${p.status ? ` · ${p.status}` : ''}${p.due_date ? ` · 마감 ${p.due_date}` : ''}`)
    .join('\n')
  const tBlock = ((tasks ?? []) as TaskRow[])
    .map((t) => `- ${clip(t.title, 40)}${t.category ? ` (${t.category})` : ''}${t.due_date ? ` · 마감 ${t.due_date}` : ''}`)
    .join('\n')

  const guide = [
    `[MFH 일일 QT — 작업지시서]  날짜 ${qtDate}`,
    '',
    MISSION_BACKGROUND,
    '',
    '오늘 성서유니온 매일성경 본문을 묵상하고, 아래 [최근 일지·사역]과 접목해 우리 선교사 부부의 사역에 적용하는 개인화 QT 를 작성한다.',
    '',
    '═══════════════════════ 오늘의 본문 (성서유니온 매일성경) ═══════════════════════',
    `책: ${book}${bookEn ? ` (${bookEn})` : ''}`,
    `범위: ${chapter}`,
    hymn ? `찬송: ${hymn}` : '찬송: (없음)',
    '',
    '[개역개정 본문]',
    passageText,
    '',
    '═══════════════════════ 작성 지시 ═══════════════════════',
    '1) key_verse — 본문 중 가장 핵심이 되는 한 절을 고른다.',
    '   · ref: "책 장:절"(개역개정 기준, 예 "고린도전서 8:1").',
    '   · text: 그 절을 개역개정으로 정확히(위 [개역개정 본문]에서 그대로). 짧은 한 절만.',
    '   · summary: 그 절의 메시지를 한 줄로.',
    '2) meditation — 본문이 주는 메시지 2~3문장. ★반드시 하나님의 구속(救贖) 사역과 연결한다.',
    '3) application — 아래 [최근 일지·사역]에서 실제 연결고리를 찾아 1~2개.',
    '   · point: 우리 부부의 사역·삶에 적용할 한 줄.',
    '   · basis: 어떤 일지/프로젝트/할일과 연결되는지(근거). 억지로 만들지 말고 실제 기록에서.',
    '4) prayer_points — 오늘의 기도 1~2개(아래 기도 3원칙 준수).',
    '',
    '[신학 가드레일 — 반드시 준수]',
    '- 교리: 대한예수교장로회의 개혁주의 복음주의 신학을 따른다.',
    '- 항상 하나님의 구속(救贖) 사역과 연결하려 노력한다.',
    '- 성경 인용은 개역개정판을 정확히 사용하고 책·장·절을 함께 표기한다.',
    '- ⚠ 성서유니온의 QT 제목·해설을 베끼지 않는다(우리는 본문 메타만 받았다). 묵상·적용은 본문(성경 말씀)에서 자체적으로 쓴다.',
    '',
    PRAYER_GUARDRAILS,
    '',
    TONE_GUIDE,
    '',
    '[result.json 형식]',
    '{',
    `  "qt_date": "${qtDate}",`,
    `  "passage": { "book": "${book}", "book_en": "${bookEn}", "range": "${chapter}", "hymn": "${hymn}", "source_url": "${SOURCE_URL}" },`,
    '  "key_verse": { "ref": "책 장:절", "text": "개역개정 한 절 그대로", "summary": "한 줄 요약" },',
    '  "meditation": "본문 묵상 2~3문장(구속 사역과 연결).",',
    '  "application": [{ "point": "사역 적용 한 줄", "basis": "연결된 일지/사역 근거" }],',
    '  "prayer_points": ["기도 1", "기도 2"]',
    '}',
    '',
    '[작성 후] insights-archive/_qt/result.json 에 Write → `npx tsx scripts/qt-push.ts` 실행으로 DB 저장.',
    '',
    `═══════════════════════ 최근 일지·사역 (접목 재료, 최근 ${days}일) ═══════════════════════`,
    '[일지]',
    jBlock || '(최근 일지 없음)',
    '',
    '[프로젝트]',
    pBlock || '(프로젝트 없음)',
    '',
    '[할 일(미완료·임박)]',
    tBlock || '(할 일 없음)',
  ].join('\n')

  process.stdout.write(guide + '\n')
  console.error(
    `[qt-pull] ${qtDate} · ${book} ${chapter} · ${hymn || '찬송 없음'} · 일지 ${journals?.length ?? 0} · 프로젝트 ${projects?.length ?? 0} · 할일 ${tasks?.length ?? 0} → stdout`,
  )
}

main().catch((e) => {
  console.error('[qt-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
