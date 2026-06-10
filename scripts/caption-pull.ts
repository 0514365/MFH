// MFH-CAPTION-PULL-V2
// ai_caption 이 없는 일지 사진을 Storage 에서 내려받아, Claude Code 가 비전 분석할 작업지시서(stdout) + manifest + 이미지 파일을 만든다.
// 흐름:  caption-pull → Claude Code 비전(이미지 Read→캡션) → caption-push(photos jsonb 병합 update)
// 사용:  npx tsx scripts/caption-pull.ts          (증분 — 캡션 없는 사진만)
//        npx tsx scripts/caption-pull.ts --all     (전체 재생성)
// ⚠ repo 루트에서 실행. 분석 입력은 부부 공동(user_id 필터 없음). 이미지·manifest 는 insights-archive/_captions/(gitignore).
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import type { JournalPhoto } from '@/lib/types'
import { loadEnv, createServiceClient } from './_shared'

type JRow = {
  id: string
  entry_date: string | null
  category: string | null
  headline: string | null
  place_name: string | null
  photos: JournalPhoto[] | null
}

type ManifestItem = {
  n: number
  file: string
  path: string
  entry_id: string
  entry_date: string | null
  category: string | null
  headline: string | null
  place_name: string | null
  taken_at: string | null
}

async function main() {
  const sb = createServiceClient(loadEnv())
  const all = process.argv.includes('--all')

  // photos jsonb 가 있는 일지(부부 공동). 레거시 단일 컬럼은 patch82 로 이미 photos 로 이전됨.
  const { data, error } = await sb
    .from('journal_entries')
    .select('id,entry_date,category,headline,place_name,photos')
    .not('photos', 'is', null)
    .order('entry_date', { ascending: true })
  if (error) {
    console.error('조회 오류:', error.message)
    process.exit(1)
  }

  // 작업 폴더 깨끗이 재생성.
  const captionsDir = join(process.cwd(), 'insights-archive', '_captions')
  if (existsSync(captionsDir)) rmSync(captionsDir, { recursive: true, force: true })
  mkdirSync(join(captionsDir, 'img'), { recursive: true })

  const manifest: ManifestItem[] = []
  let skipped = 0
  let failed = 0
  for (const r of (data ?? []) as JRow[]) {
    if (!Array.isArray(r.photos)) continue
    for (const ph of r.photos) {
      if (!ph || !ph.path) continue
      // 수동 캡션(caption)은 항상 보호 — AI 비용 절약 + 사용자가 직접 정한 값 보존(--all 이어도 건너뜀).
      const hasManual = ph.caption && String(ph.caption).trim()
      if (hasManual) {
        skipped++
        continue
      }
      const hasCaption = ph.ai_caption && String(ph.ai_caption).trim()
      if (hasCaption && !all) {
        skipped++
        continue
      }
      const { data: blob, error: dlErr } = await sb.storage.from('journal-photos').download(ph.path)
      if (dlErr || !blob) {
        console.error(`다운로드 실패: ${ph.path} (${dlErr?.message ?? '빈 응답'})`)
        failed++
        continue
      }
      const n = manifest.length + 1
      const ext = (ph.path.split('.').pop() || 'jpg').toLowerCase()
      const file = `img/${String(n).padStart(3, '0')}.${ext}`
      writeFileSync(join(captionsDir, file), Buffer.from(await blob.arrayBuffer()))
      manifest.push({
        n,
        file,
        path: ph.path,
        entry_id: r.id,
        entry_date: r.entry_date,
        category: r.category,
        headline: r.headline,
        place_name: ph.place_name ?? r.place_name ?? null,
        taken_at: ph.taken_at ?? null,
      })
    }
  }

  writeFileSync(join(captionsDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const guide = [
    `[MFH 사진 캡션 생성 — 작업지시서]  캡션 대상 ${manifest.length}장${all ? ' (--all 전체)' : ' (증분)'}`,
    '',
    '[절차]',
    '1. insights-archive/_captions/manifest.json 을 읽는다(각 항목: n·file·path·날짜·분류·머리말·장소 맥락).',
    '2. 각 항목의 insights-archive/_captions/<file> 이미지를 Read(비전)로 보고 캡션을 쓴다.',
    '3. insights-archive/_captions/result.json 에 [{ "path": "<manifest 의 path 그대로>", "caption": "<캡션>" }, ...] 로 저장한다.',
    '4. npx tsx scripts/caption-push.ts 를 실행해 DB(photos jsonb)에 병합 저장한다.',
    '',
    '[캡션 규칙 — 반드시 준수]',
    '- 1~2문장, 따뜻하고 담백한 한국어.',
    '- 장소·활동·분위기 중심으로 묘사한다(예: "Zapotal 교회 마당에서 함께한 방과후 시간").',
    '- 인물·아동의 실명, 얼굴 특징, 식별 가능한 개인정보는 절대 쓰지 않는다(프라이버시).',
    '- 사진에 보이지 않는 사실을 지어내지 않는다. manifest 의 날짜·장소·분류·머리말은 맥락 참고로만.',
    '- 사역의 따뜻한 일상을 담되, 정치적·민감한 단정 표현은 피한다.',
  ].join('\n')
  process.stdout.write(guide + '\n')
  console.error(
    `[caption-pull] 대상 ${manifest.length}장 다운로드${all ? '(--all)' : '(증분)'} · 기존 캡션 skip ${skipped}${failed ? ` · 다운로드 실패 ${failed}` : ''} → insights-archive/_captions/`,
  )
}

main().catch((e) => {
  console.error('[caption-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
