# MFH 핸드오프 — v2-u (2026-05-31)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT.md` + `MFH-INSIGHTS-REDESIGN.md`. 직전 = `MFH-HANDOFF-v2t.md`.

---

## 0. 한 줄 요약

**인사이트 전면 개정 Phase 1 구현·배포.** 데이터 출처 4탭 → 목적 렌즈(Prayer/Balance/Fruit/Letter) 홈 + 범용 렌즈 상세(V2 재작성). **수동 회수 강화가 핵심**: `전체 분석 내보내기`(?bundle=1, 전체 데이터+여러 렌즈 지침+회수 양식) → claude.ai 프로젝트에서 양식 분석 → `결과 가져오기`(/api/insights/import) → **LENS 블록별 렌즈 자동 분배 저장**. Supabase **patch76**(insights.domain CHECK 렌즈 허용) 실행. insights insert **user_id 누락 버그픽스**. Claude 프로젝트 지침 문서 신설. 회수 워크플로 실기기 검증 성공.

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase — 이번 세션 실행한 SQL (콘솔 실행 완료)
- **patch76** `insights.domain` CHECK 재정의: 기존 제약(`insights_domain_check`)이 레거시 4종(journal/project/task/overall)만 허용 → 렌즈 insert 가 위반으로 실패하던 것을, **8종 허용**(+prayer/balance/fruit/letter)으로 drop 후 재생성. 파일 `supabase/patch76-insights-domain-lenses.sql`.

### Supabase 제약/정책 메모 (⭐ 다음 세션 주의)
- **`insights.domain` 은 text + CHECK(8종) 존재.** → `MFH-INSIGHTS-REDESIGN.md §5` 의 "domain CHECK 없음" 기술은 **오류였음**(실제 DB엔 CHECK 있었음). 새 domain 값 추가 시 patch 필요.
- **`insights` RLS insert 정책(patch73)** = `with check (auth.uid() = user_id and is_member(auth.uid()))`. → insert 시 **user_id 를 반드시 명시**해야 통과(테이블에 default auth.uid() 없음). 이번에 import/manual/route 세 곳 모두 `user_id: user.id` 추가로 픽스.
- 회수 테스트로 김우진 소유 `insights` 행 생성됨(prayer·fruit·overall, model='manual').

### 권한/멤버 모델 (v2t 그대로 — 변동 없음)
- app_members 2행(김우진=포트폴리오 소유자 / 서진아). insights 는 멤버 읽기 공유 / 본인 쓰기. 인사이트 API 는 user_id 필터 없이 RLS 의존(두 사람 데이터 종합).

### 로컬/배포
- Node v24. `npx tsc --noEmit` + `npm run build` 통과 후 push 습관. main push → Vercel auto-build.
- 이번 세션 커밋: `e1030fc`(렌즈 구조+파서) · `a2271eb`(번들 내보내기) · `0944606`(user_id 픽스) · `70fc7fa`(domain CHECK 허용+파서 견고화).

---

## 2. 이번 세션(v2-u) 한 일

**인사이트 재디자인 — Phase 1a + 전체 번들 (배포 완료)**
- `lib/insightExport.ts`: `RawDomain`/`LensKey`/`InsightDomain` 합집합, `LENS_LABEL`·`domainNeeds`·`isValidDomain` 헬퍼.
- `lib/insightPrompt.ts`: `LENS_FOCUS`·`LENS_OUTPUT`(4렌즈, 3원칙 내장), `buildSystemPrompt` 렌즈 분기, `buildBundleInstruction`(여러 렌즈 한 지침).
- `lib/insightImport.ts`(신규): 회수 양식 `IMPORT_FORMAT_GUIDE` + `parseInsightBundle`(멀티렌즈 분배, `---` 누락 시 헤더 줄 제거로 견고화).
- API: `/api/insights/import`(신규, 분배 insert) + route/export/manual 렌즈 키 허용 + export `?bundle=1`(전체 데이터+번들 지침).
- `app/insights/InsightsClient.tsx` → **V2 재작성**: 렌즈 홈(연주제 strip + 전체 분석 패널 + 렌즈카드4 + Raw 접이식) + 범용 `LensDetail` + 공용 `ImportPanel` + `InsightCard`(편지에담기 = UI 플래그).
- `app/insights/page.tsx`: year_theme prefetch(strip).
- **버그픽스**: insights insert `user_id: user.id`(3 route) + patch76(domain CHECK).
- **문서 신설**: `docs/MFH-CLAUDE-PROJECT-INSTRUCTIONS.md` — claude.ai 프로젝트 지침(복붙용 + 양식 규칙 + 사용법).

### 의사결정 맥락
- 우진은 **API보다 수동(Max 정액) 회수를 주력**으로 사용. 그래서 양식 파서 + 전체 번들이 핵심. 비용 0.
- **전체 한 번 내보내기/분석/가져오기** > 렌즈별 개별(우진 제안). 번들에 담는 렌즈 = prayer + fruit(balance=앱 집계 예정, letter=v3).
- 기간 = 7/30/90 유지. 렌즈 키 = domain text 재사용(단 CHECK는 patch 필요했음).
- "궁극적 자동(비용 0)"은 가능 — 준자동(드롭박스 링크 폴링) → 완전자동(Dropbox webhook / Google Apps Script). 단계적으로, 양식 검증 후.

### 교훈
- **insights insert = user_id 명시 필수**(RLS auth.uid()=user_id, default 없음).
- **insights.domain CHECK 존재**(문서와 달랐음) — 새 값은 patch 동반.
- 회수 양식 헤더(LENS/PERIOD/RATING)는 `---` **위**. Claude가 `---` 빠뜨려도 파서가 헤더 줄 제거로 흡수(견고화 완료).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | **Phase 2 — Balance** | `buildCategoryBreakdown` 집계 막대(무료). 카테고리는 **동적**(시드 7 + DB categories 머지, `useCategories`). 분류→색 매핑 필요 |
| B | **Phase 3 — Fruit** | thanks/응답 타임라인 표현 |
| C | **1b — 드롭박스 준자동** | `insight_sources` 테이블(user_id·dropbox_url·last_*) SQL + 링크 등록 UI + 진입 시 폴링 fetch |
| D | 완전 자동(후속) | Dropbox webhook 또는 Google Apps Script → Supabase(비용 0, 복잡·보안). 양식 검증 후 |
| E | Letter v3 | letters 연계, 3단 편지 초안 |
| F | 이월(v2t) | 영상 5건 등록 / 중보기도 스팸강화 / 방문자 카운팅 등 |

## 4. 열린 결정사항

- [ ] Balance AI 권면 — 집계만(무료) vs 버튼 선택 AI.
- [ ] "편지에 담기" 실제 동작(현재 UI 플래그만) → v3.
- [ ] 완전 자동 회수 트리거 — Dropbox webhook vs Google Apps Script(1b 준자동 검증 후).
- [ ] `MFH-INSIGHTS-REDESIGN.md §5` 본문의 "domain CHECK 없음" 표기 정정(실제 CHECK 존재) — 문서 갱신 여부.
- [ ] import API 에러 메시지에 DB 상세 노출 중(`(error.message)`) — 디버깅용, 안정화 후 제거 검토.
- [ ] v2t 이월: service_role 키 회수 / 카카오 OG 캐시 / 중보기도 스팸 / 남의 할일 토글 가드 / 캘린더 옵션 등.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2u.md` 기준. 인사이트 **Phase 2(Balance 집계)** / Phase 3(Fruit) / 1b(드롭박스 준자동) 중에서."
