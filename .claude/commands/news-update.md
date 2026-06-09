---
description: MFH 온두라스 동향 일일 브리핑 생성·저장 (pull → WebSearch → push)
allowed-tools: Bash, Read, Write, WebSearch
---

오늘 온두라스 주요 뉴스를 WebSearch 로 검색해 **정치/경제/사회/문화 4분야 + San Pedro Sula·한인 하이라이트 + 선교 인사이트**로 정리하고 Supabase(honduras_news)에 저장한다. 분석 주체는 Claude Code(구독·WebSearch) — 종량제 API·web_search server tool 을 쓰지 않아 추가 현금 비용 0.

## 절차

1. **작업지시서 받기** — 다음을 실행한다:
   `npx tsx scripts/news-pull.ts`
   stderr 한 줄 요약은 무시하고, **stdout 전체가 작업지시서**다(오늘 날짜 · 검색 가이드 · result.json 형식 · 최근 헤드라인).

2. **검색** — 작업지시서 [검색 가이드]대로 **WebSearch** 를 실행한다(표준 깊이 = 약 5~6회). 스페인어 현지 매체가 1차, 영어/한국어로 보강. San Pedro Sula·한인 검색은 반드시 포함.

3. **정리·작성** — 작업지시서 [정리 규칙]을 **그대로 충실히 따른다**:
   - **정당명·인물명은 사실대로 그대로 기재**한다(이 페이지는 내부 동향 파악용 — 편지·FB 의 정치중립 규칙과 정반대). 단 **사실·출처 기반만**, WebSearch 로 확인 안 된 내용·추측·날조는 금지(불확실하면 제외).
   - 분야별 2~3건, 각 항목 title(한국어 한 줄) + body(2~4문장 한국어) + source(매체/URL).
   - San Pedro Sula·한인 뉴스는 highlights 에 tag 로 한 번 더 강조.
   - 최근 저장된 헤드라인과 같은 사안은 새 전개가 있을 때만(반복 금지).
   - insight(선교 인사이트): 오늘 동향의 선교·사역·기도 함의 2~4문장 + 기도/관심 포인트 1~2개. 건설적·중립 톤(정파 편들기 금지).

4. **결과 저장 파일 쓰기** — 작업지시서의 `[result.json 형식]` 그대로 `insights-archive/_news/result.json` 에 Write 한다(폴더 없으면 만든다. gitignore).

5. **DB 저장** — 다음을 실행한다:
   `npx tsx scripts/news-push.ts`

6. **보고** — push 출력(날짜·분야별 건수·하이라이트 수)을 한국어로 1~2줄 요약한다.

## 주의

- 저장 귀속 user_id 는 `.env.local` 의 `MFH_USER_ID`. 누락 시 push 가 안내 후 멈춘다.
- 같은 날(news_date) 재실행은 **덮어쓰기**(하루 1행). 표시는 앱 `/honduras` 전용 페이지(멤버 읽기), 홈 최상단 카드.
- ⚠ **경계**: 이 브리핑의 실명·정치 내용을 월간 편지·Facebook·포트폴리오 등 **외부 발신물**에 옮길 때는 기존 정치중립 규칙(정당·인물 거명 회피)을 **다시 적용**한다. 실명 기재는 이 내부 페이지에 한정.
- Cowork(아이폰 원격)에서 `/news-update` 수동 호출, 또는 매일 06:00 자동 루틴(`honduras-news-0600`)이 같은 스킬을 실행.
