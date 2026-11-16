// MFH-FB-PULL-V6
// V6: 릴스 = 스토리 먼저(docs/MFH-REEL-GUIDE.md) — reel.story 를 먼저 쓰고 한 문장이 2~4장면에 걸쳐 이어지게 나눈다 · 가로는 letterbox
// V5: 릴스 자막 종결어미 = 합니다체(~습니다/~니다) — 해요체 금지(2026-11-16 우진 지시)
// V4: 글쓰기 기조(docs/MFH-WRITING-GUIDE.md) 반영 — 게시 문구 한국어→―→스페인어, 한·스 짝 해시태그, 신앙적 표현 기준
// V2: 장면 dur 지정 · [영상 클립] 있으면 클립 장면 필수 · 요일·출석 사실 확인 규칙
// V4: 릴스는 일지 맥락(이야기) 먼저 구상 → 거기에 맞춰 장면 배치 — 자막이 화면 설명이 되지 않게
// V3: 릴스는 한 주제 집중(그 주제의 클립·사진만) · 기본 약 45초 · 클립 줌/좌우 이동으로 얼굴이 한 번은 보이게
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
    '   - text: 게시 문구 = 한국어 본문(2~5문장 + 짧은 맺음) → 빈 줄 → "―" → 빈 줄 → 같은 내용의 스페인어 본문. 담백한 기록이 신앙고백으로 모아지게(아래 [글쓰기 기조]).',
    '   - photos: 추천 사진 1~3장. 아래 [사진 목록]의 path 를 "그대로" 옮겨 쓴다(임의 경로 금지). caption 은 그 사진에 맞는 짧은 설명(선택).',
    '   - hashtags: 한국어·스페인어 짝으로 4~8개, 짝끼리 나란히(예: #온두라스선교 #MisiónHonduras #주일학교 #EscuelaDominical #MFH).',
    '   - rationale: 왜 이 게시안인지 한 줄(우진 참고용 — 실제 게시문엔 미포함).',
    '3. 릴스 1건(reel)을 함께 설계한다 — 기본 약 45초 세로 영상(표지 4초 + 장면 6~8개 + 마무리 4초). 장면은 [사진 목록]의 path(사진) 또는 [영상 클립]의 파일(clip) 중 하나 + 자막 1줄.',
    '   ★ 한 주제 집중: 릴스는 게시안 하나처럼 "한 가지 주제(한 사역·한 날)"만 다룬다 — 이번 주 여러 사역을 섞지 않는다. 사진·클립 모두 그 주제의 것만 쓴다.',
    '   ★ 맥락 먼저: 장면부터 고르지 않는다. ① 그 주제의 일지를 다시 읽고 게시안 문구를 쓸 때처럼 "이야기 줄거리"(상황·걱정 → 일어난 일 → 그 안에서 느낀 것·말씀 → 고백·기도)를 먼저 짠다',
    '     → ② 줄거리를 자막 문장으로 나눈다 → ③ 각 문장에 어울리는 사진·클립을 고른다. 자막은 일지의 이야기를 전하는 내레이션이지 화면에 보이는 것을 설명하는 글이 아니다',
    '     (나쁨: "같이 율동하며 찬양!" "따끈한 핫초코 한 잔씩!" — 화면 설명 / 좋음: "큰비에 못 오겠구나 했는데" "통장 젖을까 옷 속에 품고요" — 일지의 이야기). 자막만 이어 읽어도 그날 일지의 흐름이 전해져야 한다.',
    '   각 장면에 dur(초)를 적는다 — 클립 6~8초, 사진 4~5초. 전환마다 0.6초씩 겹치므로 장면 dur 합계 = 37 + 0.6×(장면 수+1) 로 맞추면 완성본이 45초(예: 장면 7개 → 합계 약 42초).',
    '   긴 클립은 start(초)를 달리해 여러 장면으로 나눠 써도 된다.',
    '   ★ 그 주제의 [영상 클립]이 있으면 반드시 클립 장면을 쓴다(다른 주제의 클립은 쓰지 않는다). 클립에는 캡션이 없으므로',
    '     ffmpeg 로 프레임을 몇 장 뽑아 내용을 직접 확인한 뒤 자막을 쓴다(파일명 날짜는 촬영일과 어긋날 수 있으니 내용으로 일지와 짝짓고, 짝이 불분명한 클립은 뺀다).',
    '   ★ 클립 줌·이동: 클립 장면마다 motion("in"=줌인 · "out"=줌아웃 · "right"=왼쪽→오른쪽 훑기 · "left"=오른쪽→왼쪽), zoom(배율 1.3~1.5), focus(확대 중심 = 얼굴 위치, 예 "45% 35%")를 적는다.',
    '     사진도 인물이 양옆에 있어 세로 크롭에 얼굴이 잘리면 같은 식으로 motion("right"/"left")+zoom(1.2~1.3)+focus 를 적어 좌우로 훑는다(dur 5초).',
    '     뽑아 본 프레임에서 얼굴 위치를 보고 정한다 — 등장 인물의 얼굴이 영상 전체에서 가능한 한 번은 크게 보이도록(여럿이 선 넓은 장면은 좌우 훑기, 한두 명은 얼굴 쪽 줌인).',
    '   사진·클립이 합쳐 3개 미만이면 reel 을 null 로 두고 이유를 rationale 에 쓴다. 음악은 넣지 않는다(게시 시 앱에서 선택).',
    '   ★ 릴스는 스토리가 먼저다 — reel.story 를 먼저 쓰고 그 글을 장면으로 나눈다. 아래 [릴스 자막 규칙]을 따른다.',
    '   ★ reel.text(게시 문구)는 같은 주제의 게시안이 있으면 그 게시안의 text 를 그대로 쓴다. 같은 행사를 게시안 여러 건으로 나누지 않는다(한 행사 = 한 게시안).',
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
    '- 요일·인원은 일지 그대로 쓴다 — 날짜의 실제 요일을 확인한다(예: 토요일 어린이 예배를 "주일"로 쓰지 않는다). "모두/다 왔다" 류 과장 금지("하나둘 왔다"처럼 일지 표현을 따른다).',
    '- 게시안 2~3개는 서로 다른 주제·사진으로 다양하게(같은 내용 반복 금지).',
    '',
    '[글쓰기 기조 — docs/MFH-WRITING-GUIDE.md 요약 · 반드시 준수]',
    '- 하루의 일을 담백하게 기록하되 순수한 신앙고백으로 모아지게. 없는 사건·장면을 지어내지 않고, 작위적인 묘사(꾸민 감탄·연출)를 넣지 않는다.',
    '- 주체는 하나님이시다. 기도의 응답은 하나님의 주권으로 표현한다. 죽음을 깨달음의 도구로 쓰지 않는다.',
    '- 한국의 위상이나 선교사·교회를 특별히 선택된 것처럼 쓰지 않는다(한국에 대한 호의를 "우리에게 열어 주신 특별한 문"으로 해석 금지).',
    '- 기도는 모든 아이를 품는다(온 아이만이 아니라 오지 못한 아이까지). 성경 구절은 개역개정, 스페인어는 Reina-Valera 1960 본문 그대로.',
    '- 스페인어는 온두라스 현지 표현(se fue la luz, merienda, manta 등). 실명·가족의 사적 사정은 뺀다. 아이 사진을 추천하면 rationale 에 "보호자 동의 확인"을 적는다.',
    '- 릴스: 화면 자막은 한국어 합니다체(아래 규칙), reel.text(게시 문구)는 한국어 → ― → 스페인어, reel.hashtags 도 한·스 짝.',
    '',
    '[릴스 자막 규칙 — 스토리 먼저 · 합니다체] (docs/MFH-REEL-GUIDE.md 요약)',
    '- ★ 가장 중요: 릴스는 하나의 이야기를 전하려고 만든다. 장면마다 문장 하나씩 붙이지 않는다.',
    '  ① 그 주제의 일지·사진 캡션·클립 프레임을 먼저 본다 → ② 처음부터 끝까지 이어지는 한 편의 글(story)을 먼저 쓴다(준비 → 일어난 일 → 그 안에서 본 것 → 고백·기도)',
    '  → ③ 그 글을 장면으로 나눈다: 한 문장이 2~4개 장면에 걸쳐 이어지게 끊는다 → ④ 나눈 자막마다 어울리는 사진·클립을 붙인다(재료가 없는 문장은 스토리에서 뺀다).',
    '- 문장 중간 장면은 "~하여 / ~하며 / ~했고 / ~으로 / 쉼표" 로 다음 장면에 넘기고, 문장이 끝나는 장면만 "~습니다 / ~니다" 로 맺는다.',
    '  예(좋음): ① "아침 8시부터 준비를 시작하여" ② "봉사 학생들, 교수님들과 함께 천막을 치고 짐을 날랐습니다" ③ "행사는 열 시부터였지만" ④ "아홉 시 반부터 벌써 많은 학생들이 모였습니다"',
    '  예(나쁨): "아침 8시, 천막부터 쳤습니다" / "봉사 학생들과 함께했습니다" / "학생들이 모였습니다" — 장면마다 따로 끝나는 문장.',
    '- 합니다체로 통일한다. "~해요 / ~에요 / ~네요 / ~죠" 해요체와 짧은 감탄(…!)은 쓰지 않는다.',
    '- 화자는 선교사 본인. 화면 설명문이 아니라 일지의 이야기를 전하는 내레이션이다. 사실은 일지·캡션 범위 안에서만(지어내기·작위 묘사 금지), 주체는 하나님([글쓰기 기조]).',
    '- 길이: 장면당 한두 줄, 30자를 넘기지 않는다. 두 줄 자막 장면은 dur 5초.',
    '- 마지막 문장은 고백 또는 기도(여기서만 "함께 기도 부탁드립니다" 류 권유 허용).',
    '- label 은 단락 제목(장소·프로그램 이름, 예: "Zapotal · 토요일" / "한복 체험")으로 쓰고, 같은 단락의 장면들은 같은 label 을 유지한다. 성구 장절은 label 에 넣지 않는다.',
    '- 가로 사진·가로 클립은 자르지 않는다: 장면에 "fit": "letterbox" 를 적는다(원본 비율로 가운데, 위에 label·아래에 자막). 세로는 그대로 꽉 채운다.',
    '- 검증: 자막만 처음부터 끝까지 이어 읽으면 story 와 같은 한 편의 글이 되어야 한다.',
    '',
    '[result.json 형식]',
    '{',
    `  "week_start": "${pStart}",`,
    `  "week_end": "${pEnd}",`,
    '  "posts": [',
    '    { "text": "한국어 본문…\\n\\n―\\n\\nTexto en español…", "photos": [{ "path": "<목록의 path 그대로>", "caption": "사진 설명(선택)" }], "hashtags": ["#온두라스선교", "#MisiónHonduras"], "rationale": "선정 이유 한 줄" }',
    '  ],',
    '  "reel": {',
    '    "story": "장면으로 나누기 전에 먼저 쓴 한 편의 글(자막을 이어 읽으면 이 글이 된다)",',
    '    "title": "표지 제목(2줄 이내, <br> 로 줄바꿈)", "label": "표지 소제목(예: 이번 주 소식)", "date_label": "2026.11",',
    '    "cover_photo": "<사진 path>",',
    '    "scenes": [',
    '      { "photo": "<사진 path>", "dur": 5, "label": "", "caption": "문장의 앞부분(~하여 / ~하며)" },',
    '      { "clip": "<[영상 클립]의 파일 그대로>", "start": 0, "dur": 7, "motion": "right", "zoom": 1.4, "focus": "50% 40%", "label": "장소·시간(선택)", "caption": "이어지는 뒷부분(~습니다)" }',
    '    ],',
    '    "end_line": "마무리 한 줄(예: 11월 셋째 주 · Zapotal)", "text": "릴스 게시 문구 1~2문장\\n\\n―\\n\\nespañol 1~2 frases", "hashtags": ["#온두라스선교", "#MisiónHonduras"], "rationale": "선정 이유"',
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
