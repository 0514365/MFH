// MFH-FETCH-LETTER-MATERIALS-V2
// 그달 일지(다중사진)+인사이트를 Supabase에서 직접 받아 letter-templates/issues/<month>/ 에 저장.
// V2 변경: photos jsonb 다중사진(최대 5장, 레거시 fallback) + insights 수집(편지적용 in_letter ★)
//          + 중보기도 연계(intercession_id → 방문자 메시지).
// 사용:  node scripts/fetch-letter-materials.mjs 2026-06     (그달 추출)
//        node scripts/fetch-letter-materials.mjs --list      (월별 데이터 분포)
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

// 일지의 사진 경로 목록(다중 우선, 레거시 fallback). resolveJournalPhotos 규칙 차용.
function photoPaths(r) {
  if (Array.isArray(r.photos) && r.photos.length) {
    return r.photos.map((p) => (p && p.path ? p.path : null)).filter(Boolean)
  }
  return r.photo_path ? [r.photo_path] : []
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
    m[k].p += photoPaths(r).length
  }
  console.log(`월별 일지(사진 수) — 총 ${data.length}건`)
  for (const k of Object.keys(m).sort()) console.log(`  ${k} : ${m[k].n}건 (사진 ${m[k].p})`)
  process.exit(0)
}

// ── 추출 모드 ──
const month = arg
if (!/^\d{4}-\d{2}$/.test(month)) {
  console.error('월 형식 오류. 예: 2026-06')
  process.exit(1)
}
const [y, mo] = month.split('-').map(Number)
const start = `${month}-01`
const end = `${month}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`

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

let md = `# MFH 편지 재료 — ${month}\n기간: ${start} ~ ${end} · 일지 ${rows.length}건\n\n`
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
  // 사진(다중) 다운로드.
  for (const p of photoPaths(r)) {
    const ext = (p.split('.').pop() || 'jpg').toLowerCase()
    const fname = `${r.entry_date}-${String(++photoCount).padStart(2, '0')}.${ext}`
    const { data: blob, error: dlErr } = await sb.storage.from('journal-photos').download(p)
    if (!dlErr && blob) {
      const buf = Buffer.from(await blob.arrayBuffer())
      writeFileSync(new URL(`photos/${fname}`, outDir), buf)
      md += `- 사진: photos/${fname}${r.category ? ` (${r.category})` : ''}\n`
    }
  }
  md += '\n'
}

// ── 인사이트 수집 (옵션 A: in_letter=true 전부 + 대상 월 생성분) ──
const monthEnd = `${end}T23:59:59`
const { data: insights, error: insErr } = await sb
  .from('insights')
  .select('domain,content,period_start,period_end,in_letter,created_at')
  .or(`and(created_at.gte.${start},created_at.lte.${monthEnd}),in_letter.eq.true`)
  .order('in_letter', { ascending: false })
  .order('created_at', { ascending: false })

if (insErr) {
  md += `## 인사이트\n(조회 오류: ${insErr.message})\n\n`
} else {
  const valid = (insights ?? []).filter((it) => it.content && it.content.trim())
  if (valid.length) {
    md += `## 인사이트 (${valid.length}건 · ★=편지적용)\n`
    for (const it of valid) {
      const label = DOMAIN_LABEL[it.domain] || it.domain
      const star = it.in_letter ? ' ★[편지적용]' : ''
      const period =
        it.period_start || it.period_end ? ` (${it.period_start ?? '?'} ~ ${it.period_end ?? '?'})` : ''
      md += `\n### ${label}${star}${period}\n${it.content.trim()}\n`
    }
    md += '\n'
  } else {
    md += `## 인사이트\n(대상 월 생성·편지적용 인사이트 없음)\n\n`
  }
}

writeFileSync(new URL('materials.md', outDir), md)
const interCount = Object.keys(interMap).length
const insCount = (insights ?? []).filter((it) => it.content && it.content.trim()).length
console.log(
  `완료: ${month} · 일지 ${rows.length}건 · 사진 ${photoCount}장 · 인사이트 ${insCount}건${interCount ? ` · 중보연계 ${interCount}건` : ''} → letter-templates/issues/${month}/ (materials.md + photos/)`,
)
