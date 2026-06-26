# MFH 핸드오프 v2ci (세션 종료)

> 이전: `v2ch`(회계 입력·목록·요약·리포트 + 후원자 앱→노션 동기화). 이번 세션: **회계 모듈 대폭 강화**(통화 자동·통화별 표시·**항목 대분류 체계**·CSV 일괄입력·적요·후원자 통계 노션 일원화·UI 정돈) + **회계 브랜치 재설계 계획 수립**. 앱 버전 **3.4.0 유지**(우진이 "버전" 꺼낼 때만 검토 — 이번 누적은 MINOR 후보).

---

## 현재 위치 (한 줄)
**회계 = 통화 자동선택·통화별 열·대분류(노션 31소분류)·CSV 일괄입력·적요·리포트 2단까지 완성**, 후원자 목록 통계 노션 일원화. 모두 main push·배포. **다음 = 회계관리 브랜치 재설계**(`docs/MFH-ACCOUNTING-REDESIGN.md` 단계 a부터).

---

## 이번 세션 작업 (모두 main push·배포)

### 회계 폼 자동화·통화 (f603676·1bf37b0·04f6064·ce357bd)
- 통화(KRW/USD/HNL) 변경 시 **매칭 계좌+기본환율**(1400/26.5/1) 자동, 수동 변경 가능. `getAcctOptions` accounts에 통화 노출.
- 거래내역 **통화별 열**(원화·렘피라·달러·환산$), 모바일 원금+환산.
- 후원자 상세 헌금카드 **통화별 입금총액**(`getDonationsByAppId` byCurrency).

### 거래내역 정돈 (fad49f2·8a29c9b)
- 헤더 중앙·확대, 계좌 열 제거. 셀 패딩 축소 + 구분/날짜 nowrap(줄바꿈 방지).

### CSV 일괄입력 (5be31de·06bbc06)
- `CsvImport.tsx` + `lib/accounting-csv.ts`: 붙여넣기/파일 → 매핑·검증 미리보기 → 일괄저장(`bulkCreateInout`). 컬럼 `구분·날짜·항목·적요·통화·금액·환율·계좌`(헤더 순서무관·별칭).
- **후원자 자동연결**: 적요에 후원자명 포함 시(부분일치, 수입 전체) 자동 매칭 → 미리보기 후원자 열 표시.

### 항목 대분류 체계 (8abd255·e6cc3f3) ⚠️ 노션 라이브 변경
- 노션 항목 DB에 **`대분류` select** 추가(후원·헌금·기타수입·사역·차량·생활·운영/행정). 기존 14항목 분류(자녀교육→자녀학비, 특별비→예비비) + **신규 17 소분류 생성 = 31개**.
- 앱: 입력 폼 항목 드롭다운 **대분류 그룹(optgroup)**, 거래내역 항목 **대분류 좌상단 첨자**, 리포트 **대분류 소계→소분류 2단**.
- 후원자 매칭을 "후원금"→**후원 대분류**로 일반화(폼 isDonation·csv·report 후원자 집계).

### 적요·후원자 (680a9c8·e404716·57273fb)
- 입력폼 **2행 레이아웃**(flex-wrap), **이름→적요** rename(폼·내역·CSV). 항목 폭↓·적요 폭↑·금액/환산↑·계좌↓.
- **후원자 연결 필드**(계좌 우측, 후원 항목 시 — 자동연결 + select 수동).
- **후원자 목록 통계 노션 일원화**: Supabase `supporter_donations` → `getSupporterDonationTotals`(노션). 최남종 교회건축헌금 $10,983 후원자 연결(노션 데이터 보정).

### CLAUDE.md 버전 규칙 (d77bc26)
- "커밋마다 제안" → **"우진이 '버전' 꺼낼 때 누적 검토 제안"**.

---

## 핵심 메커니즘 (다음 세션 필수)

**노션 항목 DB 대분류**: 항목 31개 모두 `대분류` select 지정됨. `getAcctOptions`가 category 읽음(`AcctOption.category`). 폼·내역·리포트가 대분류 표시. 후원자 매칭 기준 = 대분류 '후원'(폼/리포트), CSV는 수입 전체 부분일치.

**SoT**: 회계 = 노션 단일(양방향 자동). 후원자 = 앱 SoT, 노션 미러(단방향 앱→노션). **후원 헌금 합계·후원자 목록 통계도 노션 read로 일원화**(`getDonationsByAppId`·`getSupporterDonationTotals`). ⚠️ 후원자 편집은 반드시 앱에서.

**노션 ID**: 입출금 `37c15af9-28ad-817b-94da-c05e3f2e7e3a` · 항목 `37c15af9-28ad-811c-b32f-c7878db9b51f` · 자산 `37c15af9-28ad-81eb-a392-ce9226dcdbc7` · 후원자 `fe45d45f-c7c0-40ce-a329-525e46a83ef3`.

**파일 지도**: `app/accounting/` = AccountingForm(폼+TransactionList 통합)·TransactionList·AccountingSummary·CsvImport·actions·report/ReportView. `lib/notion.ts`(getAcctOptions category·getDonationsByAppId byCurrency·getSupporterDonationTotals)·`lib/accounting-csv.ts`.

---

## 다음 작업 — 회계 브랜치 재설계 (`docs/MFH-ACCOUNTING-REDESIGN.md`)
- 결정: 메뉴 **기록·내역·분석**+요약, 하단 네비 **4탭 균등**.
- 라우트: `/accounting`(요약)·`/entry`(기록)·`/ledger`(내역)·`/report`(분석). `app/accounting/layout.tsx` + 전역 BottomNav 숨김.
- **관건**: `AccountingForm`(폼+TransactionList 통합·편집상태 공유) **분해** → 기록(폼+오늘)·내역(전체). "내역에서 수정 클릭 → 기록 이동" 흐름 재설계.
- 단계 a(골격: layout+4탭 네비)부터.

---

## 빌드·검증 함정
- worktree node_modules 없음 → 메인 심링크(`ln -sfn 메인/node_modules node_modules`) 후 tsc·build.
- ⚠️ **prettier 쓰지 말 것**: 프로젝트 `.prettierrc` 없어 `prettier --write`가 기본설정(세미콜론·쌍따옴표)으로 전체 오염시킴. 프로젝트는 **no-semi·single-quote**. 들여쓰기는 수동, 또는 구조변경 최소화(예: 2행 레이아웃은 wrapper 추가 대신 flex-wrap+basis-full break).
- 회계·후원자 **마스터 가드 → preview 캡처 불가**(로그인 화면만). tsc+build+배포 후 실기로 갈음.
- **노션 write는 curl + 메인 `.env.local` NOTION_TOKEN 으로 가능**(auto classifier 안 막음 — 이번 세션 대분류 속성·31항목·최남종 연결 직접 write 성공). read/write 둘 다 통과. SQL query는 Business plan 제한(REST query는 OK).
- 머지: worktree 커밋 → 메인 `merge --ff-only claude/great-hamilton-d09c73` → `push origin main`.

---

## 백로그
1. ⚠️ 손경희 후원액 `14.29`(김영동 복사 추정) — 노션 `금액` 수정 시 앱 자동 정정.
2. 후원자 개별 AI 메시지(비용).
3. 동향 루틴 모니터.
4. (재설계 후) 후원자 브랜치도 동일 패턴(전용 layout+네비) 분리.
5. 분석(리포트) 그래프 강화 시 차트 수단 검토(경량 SVG vs recharts/chart.js).

---

*작성: 2026-06-26 세션. 회계 통화자동·통화별열·대분류(노션31)·CSV일괄입력·적요·후원자통계 노션일원화·UI정돈 + 회계 브랜치 재설계 계획. 커밋 668f8b0~8a29c9b(15) + 계획문서·핸드오프. 직전 v2ch→archive.*
