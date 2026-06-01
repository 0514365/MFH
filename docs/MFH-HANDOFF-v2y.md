# MFH 핸드오프 — v2-y (2026-06-01)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase·드롭박스·API키)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT` + `MFH-INSIGHTS-REDESIGN.md`. 직전 = `MFH-HANDOFF-v2x.md`.

---

## 0. 한 줄 요약

**Letter v3 + 인사이트 전면 재설정 완료.** ① Letter = "방향 제안 + 초안 개요"(웹검색으로 온두라스 뉴스 접목, 최근 인사이트 합성) ② 인사이트 **입력을 홈 "전체 분석" 한 곳으로 일원화**(수동·드롭박스·AI 전체생성), 개별 상세는 **보기 전용** ③ 분야 페이지(일지/프로젝트/할일) 상단 = **최신 인사이트 1개**, 전체 히스토리는 인사이트 페이지 **분야별 메뉴** ④ claude.ai 수동용 **지침+지식 파일** 정비.

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase
- **patch78 `clear-insights.sql` — ⚠️ 우진 콘솔 실행 필요(미확인).** `delete from insights` 전체 + `insight_sources.last_hash/last_count` 리셋. 실행 전엔 기존 인사이트가 남아 있음. 파일 `supabase/patch78-clear-insights.sql`.
- 스키마 변경 없음(insights.domain text 재사용). letters(patch62/67) 손 안 댐.

### API 키 (Vercel 환경변수)
- **`ANTHROPIC_API_KEY` 유무에 따라 AI 경로 활성**. 키 없으면 홈 "AI로 전체 생성" 비활성(503) → 수동·드롭박스만.
- **web search 실호출 미검증.** Letter 자동 생성 시 `web_search_20250305`(server tool) 사용 코드만 작성. 실제 동작·과금은 우진 환경에서 "AI로 전체 생성" 시 확인 필요. 안 되면 tool type/anthropic-version 조정.

### 드롭박스
- 동기화는 이제 **홈 전체 분석에서만**(개별 상세에서 제거). 1b 로직 그대로.

### 로컬/배포·git (이번 세션 push 완료)
- 커밋: `f66c824` Letter 렌즈 활성화 · `f8d5d6a` bundle 합류 · `5048ef3` Letter 재설계 · `290ed1d` 수동 문서 · `a23655f` UI 재배치 · `5345873` 지식 파일 · `7efb3b3` IA 재구조.
- 검증: 매 단계 `npx tsc --noEmit` / `npm run build` 통과 후 push.
- ※ 이 핸드오프(v2y) 자체는 아직 미커밋.

---

## 2. 이번 세션(v2-y) 한 일

**Letter v3 (Phase 1~):**
- `insightPrompt.ts`: `LENS_FOCUS/LENS_OUTPUT.letter` → "1부 방향 제안(2~3, ★) + 2부 3단 초안 개요(MFH #YYMM)". 온두라스는 뉴스 접목하되 정당·인물 거명 금지(중립). `buildBundleInstruction`을 `InsightDomain[]`로 확장(raw=DOMAIN_FOCUS, lens=LENS_FOCUS) + letter 종합 안내.
- `insightExport.ts`: `domainNeeds('letter')`=일지+프로젝트+할일, `InsightDigestRow`/`buildInsightDigest`(최근 인사이트를 letter 입력에 합성).
- `api/insights/route.ts`: letter면 최근 prayer/fruit/overall 인사이트 조회→합성, `web_search` tool, max_tokens 3000.
- `api/insights/export/route.ts`: bundle=7개 도메인, 개별 letter 내보내기에 인사이트 동봉.

**인사이트 IA 재구조:**
- `InsightsClient.tsx`: 홈 "전체 분석"에 **AI 전체 생성**(7개 순차) 추가. 카드 = 렌즈4 + Overall + **분야별 메뉴(journal/project/task)**. `LensDetail`을 `DomainInsightBody`(보기 전용: 집계+히스토리, 입력 제거)로 분리.
- `DomainInsightPanel.tsx` → **V3 접이식 + 최신 1개 읽기 전용**(접이식 헤더 항상 표시, 펼치면 최신 1개. 생성·내보내기 없음).
- `journal/projects/tasks page.tsx`: 패널 삽입 + hasApiKey 제거.

**수동(claude.ai) 자료:**
- `MFH-CLAUDE-PROJECT-INSTRUCTIONS.md`: 새 Letter·분야별·overall·양식·web search 반영. §1에 "지식 파일 업로드" 단계.
- `MFH-CLAUDE-PROJECT-KNOWLEDGE.md`(신규): 프로젝트 지식 업로드용 배경(단체·사역·분류7·가드레일·렌즈·편지·연주제).

### 의사결정 맥락
- **입력 일원화**: 내보내기/가져오기/동기화/AI = 홈 전체 분석만. 개별/분야 페이지는 보기. (우진 지시)
- Letter는 완성편지가 아니라 **방향+개요**(우진이 ★ 고른 뒤 "본문까지 써줘"로 발전).
- 온두라스 정치 검색 ↔ 3원칙① 충돌 → "검색하되 출력은 중립, 정당·인물 거명 금지" 가드레일.
- AI 전체 생성은 balance 제외(집계라 무료 계산).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | **실기기 검증** | patch78 콘솔 실행 → 분야 페이지 최신1 · 홈 AI 전체생성 · 분야별 메뉴 · Letter 방향+개요 확인 |
| B | **web search 확인/보정** | letter AI 생성 시 실호출. 안 되면 tool 스펙/버전 조정 |
| C | "편지에 담기" 실저장 | 현재 prayer/fruit 카드 UI 플래그만 → letter 재료 실제 연결 |
| D | letters(PDF) 연계 | letter 초안 → 포트폴리오 편지 PDF (Step B-2) |
| E | 캘린더 ICS / 번역 (v3 잔여) | CLAUDE.md 빌드단계 v3 |
| F | 이월(v2t~) | 영상 5건 / 중보 스팸 / 방문자 카운팅 / service_role 키 회수 등 |

## 4. 열린 결정사항

- [ ] web search tool 실동작(미검증) — 실패 시 대안(수동 검색 or 스펙 변경).
- [ ] AI 전체 생성 7개 순차 = 수 분·종량제. 비용/속도 수용 여부, 혹은 일부 렌즈만 옵션.
- [ ] 분야 페이지 "최신 1개"에 별점/링크 추가 여부(현재 순수 읽기).
- [ ] "편지에 담기" 실저장(C) → Letter 입력 명시 연결.
- [ ] (이월) import API 에러 상세 노출 / `MFH-INSIGHTS-REDESIGN §5` 표기 정정.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2y.md` 기준. **실기기 검증 + web search 확인**부터. (그다음 '편지에 담기' 실저장 또는 letters PDF 연계.)"
