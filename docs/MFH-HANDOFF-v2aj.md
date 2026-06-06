# MFH 핸드오프 v2aj

> 이전: `v2ai`(인사이트 개편 후속·미결 우선순위). 이번: **Phase 4a 비서(L2 능동제안) 완료·배포** + 인사이트 카드 UX 3건 + LENS 파싱 버그 수정.

---

## 현재 위치 (한 줄)

Phase 4 비서의 **4a(L2 능동 제안) 완료·배포**(커밋 `8416737`). 프로젝트/할 일 페이지에 "비서" 카드 + `/assistant-update` 슬래시. 다음은 **4b(L1 무료 규칙 신호)** 또는 Phase 5.

---

## 이번 세션 변경

### Phase 4a — 비서(L2 능동 제안)

| 항목 | 내용 |
|---|---|
| 도메인 | insights에 `project_assist`·`task_assist` 추가(LensKey). **patch83**(domain CHECK +2, 우진 실행 완료) |
| 지침 | `LENS_FOCUS`/`LENS_OUTPUT`에 비서 관점·출력형식(정체·마감·다음행동 **3~5개**, **간결 실무형**, "오늘 딱 하나"/"이번 주 우선") |
| pull | `insight-pull.ts --domains a,b` 필터 추가. letter digest는 letter 포함 시에만 조회. **비서 전용 스크립트 0개**(insight-pull/push 재사용) |
| 카드 | `DomainInsightPanel` 재사용(빈문구만 비서 분기). tasks/projects page 상단에 `domain="*_assist"` 패널(회고 인사이트 패널과 나란히) |
| 슬래시 | `/assistant-update`(WebSearch 미사용=비용0, insight-update와 파일·도메인 분리). 스킬 자동등록 확인 |
| E2E | 비서 2도메인 생성·저장(우진 6/6 데이터). 정치중립·실명자제·기록근거 가드레일 준수 |

### 버그 수정 — LENS 파싱 (E2E 중 발견·복구)

- `insightImport.ts` `LENS_RE`: `[A-Za-z]+` → **`[A-Za-z_]+`**. 밑줄 미허용으로 `project_assist`→`project`로 잘려 **project/task 회고 인사이트 content를 덮었던** 사고.
- **복구**: 아카이브 jsonl 직전 회고로 project/task 복원 + 비서를 올바른 `*_assist` 도메인에 재저장(4/4). 별점·메모·in_letter는 upsert payload 제외라 애초에 무사.
- **교훈**: 새 LensKey 추가 시 `insightImport`는 이제 범용(정규식이 밑줄 허용). 도메인 추가 체크리스트에 insightImport **추가 불필요**.

### 인사이트 카드 UX 3건 (우진 요청)

| # | 변경 | 파일 |
|---|---|---|
| 1 | 별점 **해제** — 같은 별 다시 누르면 null. API는 `rating:null` 허용(0은 400) | `InsightsClient`(InsightCard·setRating·onRate 타입 `number\|null`) |
| 2 | 보관 **토글** — "보관됨" 다시 누르면 취소. `DELETE /api/insights/scraps?source_id=` 신규 | `InsightsClient`(unscrap·unmarkScrapped 4단계 체인), `scraps/route.ts` |
| 3 | 보관함 **시각** — `scrapped_at` 날짜+시:분(로컬·hydration 안전, mounted 패턴) | `SavedClient` |

---

## 우진 액션

- ✅ patch83 Supabase 실행 완료.
- ⏳ **배포(Vercel) 후 앱 확인**: ① 프로젝트/할 일 페이지 "비서" 카드 ② 인사이트 카드 별점 해제 ③ 보관 토글(보관↔취소) ④ 보관함 카드 날짜+시:분.

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 1 | **Phase 4b — L1 무료 규칙 신호** — 마감임박·정체·고중요도 미완을 데이터만으로 계산해 비서 카드 상단 칩으로(AI·비용 0) | 대기 |
| 2 | Phase 5 — 할 일 뱃지(앱 아이콘, SW+Web Push 신규) | 대기(분리) |
| 최하위 | 선교편지 5-에이전트 팀에 피드백 분석 반영 | 보류(우진 지시: 제일 마지막) |

---

## 운영 메모

- 슬래시 3종: `/insight-update`(7도메인·매일 루틴) · `/caption-update`(캡션·수동) · **`/assistant-update`(비서·수동, 루틴 등록은 우진 선택)**.
- 비서 생성도 **구독(Claude Code)만** — 종량제 0, WebSearch 미사용.
- push(프로덕션 DB 쓰기)는 **auto 모드가 명시 승인 요구** — 정상. 우진 승인 후 진행하는 패턴.
- 비서 입력 기본 90일(일지 맥락). 프로젝트·할 일은 기간 무관 전체 조회(미래 마감 포함).

---

## 관련 커밋

- `8416737` Phase 4a 비서 + 인사이트 카드 UX + LENS 파싱 수정
- 이 핸드오프 `v2aj` — commit 대기

*작성: 2026-06-06 세션 (Phase 4a 비서 + 카드 UX).*
