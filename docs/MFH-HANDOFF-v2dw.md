# MFH 핸드오프 v2dw (세션 종료)

> 이전: `v2dv`(2027 Minimal Block 회계 선적용 a~c-4, `docs/archive/`). 이번 세션(2026-10-21): **회계 실기 피드백 3차 반영 + 디자인 원칙 문서화**. 다른 세션 커밋(`5636fc4`·`6295005`·`896e43b`, 달력 블록 지도 제거·통계 연간 격자)도 포함된 상태 위에서 작업. 앱 버전 **3.8.0 유지**(2027 전환 누적 → 다음 "버전" 때 **MINOR `3.9.0`** 후보, 전체 앱 개정 완료 시 MAJOR 검토). 커밋 전부 빌드 통과 후 푸시, 실기 확인 「성공」.

---

## 현재 위치 (한 줄)
회계 모듈 = 2027 Minimal Block **실기 검증 완료**. 다음 세션 = **`docs/MFH-DESIGN-2027.md` 를 단일 출처로 전체 앱 디자인 개정**(토큰 승격 → 셸 → 홈 → 모듈).

---

## 이번 세션 커밋 (v2dv `943a8ea` 이후, 전부 origin/main)
| 커밋 | 내용 |
|---|---|
| `5636fc4` `6295005` `896e43b` | (다른 세션) 뒤로 화살표 빨강 · 달력 전체/지출/수입 3상태 · 블록 지도 → 카드대금 행 + 승인대기 줄 · 빠른 기록 저장 버튼 · 통계 연간 12개월 격자 |
| `460046a` | 피드백 1 — 통계 남색 면 제거 · 카드대금 연한 빨강 면 · 승인함 접힌 행(⋯ 도구) |
| `0b9af35` | 피드백 2 — 카드대금 **접힘 알약**(기기 기억 · 상환 3일 전 자동) · 통계 **도넛 + 범례** 복귀(블록·격자 제거) |
| `7f486bd` | 필터 시트 블록 — 항목 = 대분류 알약 + 블록 3열 · 계좌 = 통화별 행 + 체크 |
| `4516e98` | 피드백 3 — 시트 **72vh 고정** · 자산 그룹 면 · 내역 필터 면 · 월 머리줄 부호색 · 행 2줄(행별 삭제 제거) |
| `c9043cd` | 달력 홈 **상단 고정**(제목·승인대기·달력 sticky) + **아래로 당겨서 기록** |
| `d93ab18` | 자산 **B안**(달러 라군 · 원화 살구 · 렘피라 페리윙클) · 타이틀 알약 + 옆줄 · 당김 안내 위치 |
| `4e056a6` | 통계 **A안**(요약 면 · 종류색 막대 · 알약 제목 · 옆줄 범례 · 결제수단 3칸) · L/$ 헤더 행 |
| (이번) | 핸드오프 v2dw · **`docs/MFH-DESIGN-2027.md`** 신설 |

## 확정된 디자인 결정(요약 — 상세는 MFH-DESIGN-2027.md)
- 남색은 글자·선택용, **큰 남색 면 금지**. 터키석은 ＋·행동 버튼만.
- 블록은 **고르는 자리**(빠른 기록 ③·필터 시트)에만. 통계는 도넛 + 막대, 달력은 숫자 + 행.
- 영역 구분 = **연한 면**(연회색·통화 틴트·종류 틴트) + **타이틀 알약** + **옆줄 목록**.
- 통화 색 = 지폐 연상(달러 라군 · 원화 살구 · 렘피라 페리윙클 · 카드 살몬).
- 바텀시트 높이 고정, 접힘 상태 기기 기억, 당겨서 기록은 위에서 아래로.

## 코드 위치
- 토큰: `lib/palette.ts` `brand2027` · `blockColor/blockHalo` · `tailwind.config.ts` `b27-*` · `app/globals.css` `.theme-2027`(회계 `<main>` 에만).
- 회계: `app/(app)/accounting/` — `CalendarHome.tsx`(V24) · `QuickEntry.tsx`(V9) · `report/ReportView.tsx`(V14) · `report/charts.tsx`(`PastelDonut` 2027; `TrendChart`·`Card` 미사용 잔존) · `assets/AssetsView.tsx`(V6) · `TransactionList.tsx`(V18) · `inbox/InboxView.tsx`(V10) · `SearchFilters.tsx`(V3) · `AccountingNav.tsx`(V9) · `AccountingTitle.tsx`(V9) · `CardRepayButton.tsx`(V11) · `AccountingBack.tsx`(V3).
- 틴트 리터럴(승격 대상): `AssetsView` GROUPS.tint · `ReportView` band.tint · 종류 틴트 `#FBE1DF`/`#E1EAFB` · `CalendarHome` `#FDECEA` · `TransactionList` 월 머리줄.

## 운용 (git 밖)
- 빌드 검증: 스크래치 복사본(`scratchpad/buildcheck`, node_modules 링크)에서 `tsc` + `npm run build`. preview 는 로그인 필요 → 실기 확인.
- **Vercel 자동 배포가 늦을 때**(GitHub Outage 배너): 대시보드 **Create Deployment → main**. 빈 커밋 재푸시는 같은 웹훅이라 효과 없음. 기존 행 Redeploy 는 옛 커밋.
- 원격 `main` 이 다른 세션 커밋으로 앞설 수 있음 → 푸시 전 `git fetch` 확인(이번 세션은 전부 0).
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.

## 다음 과제
0. **전체 앱 디자인 개정** — `docs/MFH-DESIGN-2027.md` §9 순서: 토큰 승격(틴트·소프트) → `.theme-2027` 루트 승격·브릿지 정리 → 공용 셸 → 메인 홈 → 모듈(일지·프로젝트·할 일·인사이트·말씀·후원자) → 로고·스플래시·PWA 아이콘. 단계마다 미리보기 → 결정 테이블 → 승인 → 푸시.
1. 회계 잔여: `charts.tsx` 미사용 코드 제거 · 승인함 밀기 제스처(선택) · 데스크탑(md 이상) 표·폼 2027 정리.
2. 이월: 11/3 이후 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · **10월호(MFH #2610)** 11월 초 착수.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dw.md 와 docs/MFH-DESIGN-2027.md 를 읽고 시작. 2027 디자인 원칙으로 전체 앱 개정을 시작 — 먼저 토큰 승격·루트 적용 범위를 결정 테이블로 제안. 각 단계 승인 후 진행, 커밋·푸시는 내가 말할 때만.
```
