# MFH 핸드오프 — v2-z (2026-06-01)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase·드롭박스·API키)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT` + `MFH-INSIGHTS-REDESIGN.md` + `MFH-PORTFOLIO-DESIGN.rtfd`. 직전 = `MFH-HANDOFF-v2y.md`.

---

## 0. 한 줄 요약

**인사이트↔편지 연계 마감 + web search 비용 차단.** ① letter 를 홈 "AI 전체 생성"에서 **제외**(web_search 자동 호출 0) ② **"편지에 담기"(in_letter) 실저장** → letter 생성·내보내기 입력이 "담은 것" 우선(없으면 최근 자동) ③ 포트폴리오 `LetterEditor` 요약 기도문에 **"인사이트 불러오기"**(prayer 우선). 3커밋 push 완료, **우진 실기기 검증 ①~⑤ 성공**.

---

## 1. repo 밖 상태 (코드로 추적 안 됨)

### Supabase
- **patch79-insight-in-letter.sql — ✅ 우진 콘솔 실행 완료.** `insights.in_letter boolean default false` 추가. 인사이트 페이지 정상 로드 확인됨.
- patch78-clear-insights.sql — **여전히 미실행(선택)**. 기존 인사이트 유지 중. 초기화 원할 때만.
- 스키마: in_letter 외 변경 없음. letters(patch62/67)는 **읽기만**(손 안 댐).

### API 키 (Vercel 환경변수)
- `ANTHROPIC_API_KEY`: **로컬 `.env.local` 비어 있음(length 0)** — 로컬 AI 경로/ web search 직접 검증 불가. Vercel 환경변수 유무에 따라 "AI로 전체 생성"(6개) 활성.
- **web_search: letter 제외로 자동 호출 경로 제거됨.** `route.ts` 의 `web_search_20250305` tool 코드는 **죽은 경로로 보존**(letter domain 직접 POST 시에만 동작) → **실동작 미검증 그대로, 당분간 불필요.**

### 드롭박스 / 배포·git
- 동기화 1b 그대로(홈 전체 분석에서만).
- 커밋(이번 세션, **push 완료**): `9630a3a` letter 제외 · `b06898d` in_letter(C) · `0f3c931` letter summary 연계(D).
- 검증: 매 단계 `npx tsc --noEmit` / `npm run build` 통과 후 push. 우진 배포본 실기기 검증 ①~⑤ 성공.
- ※ 이 핸드오프(v2z) 자체는 아직 미커밋.

---

## 2. 이번 세션(v2-z) 한 일

**letter 전체생성 제외:**
- `InsightsClient.genAll` targets 7→6(letter 제거). 안내문구·주석 갱신. → web_search 자동 호출 0.

**C — "편지에 담기" 실저장:**
- `patch79`: `insights.in_letter` boolean.
- `api/insights/[id]` PATCH: in_letter 토글 수용. `page.tsx` SSR·`route.ts` insert select 에 in_letter 포함.
- `InsightsClient`: `InsightRow+in_letter`, `toggleLetter()`(즉시 PATCH), 카드 로컬state→`row.in_letter`, 노출 **prayer/fruit/overall**.
- `route.ts`(생성)·`export/route.ts`(내보내기): letter 입력 = **in_letter=true 우선**(limit 12), 없으면 최근 prayer/fruit/overall fallback(limit 6).

**D — 인사이트→요약 기도문:**
- `LetterEditor` **V4**: 요약 기도문(새 폼+인라인 편집) 옆 **"인사이트 불러오기"**. 최근 인사이트(prayer/fruit/letter/overall, **prayer 상단**, 라벨·날짜·미리보기·"편지에 담김" 배지) 선택 → summary 에 삽입(append). 클라이언트 supabase **읽기 전용**. **스키마/API 변경 0.**

### 의사결정 맥락
- **web search 비용 우려**(검색 결과 input 토큰 + 검색 tool 과금) → letter 를 "AI 전체 생성"에서 제외(A안). letter 는 수동/가져오기로 유지. (우진 지시)
- **letter 단독 AI 생성 UI 는 두지 않음**(현재 letter 의 AI 생성 경로 없음). `route.ts` web_search 는 보존(나중 재사용).
- **포트폴리오 편지 = PDF 외부제작 방침 유지** → 텍스트 접점은 `summary`(요약 기도문)뿐. PDF 자동생성(옵션 B)은 방침상 **안 함**.
- **in_letter 파이프라인**: 편지에 담기(C) → prayer/letter 인사이트 → 요약 기도문(D) → 공개 "최신 선교편지" 우측.

---

## 3. 다음 작업 후보

> ※ 정정: **캘린더 ICS 피드는 이미 완료**(patch71 v2s 구현·실기기 검증 + patch72 v2t "할 일만" 반환). v3 의 "캘린더 ICS" 항목은 done. 아래는 그 정정 반영.

| # | 후보 | 비고 |
|---|---|---|
| A | **번역 (v3 잔여)** | 사양 미정 — 범위 결정 먼저(① 편지 번역 / ② 포트폴리오 공개페이지 다국어 / ③ 앱 UI 다국어). 편지 번역(Anthropic API)이 최소 출발 |
| B | **캘린더 디자인 개선** | v2s 후보 A 이월(미착수) — 상단 컨트롤 한 줄 정리 / 월간 셀 가독성 / 막대·카드 스타일 / 마룬 톤. `app/calendar/CalendarView.tsx` |
| C | **F 이월** | 영상 5건 YouTube 등록(URL 주면 일괄) / 중보 스팸 강화(rate limit·승인제) / 방문자 카운팅(방식 미정) / **service_role 키 회수**(import·ICS 끝나 미사용, Reset 권장) |
| D | letter 단독 AI 생성(선택) | 다시 필요하면 **web_search 실동작 검증부터**(미검증) |
| E | patch78 clear-insights(선택) | 인사이트 초기화 원할 때만 |

## 4. 열린 결정사항

- [ ] web search tool 실동작(미검증) — **letter 단독생성 부활 시에만 필요**. 실패 시 tool 스펙/버전 조정.
- [ ] letter 를 AI 로 다시 만들지(단독 버튼) — 현재 수동/가져오기만.
- [ ] D 요약 기도문 연계: 어느 인사이트가 실제로 가장 유용한지 사용 후 피드백(현재 prayer 상단 정렬).
- [ ] (이월) import API 에러 상세 노출 / `MFH-INSIGHTS-REDESIGN §5` 표기 정정 / service_role 키 회수.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2z.md` 기준. 인사이트↔편지 연계(C/D) 완료·검증됨. (캘린더 ICS 는 이미 완료.) 이번엔 **번역**(범위 정하기) 또는 **캘린더 디자인 개선**, 또는 **이월 F**(영상 5건 / service_role 키 회수 등) 가죠."
