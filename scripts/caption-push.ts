// MFH-CAPTION-PUSH-V2
// Claude Code 가 만든 result.json([{path,caption}]) 을 읽어, 출처별 jsonb(photos/attachments)의 해당 사진에 ai_caption 을 병합 update.
//   · path→{source,row_id} 는 manifest.json 으로 매핑. source 로 테이블·컬럼을 결정한다.
//     journal→journal_entries.photos · task→tasks.attachments · project→projects.attachments
//   · 행별로 jsonb 배열을 다시 읽어 매칭 요소만 ai_caption 추가(타 항목·필드 보존). service role 이라 RLS 우회(user_id 불필요).
// 사용:  npx tsx scripts/caption-push.ts                         (기본 insights-archive/_captions/result.json)
//        npx tsx scripts/caption-push.ts path/to/result.json
// ⚠ repo 루트에서 실행. caption-pull 이 만든 manifest.json 과 짝으로 동작.
import { readFileSync } from 'fs'
import { join } from 'path'
import { loadEnv, createServiceClient } from './_shared'

type Source = 'journal' | 'task' | 'project'
type ManifestItem = { path: string; source: Source; row_id: string }
type ResultItem = { path: string; caption: string }
type CaptionRow = { path?: string; ai_caption?: string | null }

// 출처 → 저장 대상 테이블·jsonb 컬럼.
const SRC: Record<Source, { table: string; col: string }> = {
  journal: { table: 'journal_entries', col: 'photos' },
  task: { table: 'tasks', col: 'attachments' },
  project: { table: 'projects', col: 'attachments' },
}

async function main() {
  const sb = createServiceClient(loadEnv())

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

  // path → {source,row_id} (manifest)
  const pathMeta = new Map<string, { source: Source; row_id: string }>()
  for (const m of manifest) {
    if (m?.path && m?.source && m?.row_id) pathMeta.set(m.path, { source: m.source, row_id: m.row_id })
  }

  // 같은 행(source:row_id)의 캡션을 한데 모은다.
  const groups = new Map<string, { source: Source; row_id: string; caps: Map<string, string> }>()
  let unmatched = 0
  for (const r of result) {
    if (!r?.path || !r?.caption || !String(r.caption).trim()) continue
    const meta = pathMeta.get(r.path)
    if (!meta) {
      console.error(`manifest 에 없는 path(건너뜀): ${r.path}`)
      unmatched++
      continue
    }
    const key = `${meta.source}:${meta.row_id}`
    if (!groups.has(key)) groups.set(key, { source: meta.source, row_id: meta.row_id, caps: new Map() })
    groups.get(key)!.caps.set(r.path, String(r.caption).trim())
  }

  let updated = 0
  let photosSet = 0
  for (const { source, row_id, caps } of groups.values()) {
    const cfg = SRC[source]
    if (!cfg) {
      console.error(`알 수 없는 출처(건너뜀): ${source}`)
      continue
    }
    // 최신 jsonb 를 다시 읽어 병합(다른 작업과의 race 최소화).
    const { data: row, error: selErr } = await sb
      .from(cfg.table)
      .select(cfg.col)
      .eq('id', row_id)
      .single()
    if (selErr || !row) {
      console.error(`조회 실패 ${source}:${row_id}: ${selErr?.message ?? '행 없음'}`)
      continue
    }
    const raw = (row as unknown as Record<string, unknown>)[cfg.col]
    const arr = (Array.isArray(raw) ? raw : []) as CaptionRow[]
    let changed = false
    const next = arr.map((p) => {
      if (p?.path && caps.has(p.path)) {
        changed = true
        photosSet++
        return { ...p, ai_caption: caps.get(p.path)! }
      }
      return p
    })
    if (!changed) continue
    const { error: updErr } = await sb
      .from(cfg.table)
      .update({ [cfg.col]: next })
      .eq('id', row_id)
    if (updErr) {
      console.error(`update 실패 ${source}:${row_id}: ${updErr.message}`)
      continue
    }
    updated++
  }

  console.log(
    `[caption-push] 항목 ${updated}건 · 사진 ${photosSet}장 캡션 저장${unmatched ? ` · 미매칭 ${unmatched}` : ''}`,
  )
}

main().catch((e) => {
  console.error('[caption-push] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
