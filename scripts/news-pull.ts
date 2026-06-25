// MFH-NEWS-PULL-V2
// 온두라스 동향 일일 브리핑 "작업지시서"(Markdown)를 stdout 출력.
//   · 앱 데이터가 아니라 Claude Code 가 WebSearch 로 찾아 정리할 대상·규칙·형식을 담는다.
//   · 최근 3일 저장분의 헤드라인을 함께 넘겨 "같은 뉴스 반복"을 피한다.
//   · V2: 신뢰출처 티어(allowed_domains)·분야별 최신성 차등·발행일(published_at)·안전 레이어 도입.
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
    'San Pedro Sula 지역·온두라스 한인(한국인)·안전(치안·재난) 관련은 따로 강조하며, 끝에 선교 인사이트를 덧붙인다.',
    '',
    '※ 이 페이지의 존재 이유 = 매일 아침 "그날의 최신" 동향 확인. 지난 소식은 /honduras/archive 에 자동 보관된다.',
    '   → ★오래된 기사로 칸을 채우지 말 것(최신성 우선). 단 정치·경제·사회·문화 4분야는 매일 새 소식이 있는 "당일 필수" 분야 — 통째로 비우지 말고, 광범위 검색 후에도 정말 없을 때만 빈 배열로 둔다(앱이 "특이사항 없음" 표시). San Pedro Sula·한인 하이라이트는 새 소식 없으면 비우는 것이 정답이다(안전은 아래 ② 규칙).',
    '',
    '[절차]',
    '1. 아래 [검색 가이드]대로 WebSearch 를 실행한다(표준 깊이 = 검색 약 7~8회).',
    '   ★ WebSearch 호출 시 allowed_domains 파라미터로 아래 [신뢰 출처 티어] 도메인을 지정해 최신·신뢰 결과로 좁힌다.',
    '   ★ 각 결과의 발행일(게시 날짜)을 반드시 확인한다. 스니펫/본문/URL 에서 추정하되, 끝내 불확실하면 그 기사는 제외한다.',
    '2. 결과를 [정리 규칙]에 맞춰 4섹션 + 하이라이트(San Pedro Sula·한인·안전) + 선교 인사이트로 작성한다.',
    '3. insights-archive/_news/result.json 에 [result.json 형식]으로 Write 한다(폴더 없으면 만든다).',
    '4. npx tsx scripts/news-push.ts 를 실행해 DB(honduras_news)에 저장한다.',
    '5. 저장 결과(날짜·분야별 건수·하이라이트 수)를 한국어 1~2줄로 보고한다.',
    '',
    '[신뢰 출처 티어] — WebSearch allowed_domains 로 활용. 현지 실시간(스페인어)이 1차, 영문으로 교차·안전 보강.',
    '- T1 현지 실시간(정치·경제·사회 1차): proceso.hn, laprensa.hn, tiempo.hn, hch.tv, elheraldo.hn, latribuna.hn, elpais.hn',
    '- T2 심층·탐사(부패·인권): contracorriente.red, criterio.hn',
    '- 영문 교차검증(현지매체 편향 보정): elfaro.net, insightcrime.org, ticotimes.net, aljazeera.com, reuters.com, apnews.com',
    '- 영문 안전 레이어(치안·재난·여행경보): osac.gov, hn.usembassy.gov, travel.state.gov, reliefweb.int',
    '- 한인/한국 공식: overseas.mofa.go.kr (주온두라스 대한민국 대사관)',
    '  ※ 현지 3대 일간지(laprensa·elheraldo=OPSA 소유, latribuna=정치엘리트 소유)는 편향이 있으니 교차확인된 사안을 우선한다.',
    '',
    '[검색 가이드] — 스페인어가 1차, 영어로 교차·안전 보강. 쿼리에 hoy/날짜를 넣어 최신을 노린다.',
    `- 정치(politics) ★당일필수: "Honduras política hoy ${today}" 의회·정부·선거·정책. 최근 48시간 내.`,
    '- 경제(economy) ★당일필수: "Honduras economía hoy" 환율·물가·고용·투자·송금(remesas). 최근 48시간 내.',
    '- 사회(society) ★당일필수: "Honduras sucesos seguridad hoy" 치안·사건·보건·교육·이민. 최근 48시간 내.',
    '- 문화(culture) ★당일필수: "Honduras cultura noticias hoy" 종교·축제·스포츠·교회·선교. 최근 48시간 내.',
    '- 영문 교차 1회: "Honduras news today" (insightcrime/elfaro/reuters 등) — 위 3분야 큰 사안 교차확인.',
    '- ★San Pedro Sula: "San Pedro Sula noticias hoy" (laprensa.hn/sanpedro, elpais.hn). 최근 7일 내 새 소식만 highlights.',
    '- ★한인: "coreanos Honduras" / "한인 온두라스" + 대사관(overseas.mofa.go.kr) 공지. 최근 14일 내 새 소식만 highlights.',
    '- ★안전(safety): ① OSAC/US Embassy/ReliefWeb 의 "신규·갱신된" 여행경보·치안경보·기상/재난 alert 가 있으면 highlights(tag "안전")에 넣는다(상시 동일 경보의 단순 반복은 제외). ② 위 공식 경보가 없고 한인 새 소식도 없으면, 그날 사회면 치안 사건 중 선교사 안전에 직결되는 핵심 1건을 tag "안전" 으로 승격한다(한인 칸의 대체물 — 빈 하이라이트 방지).',
    '',
    '[정리 규칙 — 반드시 준수]',
    '- ★최신성 차등(이 페이지의 핵심):',
    '   · 정치·경제·사회·문화 4분야 = "그날의 최신"을 반영하는 ★당일 필수 분야다. 발행일 최근 48시간 이내 소식만 넣고, 그보다 오래된 기사는 넣지 않는다(이미 지난 동향에 보관됨). 4분야는 매일 새 소식이 있으니 통째로 비는 것은 비정상 — 비었다면 검색 부족을 의심하고 더 찾는다. 광범위 검색 후에도 정말 없을 때만 빈 배열로 두며, 앱이 "특이사항 없음" 으로 표시한다(가짜 항목·오래된 기사로 채우지 말 것).',
    '   · San Pedro Sula·한인·안전 = ★새 소식이 없으면 비운다(highlights 에서 제외). 오래된 기사로 억지로 채우지 말 것. 한인은 본래 소식 빈도가 매우 낮다(현지 한인 약 280명, 한인회 휴면) — 없는 게 정상이며, 이때는 위 안전(safety)② 로 그날 치안 핵심을 대신 올린다.',
    '- ★발행일 표기: 각 항목에 published_at("YYYY-MM-DD", 기사 게시일)을 넣는다. 끝내 확인 불가하면 "" (빈 문자열). 이 값으로 앱이 최신성을 표시한다.',
    '- ★교차확인 우선: 여러 언론이 공통으로 다루는 사안을 단독 보도보다 앞세운다.',
    '- 분야별 2~3건. ★정치·경제·사회·문화 4분야는 필수 — 통째 누락·생략 금지(정말 새 소식이 없을 때만 빈 배열, 앱이 "특이사항 없음" 표시). 각 항목: title(한국어 한 줄) · body(2~4문장 한국어) · source(매체명) · url(기사 원문 https://…) · published_at("YYYY-MM-DD"). ★url 은 앱에서 출처 클릭에 쓰이니 가능하면 반드시 채운다.',
    '- ★이 페이지는 내부 동향 파악용 → 정당명·인물명을 사실대로 그대로 기재(편지·FB 의 정치중립과 정반대 — 여기서는 실명 OK).',
    '- ★단 사실·출처 기반만. WebSearch 로 확인 안 된 내용·추측·과장·날조 금지. 불확실하면 제외.',
    '- highlights: San Pedro Sula·한인·안전 소식을 tag 로 구분해 넣는다. tag 값 = "San Pedro Sula" | "한인" | "안전". 새 소식이 하나도 없으면 빈 배열 [].',
    '- 아래 [최근 저장된 헤드라인]과 똑같은 단순 반복만 피한다. 같은 사안의 새 전개·추가 소식은 가능(같은 날 재생성 시 새 소식 위주).',
    '- insight(선교 인사이트): 오늘 동향이 온두라스 선교·사역·기도에 주는 함의 2~4문장. 건설적·중립 톤(정파 편들기 금지). ★기도 포인트는 prayer_points 로 분리.',
    '- prayer_points(기도 포인트): 인사이트에서 도출한 구체 기도제목 1~2개를 짧은 문장 배열로. 앱에서 별도 박스로 표시.',
    '- ⚠ 경계: 이 브리핑의 실명·정치 내용을 월간 편지·Facebook·포트폴리오 등 외부 발신물에 옮길 때는 정치중립 규칙(정당·인물 거명 회피)을 다시 적용한다. 실명은 이 내부 페이지 한정.',
    '',
    '[result.json 형식]',
    '{',
    `  "news_date": "${today}",`,
    '  "sections": {',
    '    "politics": [{ "title": "한 줄 제목", "body": "2~4문장 요약", "source": "매체명", "url": "https://…", "published_at": "YYYY-MM-DD" }],',
    '    "economy":  [{ "title": "…", "body": "…", "source": "…", "url": "https://…", "published_at": "YYYY-MM-DD" }],',
    '    "society":  [{ "title": "…", "body": "…", "source": "…", "url": "https://…", "published_at": "YYYY-MM-DD" }],',
    '    "culture":  [{ "title": "…", "body": "…", "source": "…", "url": "https://…", "published_at": "YYYY-MM-DD" }]',
    '  },',
    '  "highlights": [',
    '    { "tag": "San Pedro Sula", "title": "…", "body": "…", "source": "…", "url": "https://…", "published_at": "YYYY-MM-DD" },',
    '    { "tag": "한인", "title": "…", "body": "…", "source": "…", "url": "https://…", "published_at": "YYYY-MM-DD" },',
    '    { "tag": "안전", "title": "…", "body": "…", "source": "…", "url": "https://…", "published_at": "YYYY-MM-DD" }',
    '  ],',
    '  "insight": "오늘 동향의 선교적 함의 2~4문장(기도 포인트는 제외).",',
    '  "prayer_points": ["기도 포인트 1", "기도 포인트 2"]',
    '}',
    '※ highlights 는 새 소식이 있는 tag 만 넣는다(San Pedro Sula·한인·안전 각각 선택). 단 공식 안전경보·한인 새 소식이 모두 없으면 그날 치안 핵심 1건을 tag "안전" 으로 올린다(안전② 규칙). 정말 아무 소식도 없을 때만 빈 배열 [].',
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
