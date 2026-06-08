// MFH-FETCH-LETTER-MATERIALS-V5
// 그달(또는 기간) 일지(다중사진)+인사이트를 Supabase에서 직접 받아 letter-templates/issues/<발행호>/ 에 저장.
// V5 변경: 사진 줄에 저장 캡션(수동 caption ?? AI ai_caption) 포함 → 우진이 손으로 단 캡션이 편지 재료에 반영.
// V4 변경: 기간 범위 수집 — 시작월~종료월의 일지·인사이트를 한 호로 묶음. 출력 폴더 = 종료월(발행호).
//          (지난달 활동을 이번 호에 담는 실운영 패턴 대응. 단일월 인자는 기존과 동일하게 동작.)
// V3: 인사이트 피드백 4신호 — ★별점(rating)·[메모](feedback_note)·[편지에담기](in_letter)·[보관](insight_scraps).
//     앱 letter 루틴 lib/insightExport.ts buildLetterDigest 와 동일 형식. (V2: 다중사진·in_letter·중보연계)
// 사용:  node scripts/fetch-letter-materials.mjs 2026-06            (단일월 추출)
//        node scripts/fetch-letter-materials.mjs 2026-05 2026-06    (기간 추출 → 06호 폴더)
//        node scripts/fetch-letter-materials.mjs --list             (월별 데이터 분포)
// 키는 .env.local 에서 읽음(SUPABASE_SERVICE_ROLE_KEY = RLS 우회). 코드에 키를 담지 않는다.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'

// .env.local 파싱(따옴표 제거).
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(URL_, KEY, { auth: { persistSession: false } })

// 인사이트 도메인 한글 라벨(lib/insightExport.ts DOMAIN_LABEL 과 일치).
const DOMAIN_LABEL = {
  journal: '일지 인사이트',
  project: '프로젝트 인사이트',
  task: '할 일 인사이트',
  overall: '종합 인사이트',
  prayer: '기도제목',
  balance: '사역·가정 균형',
  fruit: '간증·열매',
  letter: '월간 기도편지',
}

const dash = (s) => (s && String(s).trim() ? String(s).trim() : '—')

// 일지의 사진 목록(다중 우선, 레거시 fallback). 각 항목 { path, caption }.
// caption = 수동(caption) 우선 → AI(ai_caption). 레거시 단일은 캡션 없음.
function photoItems(r) {
  if (Array.isArray(r.photos) && r.photos.length) {
    return r.photos
      .filter((p) => p && p.path)
      .map((p) => ({ path: p.path, caption: (p.caption ?? p.ai_caption) || null }))
  }
  return r.photo_path ? [{ path: r.photo_path, caption: null }] : []
}

const arg = process.argv[2]

// ── 분포 모드 ──
if (!arg || arg === '--list') {
  const { data, error } = await sb.from('journal_entries').select('entry_date,photo_path,photos')
  if (error) {
    console.error('조회 오류:', error.message)
    process.exit(1)
  }
  const m = {}
  for (const r of data) {
    const k = (r.entry_date || '').slice(0, 7)
    if (!k) continue
    m[k] = m[k] || { n: 0, p: 0 }
    m[k].n++
    m[k].p += photoItems(r).length
  }
  console.log(`월별 일지(사진 수) — 총 ${data.length}건`)
  for (const k of Object.keys(m).sort()) console.log(`  ${k} : ${m[k].n}건 (사진 ${m[k].p})`)
  process.exit(0)
}

// ── 추출 모드 ── (단일월: arg / 기간: arg arg2 → 출력 폴더는 종료월=발행호)
const startMonth = arg
const endMonth = process.argv[3] || arg
if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) {
  console.error('월 형식 오류. 예: 2026-06  또는  2026-05 2026-06')
  process.exit(1)
}
if (endMonth < startMonth) {
  console.error('종료월이 시작월보다 빠릅니다. 예: 2026-05 2026-06')
  process.exit(1)
}
const month = endMonth // 출력 폴더 = 발행호(종료월)
const [ey, emo] = endMonth.split('-').map(Number)
const start = `${startMonth}-01`
const end = `${endMonth}-${String(new Date(ey, emo, 0).getDate()).padStart(2, '0')}`

const { data: rows, error } = await sb
  .from('journal_entries')
  .select(
    'entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name,photos,photo_path,photo_taken_at,intercession_id',
  )
  .gte('entry_date', start)
  .lte('entry_date', end)
  .order('entry_date', { ascending: true })
if (error) {
  console.error('조회 오류:', error.message)
  process.exit(1)
}

const outDir = new URL(`../letter-templates/issues/${month}/`, import.meta.url)
mkdirSync(outDir, { recursive: true })
mkdirSync(new URL('photos/', outDir), { recursive: true })

// 중보기도 연계: 일지에 연결된 intercession 메시지 모으기(있을 때만).
const interIds = [...new Set(rows.map((r) => r.intercession_id).filter(Boolean))]
const interMap = {}
if (interIds.length) {
  const { data: inter } = await sb
    .from('intercessions')
    .select('id,visitor_name,message')
    .in('id', interIds)
  for (const it of inter ?? []) interMap[it.id] = it
}

const rangeLabel = startMonth === endMonth ? `${month}` : `${startMonth} ~ ${endMonth} (→ ${month}호)`
let md = `# MFH 편지 재료 — ${rangeLabel}\n기간: ${start} ~ ${end} · 일지 ${rows.length}건\n\n`
let photoCount = 0

for (const r of rows) {
  md += `## ${dash(r.entry_date)} · ${dash(r.category)}${r.prayer_candidate ? ' · [기도제목후보]' : ''}\n`
  if (r.headline) md += `- 머리말: ${r.headline.trim()}\n`
  if (r.place_name) md += `- 장소: ${r.place_name.trim()}\n`
  if (r.today) md += `- 오늘 있었던 일: ${r.today.trim()}\n`
  if (r.thanks) md += `- 감사·응답: ${r.thanks.trim()}\n`
  if (r.meditation) md += `- 묵상·깨달음: ${r.meditation.trim()}\n`
  if (r.prayer) md += `- 기도제목: ${r.prayer.trim()}\n`
  // 중보기도 연계(방문자 기도부탁에 응답해 쓴 일지).
  if (r.intercession_id && interMap[r.intercession_id]) {
    const it = interMap[r.intercession_id]
    md += `- [중보기도 응답] ${dash(it.visitor_name)}: ${dash(it.message)}\n`
  }
  // 사진(다중) 다운로드 + 저장 캡션(수동 우선) 표기.
  for (const it of photoItems(r)) {
    const p = it.path
    const ext = (p.split('.').pop() || 'jpg').toLowerCase()
    const fname = `${r.entry_date}-${String(++photoCount).padStart(2, '0')}.${ext}`
    const { data: blob, error: dlErr } = await sb.storage.from('journal-photos').download(p)
    if (!dlErr && blob) {
      const buf = Buffer.from(await blob.arrayBuffer())
      writeFileSync(new URL(`photos/${fname}`, outDir), buf)
      const cap = it.caption ? ` — 캡션: ${String(it.caption).trim()}` : ''
      md += `- 사진: photos/${fname}${r.category ? ` (${r.category})` : ''}${cap}\n`
    }
  }
  md += '\n'
}

// ── 인사이트 수집 — 피드백 신호(★별점·[메모]·[편지에담기]) 우선 ──
// in_letter=true 전부 + rating>=4 전부(월 무관) + 대상 월 생성분.
// letter 도메인(앱이 만든 편지 방향 추천)도 포함 — strategist 출발점이므로 제외하지 않는다.
const monthEnd = `${end}T23:59:59`
let insCount = 0
const { data: insights, error: insErr } = await sb
  .from('insights')
  .select('domain,content,period_start,period_end,in_letter,rating,feedback_note,created_at')
  .or(`and(created_at.gte.${start},created_at.lte.${monthEnd}),in_letter.eq.true,rating.gte.4`)
  .order('in_letter', { ascending: false })
  .order('rating', { ascending: false, nullsFirst: false })
  .order('created_at', { ascending: false })

md += '## 편지 재료 — 인사이트 + 내 피드백 신호\n'
md += '(★N=별점 / [편지에담기]=편지 재료로 고른 것 / [메모]=내가 남긴 메모 / [보관]=따로 보관한 것. 우선순위 높은 신호를 먼저 반영하세요.)\n'
if (insErr) {
  md += `\n(인사이트 조회 오류: ${insErr.message})\n\n`
} else {
  const valid = (insights ?? []).filter((it) => it.content && it.content.trim())
  insCount = valid.length
  if (valid.length) {
    for (const it of valid) {
      const label = DOMAIN_LABEL[it.domain] || it.domain
      const stars = it.rating ? ` ★${it.rating}` : ''
      const pick = it.in_letter ? ' [편지에담기]' : ''
      const period =
        it.period_start || it.period_end ? ` (${it.period_start ?? '?'} ~ ${it.period_end ?? '?'})` : ''
      const note = it.feedback_note?.trim() ? `\n  [메모] ${it.feedback_note.trim()}` : ''
      md += `\n### ${label}${stars}${pick}${period}\n${it.content.trim()}${note}\n`
    }
  } else {
    md += '\n(대상 월 생성·편지적용·별점 인사이트 없음)\n'
  }
  md += '\n'
}

// ── 따로 보관한 인사이트(insight_scraps) — 시점 무관 "내가 모아둔 것" ──
let scrapCount = 0
const { data: scraps, error: scrapErr } = await sb
  .from('insight_scraps')
  .select('domain,content,rating,feedback_note')
  .order('scrapped_at', { ascending: false })
if (!scrapErr) {
  const validScraps = (scraps ?? []).filter((s) => s.content && s.content.trim())
  scrapCount = validScraps.length
  if (validScraps.length) {
    md += `## 따로 보관한 인사이트 (${validScraps.length}건)\n`
    for (const s of validScraps) {
      const label = DOMAIN_LABEL[s.domain] || s.domain
      const stars = s.rating ? ` ★${s.rating}` : ''
      const note = s.feedback_note?.trim() ? `\n  [메모] ${s.feedback_note.trim()}` : ''
      md += `\n### [보관] ${label}${stars}\n${s.content.trim()}${note}\n`
    }
    md += '\n'
  }
}

writeFileSync(new URL('materials.md', outDir), md)
const interCount = Object.keys(interMap).length
const doneLabel = startMonth === endMonth ? month : `${startMonth}~${endMonth} → ${month}호`
console.log(
  `완료: ${doneLabel} · 일지 ${rows.length}건 · 사진 ${photoCount}장 · 인사이트 ${insCount}건${scrapCount ? ` · 보관 ${scrapCount}건` : ''}${interCount ? ` · 중보연계 ${interCount}건` : ''} → letter-templates/issues/${month}/ (materials.md + photos/)`,
)
