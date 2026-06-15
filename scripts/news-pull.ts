// MFH-NEWS-PULL-V1
// 온두라스 동향 일일 브리핑 "작업지시서"(Markdown)를 stdout 출력.
//   · 앱 데이터가 아니라 Claude Code 가 WebSearch 로 찾아 정리할 대상·규칙·형식을 담는다.
//   · 최근 3일 저장분의 헤드라인을 함께 넘겨 "같은 뉴스 반복"을 피한다.
//   · 흐름: news-pull(이 스크립트) → Claude Code(WebSearch + 정리, 가드레일 내장) → news-push(honduras_news 저장)
// 사용:  npx tsx scripts/news-pull.ts            (오늘 = 로컬 타임존 기준)
// ⚠ repo 루트에서 실행(.env.local 경로가 process.cwd() 기준).
import { loadEnv, createServiceClient } from './_shared'

type SectionItem = { title?: string | null }
type Sections = { politics?: SectionItem[]; economy?: SectionItem[]; society?: SectionItem[]; culture?: SectionItem[] }
type NewsRow = { news_date: string | null; sections: Sections | null }

// 로컬(맥북 타임존) 기준 오늘 — 온두라스/한국 현지 날짜. toISOString(UTC)은 새벽 실행 시 하루 어긋나 회피.
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  const sb = createServiceClient(loadEnv())

  const today = localToday()

  // 최근 3일 저장된 브리핑 헤드라인 — 같은 뉴스 반복을 피하기 위한 참고용(중복 회피).
  const { data: recent } = await sb
    .from('honduras_news')
    .select('news_date,sections')
    .order('news_date', { ascending: false })
    .limit(3)
  const recentTitles: string[] = []
  for (const r of (recent ?? []) as NewsRow[]) {
    const s = r.sections ?? {}
    for (const key of ['politics', 'economy', 'society', 'culture'] as const) {
      for (const item of s[key] ?? []) {
        if (item?.title && item.title.trim()) recentTitles.push(`(${r.news_date}) ${item.title.trim()}`)
      }
    }
  }
  const recentBlock = recentTitles.length
    ? recentTitles.join('\n')
    : '(최근 저장된 브리핑 없음 — 첫 실행)'

  const guide = [
    `[MFH 온두라스 동향 — 일일 브리핑 작업지시서]  날짜 ${today}`,
    '',
    '오늘 온두라스 주요 뉴스를 WebSearch 로 검색해 정치/경제/사회/문화 4개 분야로 정리하고,',
    'San Pedro Sula 지역·온두라스 한인(한국인) 관련 뉴스는 따로 강조하며, 끝에 선교 인사이트를 덧붙인다.',
    '',
    '[절차]',
    '1. 아래 [검색 가이드]대로 WebSearch 를 실행한다(표준 깊이 = 검색 약 5~6회).',
    '2. 결과를 [정리 규칙]에 맞춰 4섹션 + 하이라이트 + 선교 인사이트로 작성한다.',
    '3. insights-archive/_news/result.json 에 [result.json 형식]으로 Write 한다(폴더 없으면 만든다).',
    '4. npx tsx scripts/news-push.ts 를 실행해 DB(honduras_news)에 저장한다.',
    '5. 저장 결과(날짜·분야별 건수·하이라이트 수)를 한국어 1~2줄로 보고한다.',
    '',
    '[검색 가이드] — 스페인어 검색이 1차(현지 매체), 영어/한국어로 보강. 최신순·당일 위주.',
    '- 정치(politics): "Honduras noticias política hoy", 의회·정부·선거·정책 동향.',
    '- 경제(economy): "Honduras economía noticias", 환율·물가·고용·투자·송금(remesas).',
    '- 사회(society): "Honduras noticias sociedad seguridad", 치안·사건사고·보건·교육·이민.',
    '- 문화(culture): "Honduras cultura noticias", 종교·축제·스포츠·교회·지역행사.',
    '- ★San Pedro Sula: "San Pedro Sula noticias hoy" — 이 지역 뉴스는 반드시 별도 강조(highlights).',
    '- ★한인: "coreanos Honduras" / "한인 온두라스" / "Corea Honduras" — 교민·한국 관련은 별도 강조(highlights).',
    '- 현지 매체 예: La Prensa, El Heraldo, Diario Tiempo, Proceso Digital, La Tribuna.',
    '',
    '[정리 규칙 — 반드시 준수]',
    '- ★최신성·공통보도 우선: 최신(당일·최근) 소식을 앞세우고, 여러 언론이 공통으로 주목하는 사안을 먼저 다룬다(단독 보도보다 교차확인된 것 우선).',
    '- 분야별 2~3건(표준). 각 항목: title(한국어 한 줄 제목) · body(2~4문장 한국어 요약) · source(매체명) · url(그 기사 원문 링크 https://…). ★url 은 앱에서 출처 클릭 시 실제 기사로 이동하는 데 쓰이니 가능하면 반드시 채운다(WebSearch 결과의 기사 주소).',
    '- ★이 페이지는 내부 동향 파악용이다 → 정당명·인물명을 사실대로 그대로 기재한다(편지·FB 의 정치중립 규칙과 정반대 — 여기서는 실명 OK).',
    '- ★단 사실·출처 기반만. WebSearch 로 확인되지 않은 내용은 쓰지 않는다. 추측·과장·날조 금지. 불확실하면 "확인 필요"로 표기하거나 제외.',
    '- San Pedro Sula·한인 뉴스는 sections 에도 넣되, highlights 배열에 tag("San Pedro Sula" 또는 "한인")로 한 번 더 강조한다(없으면 빈 배열).',
    '- 아래 [최근 저장된 헤드라인]과 똑같은 내용의 단순 반복만 피한다. 같은 사안이라도 새 전개·다른 각도·추가 소식이면 다뤄도 좋다(같은 날 다시 생성 시 새 소식 위주).',
    '- insight(선교 인사이트): 오늘 동향이 온두라스 선교·현지 사역·기도에 주는 함의 2~4문장. 건설적·중립 톤(특정 정파 편들기 금지). ★기도 포인트는 여기 넣지 말고 prayer_points 로 분리한다.',
    '- prayer_points(기도 포인트): 위 인사이트에서 도출한 구체적 기도제목 1~2개를 짧은 문장 배열로. 앱에서 별도 박스로 표시된다.',
    '- ⚠ 경계: 이 브리핑 내용을 월간 편지·Facebook·포트폴리오 등 외부 발신물에 옮길 때는 기존 정치중립 규칙(정당·인물 거명 회피)을 다시 적용한다. 실명 기재는 이 내부 페이지에 한정.',
    '',
    '[result.json 형식]',
    '{',
    `  "news_date": "${today}",`,
    '  "sections": {',
    '    "politics": [{ "title": "한 줄 제목", "body": "2~4문장 요약", "source": "매체명", "url": "기사 원문 링크 https://…" }],',
    '    "economy":  [{ "title": "…", "body": "…", "source": "…", "url": "https://…" }],',
    '    "society":  [{ "title": "…", "body": "…", "source": "…", "url": "https://…" }],',
    '    "culture":  [{ "title": "…", "body": "…", "source": "…", "url": "https://…" }]',
    '  },',
    '  "highlights": [',
    '    { "tag": "San Pedro Sula", "title": "…", "body": "…", "source": "…", "url": "https://…" },',
    '    { "tag": "한인", "title": "…", "body": "…", "source": "…", "url": "https://…" }',
    '  ],',
    '  "insight": "오늘 동향의 선교적 함의 2~4문장(기도 포인트는 제외).",',
    '  "prayer_points": ["기도 포인트 1", "기도 포인트 2"]',
    '}',
    '',
    '═══════════════════════ 최근 저장된 헤드라인 (중복 회피용) ═══════════════════════',
    recentBlock,
  ].join('\n')

  process.stdout.write(guide + '\n')
  console.error(`[news-pull] ${today} · 최근 헤드라인 ${recentTitles.length}건 참고 → stdout`)
}

main().catch((e) => {
  console.error('[news-pull] 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
