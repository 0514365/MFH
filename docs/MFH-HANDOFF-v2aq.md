# MFH 핸드오프 v2aq

> 이전: `v2ap`(선교편지 팀 피드백 신호 반영). 이번: **할 일·인사이트 UX 개선 7건**(우진 개선요청 일괄).

---

## 현재 위치 (한 줄)

**To-Do = 키워드 검색·복제·반복등록 추가, Insights = 보관 오표시 버그 수정 + 메뉴 개수→업데이트시각 + 2열·데스크탑 폭.** 스키마 변경 없음(기존 테이블 재사용). tsc·build exit 0.

---

## 이번 세션 변경

### A. 할 일 (3건)

| # | 요청 | 구현 | 파일 |
|---|---|---|---|
| 1 | 키워드 검색 | `TaskFilter`에 `q` 추가 → 제목·설명·장소 부분일치(공백분리 AND, 대소문자 무시). 컨트롤바 상단에 검색창(×지우기). URL `?q=`·세션 영속·초기화에 포함 | `lib/taskFilter.ts`(V4), `app/tasks/TasksListClient.tsx`(V8), `app/tasks/[id]/page.tsx`(nav select에 title·description·place_name 추가 → 검색-인지 prev/next 일치) |
| 2 | 복제 | 상세/요약 패널의 **복제** → `/tasks/new?from=<id>`. 새 폼이 원본 프리필(제목+`(사본)`, 완료해제, done상태→upcoming). DB 선기록 없이 사용자가 수정 후 저장. 비소유자도 복제 가능(저장 귀속=현재 사용자) | `app/tasks/new/page.tsx`, `app/tasks/[id]/page.tsx`, `TasksListClient.tsx`(요약 패널 복제 버튼) |
| 3 | 반복 등록 | 새 폼에 **반복 구역**(주기 매일/매주/매월 + 종료일 필수). 저장 시 마감일(첫날)~종료일 발생일을 **한 번에 일괄 insert**(상한 366, 무한방지). confirm으로 생성개수 확인. 개별 독립 행(시리즈 테이블 없음). 매월은 같은 일 유지·말일 클램프 | `app/tasks/TaskForm.tsx`(V3, 순수 헬퍼 `nextDate`/`buildOccurrences`) |

### B. 인사이트 (4건)

| # | 요청 | 구현 | 파일 |
|---|---|---|---|
| 7 | "보관됨" 오표시 **(버그)** | **원인**: `insights`는 `(user_id,domain)` unique라 루틴 upsert가 **도메인별 id를 영구 고정**(내용만 교체). "보관됨"을 `source_id==현재 insight id`로 판정 → 한 번 보관하면 이후 새 내용도 영구 "보관됨". **해결**: 판정·중복·해제를 **id가 아닌 내용(content) 기준**으로 전환(`scrapKey(domain,content)`). 재생성돼 내용이 바뀌면 다시 "보관" 가능, 보관본은 버전별로 보관함에 누적 | `lib/insightExport.ts`(`scrapKey`), `app/insights/page.tsx`(scrappedKeys), `app/api/insights/scraps/route.ts`(POST 중복=content, DELETE=source_id+content body), `InsightsClient.tsx`(V4) |
| 4 | 개수 → 업데이트시각 | 홈 카드 "N개" 제거, 그 도메인 `created_at`을 "업데이트 MM-DD HH:mm"로(마운트 후 로컬, hydration 안전). `countOf` 제거 | `InsightsClient.tsx` |
| 5·6 | 2열 + 데스크탑 폭 | 메뉴를 **2열 그리드**(모바일·데스크탑 공통). 컨테이너 `min-[740px]:max-w-5xl`(할일 목록과 통일). 인사이트 읽기(상세)는 `max-w-3xl`로 가독성 유지 | `app/insights/page.tsx`, `InsightsClient.tsx` |

---

## 설계 결정

- **복제 = 프리필 후 저장**(즉시 사본생성 아님): 취소해도 DB에 잔여 없음, "복제하여 약간 수정" 취지에 부합.
- **반복 = 독립 행 일괄생성**(시리즈 링크 없음): "한 번에 등록" 요청 그대로. 각 건은 일반 할 일처럼 개별 편집/완료.
- **보관 판정 content 기준**: insights id 고정 구조의 근본 해결. `insight_scraps`는 영구 복사본이므로 같은 도메인 여러 버전 보관 가능(의도).
- **데스크탑 폭 `max-w-5xl`**: 우진은 "전체폭" 요청했으나 앱 통일성(할일·목록 동일) 우선. 더 넓히려면 `max-w-5xl`→`max-w-7xl`/`max-w-none`.

---

## 우진 액션 (배포 후 실기기 확인)

- **할일**: 검색창에 키워드 입력 → 즉시 필터. 상세/요약의 **복제** → 새 폼 프리필 확인. 새 할일에서 **반복**(예: 매주+종료일) → confirm 개수 → 목록에 여러 건 생성 확인.
- **인사이트**: 한 번도 보관 안 한 카드가 "보관"(보관됨 아님)으로 보이는지. "보관" 눌러 보관함 적재 → 같은 카드 "보관됨" → 해제 토글. 메뉴 우측 **업데이트 시각** 표기, 모바일·데스크탑 **2열**.

> 검증: 로컬 `tsc --noEmit`·`npm run build` 모두 exit 0. 런타임은 Supabase 인증·실데이터 의존이라 배포 URL에서 확인.

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 백로그 | postcss moderate 2건(Next 내부) — 실질위험 0 | 수용 |
| 백로그 | Next 16 업그레이드 | 보류 |
| 옵션 | 데스크탑 인사이트 진짜 전체폭 원하면 폭 상향 | 대기 |
| 옵션 | 반복 시리즈 일괄수정/삭제(현재 개별) | 미정 |

---

## 관련 커밋(예정)

- `feat: task keyword search + duplicate + recurring tasks` — A(할일 3)
- `fix: insight scrap state by content; insights 2-col + last-updated meta` — B(인사이트 4)
- `docs: handoff v2aq — tasks/insights UX improvements`

*작성: 2026-06-07 세션 (할일·인사이트 UX 7개선).*
