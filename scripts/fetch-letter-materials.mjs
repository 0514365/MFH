// MFH-FETCH-LETTER-MATERIALS-V1
// 그달 일지+사진을 Supabase에서 직접 받아 letter-templates/issues/<month>/ 에 저장.
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

const arg = process.argv[2]

// ── 분포 모드 ──
if (!arg || arg === '--list') {
  const { data, error } = await sb.from('journal_entries').select('entry_date,photo_path')
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
    if (r.photo_path) m[k].p++
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
    'entry_date,category,headline,today,thanks,meditation,prayer,prayer_candidate,place_name,photo_path,photo_taken_at',
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

let md = `# MFH 편지 재료 — ${month}\n기간: ${start} ~ ${end} · 일지 ${rows.length}건\n\n`
let photoCount = 0
const dash = (s) => (s && String(s).trim() ? String(s).trim() : '—')

for (const r of rows) {
  md += `## ${dash(r.entry_date)} · ${dash(r.category)}${r.prayer_candidate ? ' · [기도제목후보]' : ''}\n`
  if (r.headline) md += `- 머리말: ${r.headline.trim()}\n`
  if (r.place_name) md += `- 장소: ${r.place_name.trim()}\n`
  if (r.today) md += `- 오늘 있었던 일: ${r.today.trim()}\n`
  if (r.thanks) md += `- 감사·응답: ${r.thanks.trim()}\n`
  if (r.meditation) md += `- 묵상·깨달음: ${r.meditation.trim()}\n`
  if (r.prayer) md += `- 기도제목: ${r.prayer.trim()}\n`
  if (r.photo_path) {
    const ext = (r.photo_path.split('.').pop() || 'jpg').toLowerCase()
    const fname = `${r.entry_date}-${String(++photoCount).padStart(2, '0')}.${ext}`
    const { data: blob, error: dlErr } = await sb.storage.from('journal-photos').download(r.photo_path)
    if (!dlErr && blob) {
      const buf = Buffer.from(await blob.arrayBuffer())
      writeFileSync(new URL(`photos/${fname}`, outDir), buf)
      md += `- 사진: photos/${fname}${r.category ? ` (${r.category})` : ''}\n`
    }
  }
  md += '\n'
}

writeFileSync(new URL('materials.md', outDir), md)
console.log(
  `완료: ${month} · 일지 ${rows.length}건 · 사진 ${photoCount}장 → letter-templates/issues/${month}/ (materials.md + photos/)`,
)
