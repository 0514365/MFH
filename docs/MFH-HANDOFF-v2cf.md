# MFH 핸드오프 v2cf (세션 종료)

> 이전: `v2ce`(노션 회계 구축 — 후원금 라인 SoT 이전). 이번 세션: **앱 A방향 동기화 완료**(헌금입력 비활성 + 노션 헌금합계 읽기 + no-store 즉시반영) + **후원자 UI 1단계**(목록 총액 삭제·상세 섹션 재배치). 앱 `3.2.1` 유지(회계 완성=2단계까지 시 3.3.0).

---

## 현재 위치 (한 줄)

**앱 A방향 동기화 완료** — 앱 헌금입력 비활성(읽기전용), 노션 후원자 DB `헌금합계` rollup 을 REST API 로 읽어 표시(no-store 즉시반영). 검증 완료(curl $11,499.69). **다음 = 노션 자체 템플릿 개발 → 2단계 헌금이력 연도별 집계**.

---

## 이번 세션 — A방향 동기화 + UI 1단계

**A방향 = 노션이 헌금 SoT, 앱은 읽기 전용.** 커밋 4개 push 완료(`da39071`·`8c8d0eb`·`51592f5`·`e1d4a64`).

### a) 헌금입력 비활성 (`da39071`)
- `app/supporters/[id]/DonationPanel.tsx` 읽기전용 서버 컴포넌트로 재작성(입력 state·폼·CRUD 전부 제거). 마커 V2→V3.
- 기존 헌금 이력(Supabase 8건) 목록·합계는 표시 유지 + "노션 회계로 이전" 안내.

### b) 노션 합계 읽기 (`8c8d0eb`)
- **`lib/notion.ts` 신규** — `getDonationTotalsByAppId()`: 후원자 DB `헌금합계`(rollup) 를 `앱ID`(=supporters.id) 별 `Map<app_id, USD>` 로 반환. 토큰 없으면 null → 앱 합계 폴백.
- `DonationPanel` `notionTotal` prop(노션 우선, 미연동 시 앱 합계). 안내문 분기.
- `app/supporters/[id]/page.tsx` 노션 합계 로드 후 전달. `.env.example` 에 `NOTION_TOKEN`.

### 캐시 즉시반영 (`51592f5`)
- 노션 fetch `revalidate:300` → `cache:'no-store'`. 노션 입력 즉시 앱 반영(새로고침).

### UI 1단계 (`e1d4a64`)
- 후원자 목록 카드 **이름 옆 헌금 총액 삭제**(`SupportersList` totals·formatUsd 제거, 목록 `page.tsx` totals 계산 제거). 상단 통계 카드(올해 누계/이번 달)는 유지.
- 후원자 상세 **섹션 재배치**: …특이사항 → 연결된 일지 → 관계 히스토리 → 메시지 → 헌금 이력 → 수정/삭제.

### 노션 셋업 (우진 완료)
- integration "MFH App" 생성 → 토큰(`ntn_…`, `.env.local` + Vercel 환경변수).
- "MFH 회계관리 시스템" 페이지에 connection 추가 → 하위 DB(후원자·입출금기록·자산) 상속.

---

## 핵심 메커니즘 (다음 세션 필수)

**⚠️ database id ≠ data source id.** REST API `databases/{id}/query` 는 **database id** `fe45d45f-c7c0-40ce-a329-525e46a83ef3`(후원자 DB) 를 쓴다. MCP 의 `collection://96cb5d60-2cb3-424c-9296-31e9095338fc`(data source id)와 다름 — 혼동하면 404 object_not_found. (이번 세션 404 의 진짜 원인이 이거였음.)

**헌금 연동 흐름**: 노션 입출금기록 입력(후원자 relation 연결 + 금액 USD) → 후원자 DB `헌금합계` rollup 자동 → 앱이 REST 로 읽어 표시. no-store 라 즉시.

**컬럼 이름 의존**: 앱은 노션 컬럼 **이름**(`앱ID`·`헌금합계`·`후원자`·`날짜`·`금액`)으로 읽음 — 이름 바꾸면 깨짐, 순서·위치는 무관(노션 자체 템플릿 개발 시 이름만 유지).

**입출금기록 = 멀티소스 DB**(database `37c15af9…8194`, data source 2개: 입출금기록 `collection://37c15af9-28ad-817a-…` + 통계 `…812d…`). 2단계 연도별 집계 시 `data_sources/{collection}/query`(Notion-Version 2025-09-03) 검증 필요(구 `databases/{id}/query` 멀티소스 동작 미확인). 집계 컬럼: `날짜`(date)·`금액`(USD number)·`후원자`(relation)·`구분`(수입/지출).

**노션 데이터 조회**: REST API query 는 무료 플랜 토큰으로 작동(MCP `query_data_sources` 400 과 별개).

---

## 다음 세션 (우선순위)

1. **노션 자체 템플릿 개발** — ABC 가계부(통계 formula 30+, MFH 무관)를 MFH 단순 회계로(수입=후원금 / 지출=사역·생활·주거·차량·통신·의료·교육 / 이체·환전). 컬럼 이름(`앱ID`·`헌금합계`·`후원자`·`날짜`·`금액`) 유지하면 앱 연동 그대로.
2. **2단계 헌금이력 연도별 집계**(노션 템플릿 후) — `DonationPanel` 을 노션 입출금기록 연도별 합산으로 교체(Supabase 8건 개별목록 제거 → 초기기록 자동 숨김). 입출금기록 query 검증부터.
3. **상단 통계 카드 노션화** — 목록 "올해 누계/이번 달"이 아직 Supabase 기준 → 노션으로.
4. **총액 클릭 → 세부현황**(연·월·건별).
5. D3 이체·환전, 지출 입력(노션 SoT).

---

## 빌드·검증 함정

- `/supporters` 마스터 전용 로그인 → **preview 캡처 불가, `npm run build` 로 검증**.
- REST database id ≠ collection id(404 주의, 위 핵심 참조).
- 입출금기록 멀티소스 → 구 `databases/{id}/query` 동작 미검증.
- `.env*` 는 `.gitignore` → 토큰 커밋 안 됨. 로컬 `.env.local` + Vercel 환경변수 **각각** 등록(env 추가 후 redeploy 해야 반영).
- no-store: 후원자 상세 열 때마다 노션 API 1회(8명, 가벼움).
- 노션 fetch 검증 패턴: `curl -X POST .../v1/databases/fe45d45f…/query -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28"`.

---

## 백로그
1. 노션 자체 템플릿(ABC → MFH 단순) — 2단계 선행.
2. 2단계 헌금이력 연도별 집계.
3. 상단 통계 카드 노션화.
4. 총액 클릭 세부현황.
5. D3 이체·환전 / 지출 입력.
6. ABC 예시 정리(항목·자산 기본 예시 삭제).
7. **손경희 헌금 $85.74 점검** — 김영동과 동일 금액(입출금기록 row 잘못 연결 가능성, 우진 확인 요망).
8. news-update 모니터(이월) / 후원자 개별 AI 메시지(비용).

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지. `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-25 세션. 앱 A방향 동기화 완료(헌금입력 비활성 + 노션 헌금합계 rollup 읽기 + no-store 즉시반영). lib/notion.ts 신규. database id 함정(fe45d45f ≠ collection 96cb5d60) 해결. 후원자 UI 1단계(목록 총액 삭제·상세 섹션 재배치). 커밋 4개 push(da39071·8c8d0eb·51592f5·e1d4a64). 다음=노션 자체 템플릿 → 2단계 연도별 집계. 직전 v2ce → archive.*
