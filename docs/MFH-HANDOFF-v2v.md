# MFH 핸드오프 — v2-v (2026-05-31)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT.md` + `MFH-INSIGHTS-REDESIGN.md`. 직전 = `MFH-HANDOFF-v2u.md`.

---

## 0. 한 줄 요약

**인사이트 Phase 2 — Balance(사역·가정 리듬) 집계 막대 구현·배포.** `lib/insightExport.ts` 에 `buildCategoryBreakdown`(분류별 건수·비중, 순수 함수) + `categoryColor`/`BALANCE_PALETTE`(브랜드 마룬-레드-그레이 8색). `InsightsClient.tsx` 에 `useBalance` 훅(클라 직접 집계 = **API 0·무료**) + `BalanceBar`(홈 카드 미니막대 + 상세 비중막대+범례), 기간칩(7/30/90) 연동. **부부 합산**: journal_entries RLS 가 멤버 공유라 `user_id` 필터 없이 우진+서진아 일지를 함께 집계(주석으로 의도 명시). SQL 변경 없음. 실기기 검증 성공.

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase
- 이번 세션 SQL 실행 **없음**. Balance 는 순수 클라 집계라 스키마/정책 변경 0.
- ⭐ **재확인(중요): `journal_entries`·`projects`·`tasks`·`insights` 의 SELECT RLS = `is_member(auth.uid())`** (patch73). → **`user_id` 필터를 걸지 않으면 부부(우진+서진아) 데이터가 합산**된다. Balance·insights 는 이 방침을 의도적으로 사용(두 사람 종합). "본인 기준" 아님.

### 로컬/배포·git
- 커밋 `0a7d576`(feat: Phase 2 Balance 막대) = **pushed → Vercel 배포 완료**(실기기 성공).
- 커밋 `234024f`(docs: 부부 합산 의도 주석) = **로컬만, push 보류**(주석이라 배포 영향 0). → 다음 push 시 이 핸드오프 커밋과 함께 올릴 것.
- 검증 습관: `npx tsc --noEmit` + `npm run build` 통과 후 push.

### 권한/멤버 모델 (변동 없음)
- app_members 2행(김우진 / 서진아). 일지·프로젝트·할일·insights 모두 멤버 읽기 공유 / 본인 쓰기.

---

## 2. 이번 세션(v2-v) 한 일

**인사이트 재디자인 — Phase 2 (Balance, 배포 완료)**
- `lib/insightExport.ts` 확장:
  - 타입 `CategoryStat`/`CategoryBreakdown`, 상수 `UNCATEGORIZED`('미분류').
  - `buildCategoryBreakdown(categories[])` — 빈/공백 → '미분류'로 묶고 건수 내림차순 + ratio.
  - `BALANCE_PALETTE`(8색) + `categoryColor(name)` — 시드 분류는 `JOURNAL_CATEGORIES` 인덱스 고정, 동적 분류는 이름 해시로 안정 배정.
- `app/insights/InsightsClient.tsx`:
  - `useBalance(days, enabled)` — supabase-browser 로 `journal_entries.category`(entry_date 기간필터) 조회 → 집계. enabled 가드로 balance 일 때만.
  - `BalanceBar`(span+`w-full` 기반 — 홈 카드 button 내부에서도 div-in-span 회피) / `BalanceSection`(막대 + 범례: 분류·건수·%).
  - LensDetail balance 분기(기간칩 `days` 공유 → 기간 바꾸면 막대 갱신). 홈 Balance 카드 미니막대(`bundleDays` 연동).
- 분류색: 교회사역#661F20 / 방과후학교#B61821 / 선교사가정#8A3A2E / 훈련·행정#C56A60 / 긴급구호#9A6A55 / 일상#80807F / 묵상#B9928F / 미분류#D8D4D2.

### 의사결정 맥락
- 데이터 범위 = **일지만**(entry_date 기준). 할일/프로젝트는 "활동 날짜" 모호 → 후속 과제.
- 집계 위치 = **클라 직접조회**(useCategories 패턴, 새 API route 0). 기간칩과 동적 연동.
- AI 권면 = 이번엔 **막대만**(무료). 기존 AI 생성 버튼은 그대로 유지(선택).
- 색 = 분류별 **고정** 브랜드 그라데이션 + 범례(비중순 그라데이션 아님 → 분류↔색 인지 일관).
- **부부 합산** = RLS 멤버공유 + user_id 필터 없음(이미 동작). 작성자별 구분(우진 vs 서진아)은 별도 기능으로 보류.

### 교훈
- RLS 가 **멤버 공유(is_member)** 임을 잊지 말 것 — 일지/프로젝트/할일/insights 모두 부부 종합이 기본. (세션 중 한 차례 "본인 기준"으로 오인 → 정정.)
- button 안에 막대를 넣을 땐 `BalanceBar` 를 `span`+`w-full` 로(div-in-span HTML 유효성).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | **Phase 3 — Fruit** | thanks/응답 타임라인. `journal.thanks` 집계 + AI 간증 다듬기. (`MFH-INSIGHTS-REDESIGN §6-C`) |
| B | **Balance 확장** | 할일/프로젝트 분류 합산 / 작성자별(우진·서진아) 구분 / 선택적 AI 권면 버튼 |
| C | 1b — 드롭박스 준자동 | `insight_sources` 테이블 + 링크 등록 UI + 진입 시 폴링 fetch |
| D | Letter v3 | letters 연계, 3단 편지 초안 |
| E | 이월(v2t/v2u) | 영상 5건 등록 / 중보기도 스팸강화 / 방문자 카운팅 / service_role 키 회수 등 |

## 4. 열린 결정사항

- [ ] `234024f`(주석) + v2v 핸드오프 커밋 push 타이밍.
- [ ] Balance 에 **할일/프로젝트 분류 합산** 추가 여부(현재 일지만).
- [ ] Balance **작성자별 구분 표시**(우진 vs 서진아) 필요 여부.
- [ ] Balance **AI 권면** — 집계만(현재) vs 버튼 선택 AI.
- [ ] "편지에 담기" 실제 동작(현재 UI 플래그만) → v3.
- [ ] (이월) import API 에러 상세 노출 제거 / `MFH-INSIGHTS-REDESIGN §5` 의 "domain CHECK 없음"·"본인 기준" 표기 정정.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2v.md` 기준. 인사이트 **Phase 3(Fruit 타임라인)** / Balance 확장(할일·프로젝트 합산, 작성자별) / 1b(드롭박스 준자동) 중에서."
