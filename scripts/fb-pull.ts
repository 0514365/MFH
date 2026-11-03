// MFH-FB-PULL-V1
// 최근 7일 앱 데이터(일지 본문 + 사진 path·기존 캡션 + 인사이트 신호)를 읽어,
// Claude Code 가 "이번 주 Facebook 게시안"을 작성할 작업지시서(Markdown)를 stdout 출력.
//   · 사진은 다운로드/비전 재분석하지 않는다 — 이미 생성된 caption/ai_caption 텍스트만 사용(추가 AI 비용 0).
//   · 흐름:  fb-pull(이 스크립트) → Claude Code 분석(가드레일 내장) → fb-push(weekly_fb 저장)
// 사용:  npx tsx scripts/fb-pull.ts            (기본 최근 7일)
//        npx tsx scripts/fb-pull.ts --days 14
// ⚠ repo 루트에서 실행(.env.local 경로가 process.cwd() 기준). 분석 입력은 부부 공동(user_id 필터 없음).
import { periodStart, todayStr } from '@/lib/insightExport'
import type { JournalPhoto } from '@/lib/types'
import { readFileSync } from 'fs'
import { join } from 'path'
import { loadEnv, createServiceClient } from './_shared'

type JRow = {
  id: string
  entry_date: string | null
  category: string | null
  headline: string | null
  today: string | null
  thanks: string | null
  meditation: string | null
  prayer: string | null
  place_name: string | null
  photos: JournalPhoto[] | null
}

const dash = (s: string | null | undefined) => (s && s.trim() ? s.trim() : '')

async function main() {
  const sb = createServiceClient(loadEnv())

  // 인자: --days N (기본 7 = 이번 주).
  const daysIdx = process.argv.indexOf('--days')
  const days =
    daysIdx >= 0 && Number(process.argv[daysIdx + 1]) > 0 ? Number(process.argv[daysIdx + 1]) : 7
  const pStart = periodStart(days)
  const pEnd = todayStr()

  // 최근 N일 일지(부부 공동) — 본문 + 사진.
  const { data: journals, error } = await sb
    .from('journal_entries')
    .select('id,entry_date,category,headline,today,thanks,meditation,prayer,place_name,photos')
    // 비공개·비밀글 제외(patch102 — service role 은 RLS 우회라 명시 필터 필요).
    .eq('is_private', false)
    .eq('is_secret', false)
    .gte('entry_date', pStart)
    .lte('entry_date', pEnd)
    .order('entry_date', { ascending: true })
  if (error) {
    console.error('조회 오류:', error.message)
    process.exit(1)
  }
  const rows = (journals ?? []) as JRow[]

  // 일지 본문 블록.
  const journalBlocks =
    rows
      .map((r) => {
        const parts: string[] = [`### ${dash(r.entry_date) || '?'} · ${dash(r.category) || '미분류'}`]
        if (dash(r.headline)) parts.push(`머리말: ${r.headline!.trim()}`)
        if (dash(r.place_name)) parts.push(`장소: ${r.place_name!.trim()}`)
        if (dash(r.today)) parts.push(`오늘 있었던 일: ${r.today!.trim()}`)
        if (dash(r.thanks)) parts.push(`감사·응답: ${r.thanks!.trim()}`)
        if (dash(r.meditation)) parts.push(`묵상·깨달음: ${r.meditation!.trim()}`)
        if (dash(r.prayer)) parts.push(`기도제목: ${r.prayer!.trim()}`)
        return parts.join('\n')
      })
      .join('\n\n') || '(기간 내 일지 없음)'

  // 사진 목록 — path + 기존 캡션(caption 우선, 없으면 ai_caption). 추천 후보.
  const photoLines: string[] = []
  let withCaption = 0
  for (const r of rows) {
    if (!Array.isArray(r.photos)) continue
    for (const ph of r.photos) {
      if (!ph?.path) continue
      const cap = dash(ph.caption) || dash(ph.ai_caption)
      if (cap) withCaption++
      const place = dash(ph.place_name) || dash(r.place_name)
      const ctx = [dash(r.entry_date), place].filter(Boolean).join(' · ')
      photoLines.push(`- path: ${ph.path}${ctx ? ` · [${ctx}]` : ''} · 캡션: ${cap || '[캡션없음]'}`)
    }
  }
  const photoBlock = photoLines.length ? photoLines.join('\n') : '(기간 내 사진 없음)'

  // 영상 클립 — media/index.md(scripts/index-media.py 생성)에서 기간 내 날짜 절만 뽑는다. 파일 없으면 빈 목록.
  const clipLines: string[] = []
  try {
    const idx = readFileSync(join(process.cwd(), 'media', 'index.md'), 'utf8')
    let cur = ''
    for (const line of idx.split('\n')) {
      const h = line.match(/^## (\d{4}-\d{2}-\d{2})/)
      if (h) { cur = h[1]; continue }
      const row = line.match(/^\| `([^`]+)` \| (\S+) \| ([^|]+) \| ([^|]*) \| /)
      if (row && cur >= pStart && cur <= pEnd && row[2] !== '음성')
        clipLines.push(`- clip: ${row[1]} · [${cur} · ${row[2]} · ${row[3].trim()}]`)
    }
  } catch {
    /* media/index.md 없음 — 클립 없이 진행 */
  }
  const clipBlock = clipLines.length ? clipLines.join('\n') : '(기간 내 클립 없음 — 릴스는 사진으로만)'

  // 최근 인사이트(간증·기도·편지) — 톤·주제 참고용(생성엔 강제 아님).
  const { data: insights } = await sb
    .from('insights')
    .select('domain,content')
    .in('domain', ['fruit', 'prayer', 'letter'])
    .order('created_at', { ascending: false })
    .limit(3)
  const insightBlock =
    (insights ?? [])
      .filter((i) => i.content && String(i.content).trim())
      .map((i) => `### ${i.domain}\n${String(i.content).trim()}`)
      .join('\n\n') || '(참고할 최근 인사이트 없음)'

  const guide = [
    `[MFH 주간 Facebook 게시 추천 — 작업지시서]  기간 ${pStart} ~ ${pEnd} (최근 ${days}일)`,
    `대상 일지 ${rows.length}건 · 사진 ${photoLines.length}장(캡션 보유 ${withCaption}장)`,
    '',
    '[절차]',
    '1. 아래 "분석 데이터"(이번 주 일지 + 사진 캡션 + 참고 인사이트)를 읽는다.',
    '2. 이번 주 Facebook 게시안 2~3개를 작성한다. 각 게시안:',
    '   - text: 게시 문구. 따뜻하고 진솔한 한국어 보고체, 후원·기도 동역자 대상. 2~5문장 + 짧은 맺음(기도/감사).',
    '   - photos: 추천 사진 1~3장. 아래 [사진 목록]의 path 를 "그대로" 옮겨 쓴다(임의 경로 금지). caption 은 그 사진에 맞는 짧은 설명(선택).',
    '   - hashtags: 3~6개(예: #온두라스선교 #MFH #선교편지). 한국어/영어 혼용 가능.',
    '   - rationale: 왜 이 게시안인지 한 줄(우진 참고용 — 실제 게시문엔 미포함).',
    '3. 릴스 1건(reel)을 함께 설계한다 — 15~30초 세로 영상(표지 + 장면 3~4개 + 마무리). 장면은 [사진 목록]의 path(사진) 또는 [영상 클립]의 파일(clip) 중 하나 + 자막 1줄(36자 이내, 사실만).',
    '   사진·클립이 합쳐 3개 미만이면 reel 을 null 로 두고 이유를 rationale 에 쓴다. 음악은 넣지 않는다(게시 시 앱에서 선택).',
    '4. insights-archive/_fb/result.json 에 아래 [result.json 형식] 으로 저장한다(폴더 없으면 만든다).',
    '5. npx tsx scripts/fb-push.ts 를 실행해 DB(weekly_fb)에 저장한다.',
    '6. reel 이 있으면 npx tsx scripts/make-reel.ts 를 실행해 media/out/reel-<week_start>.mp4 를 만든다(사진 다운로드 → 템플릿 채움 → build-video.py).',
    '7. 저장·빌드 결과를 한국어 1~2줄로 보고한다.',
    '',
    '[게시안 규칙 — 반드시 준수]',
    '- 온두라스 정치는 정당·인물 거명 없이 항상 중립.',
    '- 인물·아동의 실명·얼굴특징·식별정보 금지(프라이버시). 캡션·일지에 없는 사실을 지어내지 않는다.',
    '- 따뜻하고 담백한 보고체 — 과장·감정과잉·모금 압박 금지. 감사와 동행(기도) 요청 중심.',
    '- 사진은 캡션이 있는 것을 우선 추천(내용을 아는 사진). [캡션없음] 사진은 일지 맥락이 분명할 때만.',
    '- 게시안 2~3개는 서로 다른 주제·사진으로 다양하게(같은 내용 반복 금지).',
    '',
    '[result.json 형식]',
    '{',
    `  "week_start": "${pStart}",`,
    `  "week_end": "${pEnd}",`,
    '  "posts": [',
    '    { "text": "게시 문구…", "photos": [{ "path": "<목록의 path 그대로>", "caption": "사진 설명(선택)" }], "hashtags": ["#온두라스선교"], "rationale": "선정 이유 한 줄" }',
    '  ],',
    '  "reel": {',
    '    "title": "표지 제목(2줄 이내, <br> 로 줄바꿈)", "label": "표지 소제목(예: 이번 주 소식)", "date_label": "2026.11",',
    '    "cover_photo": "<사진 path>",',
    '    "scenes": [',
    '      { "photo": "<사진 path>", "label": "장소·사역", "caption": "자막 1줄" },',
    '      { "clip": "<[영상 클립]의 파일 그대로>", "label": "장소·사역", "caption": "자막 1줄" }',
    '    ],',
    '    "end_line": "마무리 한 줄(예: 11월 셋째 주 · Zapotal)", "text": "릴스 게시 문구(1~2문장)", "hashtags": ["#온두라스선교"], "rationale": "선정 이유"',
    '  }',
    '}',
    '',
    '═══════════════════════ 분석 데이터 ═══════════════════════',
    '',
    `## 이번 주 일지 (${rows.length}건)`,
    journalBlocks,
    '',
    `## 사진 목록 (${photoLines.length}장 — 캡션 있는 것 우선 추천)`,
    photoBlock,
    '',
    '## 영상 클립 (media/index.md · 기간 내 · 세로 우선 · 릴스 clip 후보)',
    clipBlock,
    '',
    '## 참고 인사이트 (톤·주제 참고 — 강제 아님)',
    insightBlock,
  ].join('\n')

  process.stdout.write(guide + '\n')
  console.error(
    `[fb-pull] ${pStart}~${pEnd} · 일지 ${rows.length} · 사진 ${photoLines.length}(캡션 ${withCaption}) · 참고 인사이트 ${insights?.length ?? 0} → stdout`,
  )
}

main().catch((e) => {
  console.error('[fb-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
