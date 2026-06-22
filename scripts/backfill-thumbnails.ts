// MFH-BACKFILL-THUMBS-V1
// 기존 일지 사진에 목록·갤러리용 썸네일을 1회 생성한다. 원본은 그대로 두고(`<base>.thumb.webp` 추가),
// photos jsonb 의 각 항목에 thumb_path 를 채운다. 레거시 단일(photo_path)도 photos 배열로 승격하며 썸네일을 단다.
// 멱등 — 이미 thumb_path 가 있는 사진은 건너뛰고, 썸네일 업로드는 upsert(재실행 안전).
// 실행(repo 루트, .env.local 에 SUPABASE_SERVICE_ROLE_KEY 필요):
//   npx tsx scripts/backfill-thumbnails.ts          (실제 반영)
//   npx tsx scripts/backfill-thumbnails.ts --dry     (미리보기 — 쓰기 없음)
import { loadEnv, createServiceClient } from './_shared'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { JournalPhoto } from '../lib/types'
import sharp from 'sharp'

const BUCKET = 'journal-photos'
const THUMB_MAX = 512 // 썸네일 긴 변 px (앱의 lib/imageResize.ts 와 동일 기준)
const DRY = process.argv.includes('--dry')

// 원본 경로 → 썸네일 경로(확장자만 .thumb.webp 로 치환). 앱 업로드 규칙과 동일.
function thumbPathFor(origPath: string): string {
  return origPath.replace(/\.[^./]+$/, '') + '.thumb.webp'
}

// 원본 다운로드 → 512px webp 썸네일 → 업로드. 성공 시 썸네일 경로, 실패 시 null.
async function makeAndUploadThumb(sb: SupabaseClient, origPath: string): Promise<string | null> {
  const tPath = thumbPathFor(origPath)
  const { data, error } = await sb.storage.from(BUCKET).download(origPath)
  if (error || !data) {
    console.log(`  ✗ download 실패: ${origPath}${error ? ` (${error.message})` : ''}`)
    return null
  }
  let out: Buffer
  try {
    const buf = Buffer.from(await data.arrayBuffer())
    out = await sharp(buf)
      .rotate() // EXIF orientation 보정
      .resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer()
  } catch (e) {
    console.log(`  ✗ 변환 실패: ${origPath} (${(e as Error).message})`)
    return null
  }
  if (DRY) {
    console.log(`  (dry) ${origPath} → ${tPath}  ${(out.length / 1024).toFixed(0)}KB`)
    return tPath
  }
  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(tPath, out, { contentType: 'image/webp', upsert: true })
  if (upErr) {
    console.log(`  ✗ 업로드 실패: ${tPath} (${upErr.message})`)
    return null
  }
  return tPath
}

type Row = {
  id: string
  photos: JournalPhoto[] | null
  photo_path: string | null
  photo_taken_at: string | null
  photo_lat: number | null
  photo_lng: number | null
  photo_meta: Record<string, unknown> | null
  place_name: string | null
}

async function main() {
  const env = loadEnv()
  const sb = createServiceClient(env)
  const { data, error } = await sb
    .from('journal_entries')
    .select('id,photos,photo_path,photo_taken_at,photo_lat,photo_lng,photo_meta,place_name')
  if (error) {
    console.error(`조회 실패: ${error.message}`)
    process.exit(1)
  }
  const rows = (data ?? []) as Row[]
  console.log(`일지 ${rows.length}건 검사${DRY ? '  (DRY RUN — 쓰기 없음)' : ''}\n`)

  let made = 0
  let updated = 0
  let already = 0
  let failed = 0

  for (const r of rows) {
    let newPhotos: JournalPhoto[] | null = null

    if (Array.isArray(r.photos) && r.photos.length > 0) {
      // photos 배열 — thumb_path 없는 항목만 생성.
      let changed = false
      const next: JournalPhoto[] = []
      for (const p of r.photos) {
        if (!p?.path) {
          next.push(p)
          continue
        }
        if (p.thumb_path) {
          next.push(p)
          already++
          continue
        }
        const t = await makeAndUploadThumb(sb, p.path)
        if (t) {
          next.push({ ...p, thumb_path: t })
          made++
          changed = true
        } else {
          next.push(p)
          failed++
        }
      }
      if (changed) newPhotos = next
    } else if (r.photo_path) {
      // 레거시 단일 → photos 배열 1개로 승격(썸네일 포함). 표시는 photos 우선이라 즉시 반영.
      const t = await makeAndUploadThumb(sb, r.photo_path)
      if (t) made++
      else failed++
      newPhotos = [
        {
          path: r.photo_path,
          thumb_path: t,
          place_name: r.place_name ?? null,
          taken_at: r.photo_taken_at ?? null,
          lat: r.photo_lat ?? null,
          lng: r.photo_lng ?? null,
          meta: r.photo_meta ?? null,
        },
      ]
    }

    if (newPhotos) {
      if (DRY) {
        updated++
      } else {
        const { error: uErr } = await sb
          .from('journal_entries')
          .update({ photos: newPhotos })
          .eq('id', r.id)
        if (uErr) console.log(`  ✗ DB 갱신 실패 ${r.id}: ${uErr.message}`)
        else updated++
      }
    }
  }

  console.log(
    `\n완료: 썸네일 ${made}개 생성 · 일지 ${updated}건 갱신 · 이미처리 ${already}개 · 실패 ${failed}개`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
