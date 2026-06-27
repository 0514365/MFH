# MFH 핸드오프 v2cj (세션 종료)

> 이전: `v2ci`(회계 모듈 강화 + 회계 브랜치 재설계 **계획**). 이번 세션: **회계 브랜치 재설계 구현 완료(단계 a~e)** + 실기 피드백 반영(헤더 내비·리스트 의미·모바일 카드·입력 폼). 앱 버전 **3.4.0 유지** — 버전업은 **후원자관리도 동일 패턴으로 분리한 뒤 묶어서 MINOR(3.5.0)** 로(우진 결정).

---

## 현재 위치 (한 줄)
**회계 = 전용 layout + 4탭 브랜치(요약·기록·내역·분석) 재설계 완료·배포.** 다음 = **후원자관리 페이지를 회계와 동일 패턴으로 분리**(전용 layout + 네비).

---

## 이번 세션 작업 (모두 main push·배포, 커밋 4d6b71f~fb545f7)

### 회계 브랜치 재설계 — 단계 a~e
- **a 골격**(`4d6b71f`): `app/accounting/layout.tsx`(마스터 가드 + 공통 헤더 + 4탭 하단 네비 `AccountingNav`). 전역 `BottomNav` 는 `/accounting` 하위 숨김(`HIDDEN_PREFIXES`). 하위 페이지는 셸 없이 콘텐츠만 반환.
- **b·c 요약·기록**(`2acb46f`): `/accounting` = 요약 대시보드(이번달·잔액·Today·빠른이동). `/accounting/entry` = CsvImport + AccountingForm(입력 폼 분리 이동).
- **d 내역·편집흐름**(`cb046e2`): `/accounting/ledger` = 전체 거래(`LedgerView`→`TransactionList`). **행 클릭/수정 → `/accounting/entry?edit=<id>`** 이동(AccountingForm 이 쿼리 읽어 폼 프리필, ref 가드 1회). TransactionList 필터 **대분류·통화·기간(date range)** 추가.
- **e 분석 차트**(`248f014`): `ReportView` 에 **경량 SVG 월별/연도별 수입·지출 추이**(의존성 없음).

### 실기 피드백 반영
- **헤더 내비**(`6ccee76`): 경로별 중앙 타이틀(`AccountingTitle`: 회계관리/기록/거래내역/분석) + 우측 **메인홈·후원자관리** 아이콘 링크. 요약에 분석 버튼 추가. CSV 버튼 우측 정렬.
- **입력 폼**(`edc1755`): 날짜 **yyyy-mm-dd 고정 표시**(투명 네이티브 date 오버레이 + showPicker, OS 로캘 무관), 환율 **천단위 쉼표**(raw 저장).
- **리스트 의미 정리**(`91ced82`): 요약 하단 = **Today(거래일 오늘)**, 없으면 "오늘 거래내역 없음". 기록 하단 = **Recent(입력일순 5건, `created_time`)**, 행 클릭→폼 수정, 수정·삭제 버튼 제거, 수정 중엔 숨김. `InoutRow.createdTime` 추가(`NotionPage.created_time`).
- **Today UTC 버그**(`8dd9b45`): 요약 Today 를 서버(`new Date()`=UTC)에서 계산 → 클라이언트 `TodayList`(브라우저 로컬 `todayLocal`)로 분리. 입력 날짜 기준과 일치.
- **내역 행 클릭·모바일 카드**(`a81aaa5`·`fb545f7`): 거래내역 행 클릭→수정(수정 버튼 제거), 모바일 카드 **좌(내용)·우(금액+삭제) 2열** 압축(빈 버튼 행 제거).

---

## 핵심 메커니즘 (다음 세션 필수)

**회계 브랜치 구조**: `app/accounting/layout.tsx` 가 가드+헤더+`AccountingNav`(4탭) 셸. 하위 페이지(`page.tsx`=요약·`entry/`·`ledger/`·`report/`)는 콘텐츠만. 타이틀은 `AccountingTitle`(pathname→섹션명, 절대 중앙). 전역 BottomNav 는 `HIDDEN_PREFIXES`(`/login`·`/p`·`/accounting`)로 숨김.

**페이지 간 편집 흐름**: 내역(`/accounting/ledger`) 행 클릭 → `LedgerView` 가 `router.push('/accounting/entry?edit=<id>')`. 기록의 `AccountingForm` 이 `useSearchParams().get('edit')` 로 해당 거래를 full `recent` 에서 찾아 `startEdit`(ref 가드 1회). 기록 자체 목록은 입력 모드일 때만 노출.

**날짜/통화 기준**: 입력·표시 모두 **브라우저 로컬**(`todayLocal`). 서버 컴포넌트에서 `new Date()` 로 '오늘' 판정 금지(Vercel UTC). 요약 Today 는 `TodayList`(client) 가 처리.

**파일 지도(회계)**: `layout.tsx`·`AccountingNav.tsx`·`AccountingTitle.tsx` / `page.tsx`(요약)+`TodayList.tsx` / `entry/page.tsx`+`AccountingForm.tsx`+`CsvImport.tsx` / `ledger/page.tsx`+`LedgerView.tsx`+`TransactionList.tsx` / `report/page.tsx`+`ReportView.tsx`. `lib/notion.ts`(InoutRow.createdTime).

**SoT·노션 ID**: v2ci 와 동일(회계=노션 단방향 자동, 후원자=앱 SoT 노션 미러). 노션 DB id: 입출금 `37c15af9-28ad-817b-94da-c05e3f2e7e3a` · 항목 `37c15af9-28ad-811c-b32f-c7878db9b51f` · 자산 `37c15af9-28ad-81eb-a392-ce9226dcdbc7` · 후원자 `fe45d45f-c7c0-40ce-a329-525e46a83ef3`.

---

## 다음 작업 — 후원자관리 페이지 분리 (회계와 동일 패턴)
- `app/supporters/` 에 **전용 layout** + 하단 네비 + 공통 헤더(중앙 타이틀 · 우측 메인홈·회계관리 링크) 구성.
- 회계 재설계를 템플릿으로: 셸 중앙화, 전역 BottomNav `HIDDEN_PREFIXES` 에 `/supporters` 추가, 섹션 타이틀 컴포넌트.
- 후원자 화면 메뉴 구성은 시작 시 현재 `/supporters` 구조 확인 후 결정 테이블로 제안.
- **분리 완료 후 회계+후원자 묶어 버전 3.5.0(MINOR) 통합 제안.**

---

## 빌드·검증 함정 (변동 없음)
- worktree node_modules 없음 → 메인 심링크(`ln -sfn 메인/node_modules node_modules`) 후 tsc·build.
- ⚠️ **prettier 금지**(.prettierrc 없음 → 전체 오염). no-semi·single-quote.
- 회계·후원자 **마스터 가드 → preview 캡처 불가**(로그인 화면만). tsc+build+배포 후 실기로 갈음.
- 노션 write 는 curl + 메인 `.env.local` NOTION_TOKEN.
- 머지: worktree 커밋 → 메인 `merge --ff-only <branch>` → `push origin main`. (메인 작업트리에 우진의 비-회계 변경(flyers·scripts)이 있을 수 있으니 건드리지 말 것.)

---

## 백로그
1. **버전 3.5.0**: 후원자 분리 완료 후 회계+후원자 묶어 MINOR.
2. ⚠️ 손경희 후원액 `14.29`(김영동 복사 추정) — 노션 `금액` 수정 시 앱 자동 정정.
3. 후원자 개별 AI 메시지(비용).
4. 동향 루틴 모니터.
5. 분석(리포트) 추가 그래프(대분류 도넛·후원자 순위 바 등) 필요 시 강화.

---

*작성: 2026-06-27 세션. 회계 브랜치 재설계 a~e 구현 완료 + 실기 피드백(헤더내비·리스트의미·모바일카드·입력폼) 반영. 커밋 4d6b71f~fb545f7(10). 직전 v2ci→archive. 버전 3.4.0 유지(후원자 분리 후 3.5.0 통합).*
