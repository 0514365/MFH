// MFH-BACKFILL-PHOTO-SIZES-V1
// 기존 일지 사진에 가로·세로 px(meta.w / meta.h)를 채운다 — 상세 콜라주(PhotoCollage V4)가 비율로 배치를 정하는 데 쓴다.
// 새 업로드는 앱이 직접 저장하므로, 이 스크립트는 그 이전 사진용이다. 사진 파일은 건드리지 않는다(photos jsonb 의 meta 만 갱신).
// 멱등 — 이미 w/h 가 있는 사진은 건너뛴다. 썸네일(회전 보정 완료)이 있으면 그것으로, 없으면 원본 + EXIF 회전으로 크기를 읽는다.
// 실행(repo 루트, .env.local 에 SUPABASE_SERVICE_ROLE_KEY 필요):
//   npx tsx scripts/backfill-photo-sizes.ts --month 2026-11          (해당 월만 실제 반영)
//   npx tsx scripts/backfill-photo-sizes.ts --month 2026-11 --dry    (미리보기 — 쓰기 없음)
//   npx tsx scripts/backfill-photo-sizes.ts                          (전체 일지)
import { loadEnv, createServiceClient } from './_shared'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { JournalPhoto } from '../lib/types'
import sharp from 'sharp'

const BUCKET = 'journal-photos'
const DRY = process.argv.includes('--dry')
const monthIdx = process.argv.indexOf('--month')
const MONTH = monthIdx >= 0 ? process.argv[monthIdx + 1] : null

function hasSize(p: JournalPhoto): boolean {
  const m = p.meta
  return typeof m?.w === 'number' && typeof m?.h === 'number' && m.w > 0 && m.h > 0
}

// 표시 기준 크기(EXIF 회전 반영). 실패 시 null.
async function readSize(sb: SupabaseClient, p: JournalPhoto): Promise<{ w: number; h: number } | null> {
  const path = p.thumb_path || p.path
  const { data, error } = await sb.storage.from(BUCKET).download(path)
  if (error || !data) {
    console.log(`  ✗ download 실패: ${path}${error ? ` (${error.message})` : ''}`)
    return null
  }
  try {
    const md = await sharp(Buffer.from(await data.arrayBuffer())).metadata()
    if (!md.width || !md.height) return null
    // orientation 5~8 은 90° 회전 — 가로·세로를 바꿔야 화면 표시 기준이 된다.
    const swap = (md.orientation ?? 1) >= 5
    return swap ? { w: md.height, h: md.width } : { w: md.width, h: md.height }
  } catch (e) {
    console.log(`  ✗ 크기 읽기 실패: ${path} (${(e as Error).message})`)
    return null
  }
}

type Row = { id: string; entry_date: string; headline: string | null; photos: JournalPhoto[] | null }

async function main() {
  if (MONTH && !/^\d{4}-\d{2}$/.test(MONTH)) {
    console.error('--month 는 YYYY-MM 형식이어야 합니다.')
    process.exit(1)
  }
  const env = loadEnv()
  const sb = createServiceClient(env)
  let q = sb.from('journal_entries').select('id,entry_date,headline,photos').order('entry_date')
  if (MONTH) {
    const [y, m] = MONTH.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    q = q.gte('entry_date', `${MONTH}-01`).lt('entry_date', next)
  }
  const { data, error } = await q
  if (error) {
    console.error(`조회 실패: ${error.message}`)
    process.exit(1)
  }
  const rows = (data ?? []) as Row[]
  console.log(`일지 ${rows.length}건 검사${MONTH ? ` (${MONTH})` : ''}${DRY ? '  (DRY RUN — 쓰기 없음)' : ''}\n`)

  let filled = 0
  let updated = 0
  let already = 0
  let failed = 0

  for (const r of rows) {
    const list = Array.isArray(r.photos) ? r.photos : []
    const sizes = new Map<string, { w: number; h: number }>()
    for (const p of list) {
      if (!p?.path) continue
      if (hasSize(p)) {
        already++
        continue
      }
      const s = await readSize(sb, p)
      if (s) sizes.set(p.path, s)
      else failed++
    }
    if (sizes.size === 0) continue

    const land = [...sizes.values()].filter((s) => s.w >= s.h).length
    console.log(
      `${r.entry_date} ${r.headline ?? '(제목 없음)'} — ${sizes.size}장 (가로 ${land} · 세로 ${sizes.size - land})`,
    )
    filled += sizes.size
    if (DRY) {
      updated++
      continue
    }
    // 그 사이 다른 루틴(캡션 등)이 photos 를 바꿨을 수 있으므로 직전에 다시 읽어 경로 기준으로 합친다.
    const { data: fresh, error: fErr } = await sb.from('journal_entries').select('photos').eq('id', r.id).maybeSingle()
    const cur = (fresh as { photos: JournalPhoto[] | null } | null)?.photos
    if (fErr || !Array.isArray(cur)) {
      console.log(`  ✗ 재조회 실패 ${r.id}${fErr ? `: ${fErr.message}` : ''}`)
      continue
    }
    const next = cur.map((p) => {
      const s = p?.path ? sizes.get(p.path) : undefined
      return s ? { ...p, meta: { ...(p.meta ?? {}), w: s.w, h: s.h } } : p
    })
    const { error: uErr } = await sb.from('journal_entries').update({ photos: next }).eq('id', r.id)
    if (uErr) console.log(`  ✗ DB 갱신 실패 ${r.id}: ${uErr.message}`)
    else updated++
  }

  console.log(`\n완료: 크기 ${filled}장 채움 · 일지 ${updated}건 갱신 · 이미처리 ${already}장 · 실패 ${failed}장`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
