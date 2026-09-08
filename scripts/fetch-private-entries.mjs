// MFH-FETCH-PRIVATE-ENTRIES-V1
// 편지 팀장용 보조 스크립트: 기간 내 비공개(is_private/is_secret) 일지를 텍스트+사진으로 추출.
// fetch-letter-materials.mjs 는 비공개를 제외하므로, 우진이 명시적으로 "비공개 포함" 지시했을 때만 사용.
// 사용: node scripts/fetch-private-entries.mjs 2026-07-01 2026-09-01 letter-templates/issues/2026-08
// 키는 .env.local 에서 읽음(SUPABASE_SERVICE_ROLE_KEY). 코드에 키를 담지 않는다.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'

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
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const [start, end, outDir] = process.argv.slice(2)
if (!start || !end || !outDir) {
  console.error('사용: node scripts/fetch-private-entries.mjs <시작일> <종료일> <출력폴더>')
  process.exit(1)
}
mkdirSync(`${outDir}/photos-extra`, { recursive: true })

const { data, error } = await sb
  .from('journal_entries')
  .select(
    'entry_date,category,headline,today,thanks,meditation,prayer,place_name,photos,photo_path,is_private,is_secret',
  )
  .or('is_private.eq.true,is_secret.eq.true')
  .gte('entry_date', start)
  .lte('entry_date', end)
  .order('entry_date', { ascending: true })
if (error) {
  console.error(error)
  process.exit(1)
}

let md = `# 비공개 일지 추출 — ${start} ~ ${end} (${data.length}건) · 우진 지시로 편지 재료에 포함(실명 비공개 원칙)\n`
let n = 0
for (const r of data) {
  md += `\n## ${r.entry_date} · ${r.category || '—'} · [비공개${r.is_secret ? '·secret' : ''}]${r.place_name ? ' · ' + r.place_name : ''}\n`
  md += `- 머리말: ${r.headline || '—'}\n- 오늘 있었던 일: ${r.today || '—'}\n`
  if (r.thanks) md += `- 감사: ${r.thanks}\n`
  if (r.meditation) md += `- 묵상: ${r.meditation}\n`
  if (r.prayer) md += `- 기도제목: ${r.prayer}\n`
  const ph =
    Array.isArray(r.photos) && r.photos.length
      ? r.photos.filter((p) => p && p.path).map((p) => ({ path: p.path, caption: p.caption ?? p.ai_caption }))
      : r.photo_path
        ? [{ path: r.photo_path, caption: null }]
        : []
  for (const p of ph) {
    const ext = (p.path.split('.').pop() || 'jpg').toLowerCase()
    const fname = `${r.entry_date}-priv-${String(++n).padStart(2, '0')}.${ext}`
    const { data: blob, error: dlErr } = await sb.storage.from('journal-photos').download(p.path)
    if (dlErr) {
      md += `- 사진 실패: ${p.path} (${dlErr.message})\n`
      continue
    }
    writeFileSync(`${outDir}/photos-extra/${fname}`, Buffer.from(await blob.arrayBuffer()))
    md += `- 사진: photos-extra/${fname} — 캡션: ${p.caption || '—'}\n`
  }
}
writeFileSync(`${outDir}/private-entries.md`, md)
console.log(md)
