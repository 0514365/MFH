// MFH-CAPTION-PULL-V3
// ai_caption 이 없는 사진(일지 + 할 일·프로젝트 첨부 이미지)을 Storage 에서 내려받아,
// Claude Code 가 비전 분석할 작업지시서(stdout) + manifest + 이미지 파일을 만든다.
//   · 일지: journal_entries.photos (journal-photos 버킷) — 전부 이미지.
//   · 할 일·프로젝트: tasks/projects.attachments (attachments 버킷) 중 이미지만(PDF·기타 제외).
// 흐름:  caption-pull → Claude Code 비전(이미지 Read→캡션) → caption-push(출처별 jsonb 병합 update)
// 사용:  npx tsx scripts/caption-pull.ts          (증분 — 캡션 없는 사진만)
//        npx tsx scripts/caption-pull.ts --all     (전체 재생성)
// ⚠ repo 루트에서 실행. 분석 입력은 부부 공동(user_id 필터 없음). 이미지·manifest 는 insights-archive/_captions/(gitignore).
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import type { Attachment } from '@/lib/types'
import { isImageAttachment, taskAttachmentDate, projectAttachmentDate } from '@/lib/attachments'
import { loadEnv, createServiceClient } from './_shared'

// 캡션을 가진 jsonb 요소(JournalPhoto·Attachment 공통 형태).
type CaptionPhoto = {
  path?: string
  caption?: string | null
  ai_caption?: string | null
  taken_at?: string | null
  place_name?: string | null
}

type Source = 'journal' | 'task' | 'project'

type JRow = {
  id: string
  entry_date: string | null
  category: string | null
  headline: string | null
  place_name: string | null
  photos: CaptionPhoto[] | null
}
type TRow = {
  id: string
  title: string | null
  category: string | null
  attachments: Attachment[] | null
  due_date: string | null
  completed_at: string | null
  created_at: string | null
}
type PRow = {
  id: string
  title: string | null
  category: string | null
  attachments: Attachment[] | null
  due_date: string | null
  start_date: string | null
  created_at: string | null
}

type ManifestItem = {
  n: number
  file: string
  path: string
  source: Source
  row_id: string // 캡션 저장 대상 행 id
  bucket: string // 'journal-photos' | 'attachments'
  date: string | null
  category: string | null
  title: string | null // 일지 머리말 / 할 일·프로젝트 제목
  place_name: string | null
  taken_at: string | null
}

async function main() {
  const sb = createServiceClient(loadEnv())
  const all = process.argv.includes('--all')

  // 출처별 조회(부부 공동 — service role).
  const { data: jData, error: jErr } = await sb
    .from('journal_entries')
    .select('id,entry_date,category,headline,place_name,photos')
    .not('photos', 'is', null)
    .order('entry_date', { ascending: true })
  if (jErr) {
    console.error('일지 조회 오류:', jErr.message)
    process.exit(1)
  }
  const { data: tData, error: tErr } = await sb
    .from('tasks')
    .select('id,title,category,attachments,due_date,completed_at,created_at')
    .not('attachments', 'is', null)
  if (tErr) {
    console.error('할 일 조회 오류:', tErr.message)
    process.exit(1)
  }
  const { data: pData, error: pErr } = await sb
    .from('projects')
    .select('id,title,category,attachments,due_date,start_date,created_at')
    .not('attachments', 'is', null)
  if (pErr) {
    console.error('프로젝트 조회 오류:', pErr.message)
    process.exit(1)
  }

  // 작업 폴더 깨끗이 재생성.
  const captionsDir = join(process.cwd(), 'insights-archive', '_captions')
  if (existsSync(captionsDir)) rmSync(captionsDir, { recursive: true, force: true })
  mkdirSync(join(captionsDir, 'img'), { recursive: true })

  const manifest: ManifestItem[] = []
  const counts: Record<Source, number> = { journal: 0, task: 0, project: 0 }
  let skipped = 0
  let failed = 0

  // 출처 하나를 통일된 모양으로 순회하며 캡션 없는 사진을 내려받아 manifest 에 담는다.
  async function collect<T>(opts: {
    rows: T[]
    source: Source
    bucket: string
    photos: (r: T) => CaptionPhoto[]
    rowId: (r: T) => string
    date: (r: T) => string | null
    category: (r: T) => string | null
    title: (r: T) => string | null
    placeName: (r: T) => string | null
  }) {
    for (const r of opts.rows) {
      for (const ph of opts.photos(r)) {
        if (!ph || !ph.path) continue
        // 수동 캡션(caption)은 항상 보호 — 사용자가 직접 정한 값 보존(--all 이어도 건너뜀).
        if (ph.caption && String(ph.caption).trim()) {
          skipped++
          continue
        }
        // ai_caption 이 이미 있으면 증분 모드에선 건너뜀(--all 이면 재생성).
        if (ph.ai_caption && String(ph.ai_caption).trim() && !all) {
          skipped++
          continue
        }
        const { data: blob, error: dlErr } = await sb.storage.from(opts.bucket).download(ph.path)
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
          source: opts.source,
          row_id: opts.rowId(r),
          bucket: opts.bucket,
          date: opts.date(r),
          category: opts.category(r),
          title: opts.title(r),
          place_name: ph.place_name ?? opts.placeName(r) ?? null,
          taken_at: ph.taken_at ?? null,
        })
        counts[opts.source]++
      }
    }
  }

  await collect<JRow>({
    rows: (jData ?? []) as JRow[],
    source: 'journal',
    bucket: 'journal-photos',
    photos: (r) => (Array.isArray(r.photos) ? r.photos : []), // 일지 사진은 전부 이미지
    rowId: (r) => r.id,
    date: (r) => r.entry_date,
    category: (r) => r.category,
    title: (r) => r.headline,
    placeName: (r) => r.place_name,
  })
  await collect<TRow>({
    rows: (tData ?? []) as TRow[],
    source: 'task',
    bucket: 'attachments',
    photos: (r) => ((r.attachments ?? []) as Attachment[]).filter(isImageAttachment), // PDF 제외
    rowId: (r) => r.id,
    date: (r) => taskAttachmentDate(r),
    category: (r) => r.category,
    title: (r) => r.title,
    placeName: () => null,
  })
  await collect<PRow>({
    rows: (pData ?? []) as PRow[],
    source: 'project',
    bucket: 'attachments',
    photos: (r) => ((r.attachments ?? []) as Attachment[]).filter(isImageAttachment), // PDF 제외
    rowId: (r) => r.id,
    date: (r) => projectAttachmentDate(r),
    category: (r) => r.category,
    title: (r) => r.title,
    placeName: () => null,
  })

  writeFileSync(join(captionsDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const guide = [
    `[MFH 사진 캡션 생성 — 작업지시서]  캡션 대상 ${manifest.length}장${all ? ' (--all 전체)' : ' (증분)'}`,
    `  · 일지 ${counts.journal} · 할 일 첨부 ${counts.task} · 프로젝트 첨부 ${counts.project} (첨부는 이미지만 — PDF 제외)`,
    '',
    '[절차]',
    '1. insights-archive/_captions/manifest.json 을 읽는다(각 항목: n·file·path·source·row_id·날짜·분류·title·장소).',
    '2. 각 항목의 insights-archive/_captions/<file> 이미지를 Read(비전)로 보고 캡션을 쓴다.',
    '3. insights-archive/_captions/result.json 에 [{ "path": "<manifest 의 path 그대로>", "caption": "<캡션>" }, ...] 로 저장한다.',
    '4. npx tsx scripts/caption-push.ts 를 실행해 DB(출처별 photos/attachments jsonb)에 병합 저장한다.',
    '',
    '[캡션 규칙 — 반드시 준수]',
    '- 1~2문장, 따뜻하고 담백한 한국어.',
    '- 장소·활동·분위기 중심으로 묘사한다(예: "Zapotal 교회 마당에서 함께한 방과후 시간").',
    '- 인물·아동의 실명, 얼굴 특징, 식별 가능한 개인정보는 절대 쓰지 않는다(프라이버시).',
    '- 사진에 보이지 않는 사실을 지어내지 않는다. manifest 의 날짜·장소·분류·title 은 맥락 참고로만.',
    '- 사역의 따뜻한 일상을 담되, 정치적·민감한 단정 표현은 피한다.',
    '- 할 일·프로젝트 첨부(source=task/project)는 사역 현장 외에 자료·기록 사진일 수 있다 — 보이는 그대로 객관적으로 적는다.',
  ].join('\n')
  process.stdout.write(guide + '\n')
  console.error(
    `[caption-pull] 대상 ${manifest.length}장 다운로드${all ? '(--all)' : '(증분)'}(일지 ${counts.journal}·할일 ${counts.task}·프로젝트 ${counts.project}) · 기존 캡션 skip ${skipped}${failed ? ` · 다운로드 실패 ${failed}` : ''} → insights-archive/_captions/`,
  )
}

main().catch((e) => {
  console.error('[caption-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
