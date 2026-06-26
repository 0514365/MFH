# MFH 회계관리 브랜치 재설계 (작업 계획)

> 작성: 2026-06-26 세션. **계획만 수립, 실제 구현은 다음 세션.**
> 결정: 메뉴 명칭 **기록·내역·분석**(+요약 대시보드), 하단 네비 **4탭 균등(A안)**.

---

## 1. 큰 그림 — 3개 메인 브랜치

앱을 세 메인 브랜치로 재편한다. 각 브랜치는 **자체 메인 페이지 + 전용 하단 네비 + (필요시) 상단 헤더 링크**를 가지며, 앱 메인 홈(`/`)이 허브(진입점).

1. **후원자관리** (`/supporters` …)
2. **일지·프로젝트·할일** (현재 전역 BottomNav 의 Log·Projects·To-Do·Insights)
3. **회계관리** (`/accounting` …) ← **이번 계획 대상**

> 후원자 브랜치도 회계와 동일 패턴으로 추후 분리.

---

## 2. 회계 브랜치 라우트 구조

| 경로 | 화면 | 메뉴명 |
|---|---|---|
| `/accounting` | **요약 대시보드** (첫 화면) | 요약 |
| `/accounting/entry` | CSV입력 + 새 내역입력 + 오늘 입력분 | 기록 |
| `/accounting/ledger` | 전체 거래내역 + 검색·필터 강화 | 내역 |
| `/accounting/report` | 리포트(그래프 강화) | 분석 |

영문 부제(옵션): 요약 Summary / 기록 Entry / 내역 Ledger / 분석 Report.

---

## 3. 전용 하단 네비 (A안 · 4탭 균등)

- 탭: **요약 · 기록 · 내역 · 분석** (균등 4탭, 활성 = accent #b61821).
- 앱 홈 복귀: **상단 헤더 ← (BackButton href="/")**.
- 구현: `app/accounting/layout.tsx` 에 회계 공통 헤더 + `AccountingNav`(하단 탭바).
- 전역 `BottomNav`: `/accounting` 하위에서 **숨김** — `HIDDEN_PREFIXES` 에 `/accounting` 추가(또는 pathname 분기).
- 탭 아이콘(Tabler 류): 요약 layout-dashboard · 기록 pencil-plus · 내역 list-details · 분석 chart-bar.

---

## 4. 화면별 구성

### 요약 `/accounting`
- 이번 달 수입/지출/순액 (`AccountingSummary` 재사용).
- 계좌별 잔액 + 총자산(Balance).
- (옵션) 최근 거래 3~5건 · 빠른 기록 바로가기.

### 기록 `/accounting/entry`
- `CsvImport` (CSV 일괄입력).
- `AccountingForm` 의 **입력 폼 부분만** (거래내역과 분리).
- 하단: **오늘 입력분만** (today 필터 거래 목록 + 행 편집).

### 내역 `/accounting/ledger`
- `TransactionList` (전체, 월별 그룹·합계).
- **검색·필터 강화**(현재 구분·항목·계좌·적요검색 → 추가): 날짜 범위, 금액 범위, 대분류/소분류, 후원자, 통화, 계좌.
- (옵션) 정렬 다양화 · 결과 CSV 내보내기.

### 분석 `/accounting/report`
- `ReportView` 기반.
- **그래프 강화**: 월별 수입/지출 추이(라인·바), 대분류 도넛/스택바, 후원자 순위 바, 계좌 잔액.
- 차트 수단 검토: 경량 직접 SVG vs recharts/chart.js (번들 무게 고려).

---

## 5. 작업 단계 (다음 세션, 단계별 빌드·배포·실기)

- **a. 골격**: `app/accounting/layout.tsx` + 4탭 하단 네비 + 전역 네비 숨김.
- **b. 요약**: `/accounting` 를 대시보드로 재구성.
- **c. 기록**: `/accounting/entry` — Csv/Form 이동 + 오늘 필터 거래.
- **d. 내역**: `/accounting/ledger` — TransactionList 이동 + 검색·필터 추가.
- **e. 분석**: 그래프 강화.

---

## 6. 기술 메모

- 현재 `/accounting/page.tsx` = `AccountingSummary` + `CsvImport` + `AccountingForm`(폼 + `TransactionList` 통합). → **분해**가 핵심.
- `AccountingForm` 은 입력 폼 + `TransactionList` 를 한 컴포넌트로 묶음(편집 상태 공유). → 기록(폼 + 오늘) / 내역(전체 TransactionList)으로 **분리** 시 편집 상태 공유 방식 재설계 필요(내역에서 수정 클릭 → 기록 화면으로 이동 등).
- 마스터 가드 유지 (회계 전체 `isMaster`). layout 에서 일괄 가드 가능.
- 노션 SoT 그대로 (입출금기록 양방향 자동).
- 컴포넌트 매핑: AccountingSummary→요약 / AccountingForm 폼→기록 / TransactionList→내역 / ReportView→분석.

---

*다음 세션: 이 문서 + `MFH-ACCOUNTING-DESIGN.md` 를 읽고 단계 a 부터 진행. 명칭·네비는 위 결정 확정.*
