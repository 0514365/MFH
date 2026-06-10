# MFH 핸드오프 — v2-w (2026-05-31)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT.md` + `MFH-INSIGHTS-REDESIGN.md`. 직전 = `MFH-HANDOFF-v2v.md`.

---

## 0. 한 줄 요약

**인사이트 Phase 3(Fruit) + Balance 확장(2a 작성자별 · 2b 할일/프로젝트 합산) 구현·배포.** 모두 **무료 집계**(API 0, 클라 직접조회). Fruit = `thanks`(감사·응답) 있는 일지 시간순 타임라인. Balance 2a = 일지를 `user_id` 그룹 → 합산 막대 아래 **작성자별(우진/서진아) 막대**. Balance 2b = 소스를 **일지+완료 할일+착수 프로젝트**로 확장(헤더 "활동 N건"). 세 소스 모두 RLS 멤버 공유 → 부부 합산. SQL 변경 없음. 실기기 검증 성공.

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase
- 이번 세션 SQL 실행 **없음**(전부 순수 클라 집계).
- ⭐ Balance/Fruit 가 클라에서 직접 조회하는 테이블 = `journal_entries`·`tasks`·`projects`. 모두 SELECT RLS = `is_member(auth.uid())`(patch73) → user_id 필터 없이 **부부 합산**.
- `tasks.completed_at` 컬럼 = 앱에서 사용 중(TaskCheck/TaskForm/bulkUpdate) → 존재 확실. Balance 2b 의 완료 할일 필터(`completed_at` not null + gte)가 이에 의존.

### 로컬/배포·git (이번 세션 push 완료)
- `ea18252` feat: Fruit 타임라인(Phase 3)
- `931faf7` feat: Balance 작성자별 분해(2a)
- `07f9fc6` feat: Balance 할일/프로젝트 합산(2b)
- (직전 v2v 커밋 `5fd80b3`·주석 `234024f` 도 반영됨)
- 검증 습관: `npx tsc --noEmit` + `npm run build` 통과 후 push.

---

## 2. 이번 세션(v2-w) 한 일

전부 `app/insights/InsightsClient.tsx` + `lib/insightExport.ts`(Fruit 집계 추가).

**Phase 3 — Fruit**
- `lib/insightExport.ts`: `buildFruitTimeline(rows)` — `thanks` 있는 일지만 최신→과거 정렬(순수 함수). `FruitItem`/`FruitRow` 타입.
- `useFruit` 훅(클라 직접조회, DB단 `thanks` non-null) + `FruitTimeline`(세로 점·선, 점 색 = 분류색) + `FruitSection`. LensDetail fruit 분기, 홈 Fruit 카드 "최근 감사·응답 N건".

**Balance 2a — 작성자별**
- `useBalance` 반환을 `{ all, byMember }` 로 확장. `journal_entries` 에서 `user_id` 도 조회, `getMembersMap`(lib/members)으로 이름. `PORTFOLIO_OWNER_ID`(우진) 먼저 정렬.
- `BalanceSection` 합산 막대·범례 아래 **작성자별 막대 2줄**(2명 이상일 때만). 같은 분류색.

**Balance 2b — 할일/프로젝트 합산**
- `useBalance` 가 3소스 병렬 조회: 일지(`entry_date`) + 할일(`completed_at` not null, gte) + 프로젝트(`created_at` gte). CatRow `{category,user_id}` 로 통일 후 합산·작성자별.
- 타임스탬프 소스는 미래 데이터 없어 상한 생략(gte start 만). 헤더 "일지 N건" → **"활동 N건"**.

### 의사결정 맥락
- Fruit 데이터 = `thanks`(일지엔 "응답된 prayer" 전용 플래그 없음 → thanks 가 감사·응답 겸함).
- Balance 작성자 표현 = 합산막대 + 작성자별 2줄(토글 아님). 빈 작성자 줄 생략.
- Balance 소스 = **항상 합산**(토글 없음). 할일=완료분(completed_at), 프로젝트=착수(created_at). 미완료 할일 제외.
- 모든 렌즈 집계 = 무료(API 0). AI 다듬기(Fruit 간증/Balance 권면)는 기존 AI·Manual 버튼으로 선택.

### 교훈
- 3소스 합산 시 **단위 차이**(일지=하루 기록 / 할일=작업 1개 / 프로젝트=큰 단위) 존재 → 현재는 단순 건수 합산. 의미 왜곡되면 소스 토글/가중치 재고.
- 클라 다중 테이블 집계는 `Promise.all` + `alive` 가드 + CatRow 통일이 깔끔.

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | **1b — 드롭박스 준자동** | `insight_sources` 테이블(SQL) + 링크 등록 UI + 진입 폴링 fetch. (남은 3순위) |
| B | **Letter v3** | letters 연계, 3단 편지 초안(Phase 5). Prayer+Fruit "편지에 담기" 합류. |
| C | Balance/Fruit 다듬기 | Balance 소스 토글 / AI 권면 · Fruit AI 간증 다듬기 · "편지에 담기" 실동작 |
| D | 이월(v2t~) | 영상 5건 / 중보 스팸강화 / 방문자 카운팅 / service_role 키 회수 등 |

## 4. 열린 결정사항

- [ ] Balance 소스 **토글**([전체/일지/할일/프로젝트]) 필요 여부 — 현재 항상 합산.
- [ ] Balance 3소스 **단위 차이** 보정(가중치) 필요 여부 — 현재 단순 건수.
- [ ] Balance **AI 권면** / Fruit **AI 간증 다듬기** — 집계만(현재) vs 버튼 AI.
- [ ] "편지에 담기" 실제 동작(현재 UI 플래그만) → Letter v3.
- [ ] (이월) import API 에러 상세 노출 제거 / `MFH-INSIGHTS-REDESIGN §5` "domain CHECK 없음"·"본인 기준" 표기 정정.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2w.md` 기준. **1b(드롭박스 준자동)** 또는 **Letter v3** 중에서. (Balance/Fruit AI 다듬기는 후순위.)"
