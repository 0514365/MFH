// MFH-CAPTION-PUSH-V1
// Claude Code 가 만든 result.json([{path,caption}]) 을 읽어, journal_entries.photos jsonb 의 해당 사진에 ai_caption 을 병합 update.
//   · path→entry_id 는 manifest.json 으로 매핑. entry 별로 photos 전체를 다시 읽어 매칭 요소만 ai_caption 추가(타 사진·필드 보존).
//   · journal_entries.id 기준 update 라 user_id 불필요(service role RLS 우회).
// 사용:  npx tsx scripts/caption-push.ts                         (기본 insights-archive/_captions/result.json)
//        npx tsx scripts/caption-push.ts path/to/result.json
// ⚠ repo 루트에서 실행. caption-pull 이 만든 manifest.json 과 짝으로 동작.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { JournalPhoto } from '@/lib/types'

type ManifestItem = { path: string; entry_id: string }
type ResultItem = { path: string; caption: string }

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

  const captionsDir = join(process.cwd(), 'insights-archive', '_captions')
  const resultPath = process.argv[2] || join(captionsDir, 'result.json')
  const manifestPath = join(captionsDir, 'manifest.json')

  let result: ResultItem[]
  let manifest: ManifestItem[]
  try {
    result = JSON.parse(readFileSync(resultPath, 'utf8')) as ResultItem[]
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestItem[]
  } catch (e) {
    console.error('입력을 읽지 못했습니다(result.json/manifest.json):', (e as Error).message)
    process.exit(1)
  }
  if (!Array.isArray(result) || !result.length) {
    console.error('result.json 이 비었습니다. 캡션 [{path,caption}] 배열을 확인하세요.')
    process.exit(1)
  }

  // path → entry_id (manifest), path → caption (result)
  const pathToEntry = new Map<string, string>()
  for (const m of manifest) if (m?.path && m?.entry_id) pathToEntry.set(m.path, m.entry_id)

  // entry_id → Map<path, caption>
  const byEntry = new Map<string, Map<string, string>>()
  let unmatched = 0
  for (const r of result) {
    if (!r?.path || !r?.caption || !String(r.caption).trim()) continue
    const eid = pathToEntry.get(r.path)
    if (!eid) {
      console.error(`manifest 에 없는 path(건너뜀): ${r.path}`)
      unmatched++
      continue
    }
    if (!byEntry.has(eid)) byEntry.set(eid, new Map())
    byEntry.get(eid)!.set(r.path, String(r.caption).trim())
  }

  let updated = 0
  let photosSet = 0
  for (const [eid, capMap] of byEntry) {
    // 최신 photos 를 다시 읽어 병합(다른 작업과의 race 최소화).
    const { data: row, error: selErr } = await sb
      .from('journal_entries')
      .select('photos')
      .eq('id', eid)
      .single()
    if (selErr || !row) {
      console.error(`조회 실패 ${eid}: ${selErr?.message ?? '행 없음'}`)
      continue
    }
    const photos = (Array.isArray(row.photos) ? row.photos : []) as JournalPhoto[]
    let changed = false
    const next = photos.map((p) => {
      if (p?.path && capMap.has(p.path)) {
        changed = true
        photosSet++
        return { ...p, ai_caption: capMap.get(p.path)! }
      }
      return p
    })
    if (!changed) continue
    const { error: updErr } = await sb.from('journal_entries').update({ photos: next }).eq('id', eid)
    if (updErr) {
      console.error(`update 실패 ${eid}: ${updErr.message}`)
      continue
    }
    updated++
  }

  console.log(
    `[caption-push] 일지 ${updated}건 · 사진 ${photosSet}장 캡션 저장${unmatched ? ` · 미매칭 ${unmatched}` : ''}`,
  )
}

main().catch((e) => {
  console.error('[caption-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
