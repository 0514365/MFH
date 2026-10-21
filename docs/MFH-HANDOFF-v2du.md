# MFH 핸드오프 v2du (세션 종료)

> 이전: `v2dt`(삼성카드 7092·청구 주기·모바일 회계 네비·QuickEntry, `docs/archive/`). 이번 세션(2026-10-21): **회계 검색 화면(위플형)** · **공용 검색 필터(SearchFilters)** · **내역 탭 검색 UI 차용**. 앱 버전 **3.8.0 유지**(v2dr 이후 누적 → 다음 "버전" 때 MINOR 3.9.0 후보). 커밋 전부 우진 실기 「성공」·푸시. SQL 없음.

---

## 현재 위치 (한 줄)
회계 검색·내역 필터 = 위플형 통일 완료. 다음 세션 = **전체 디자인 컨셉 개선**(우진 지정) → 그 뒤 10월 마감(11/3)·10월호(MFH #2610).

---

## 이번 세션 결과

### 커밋 (v2dt `12d3a5a` 이후)
| 과제 | 커밋 |
|---|---|
| 회계 검색 a — 달력 헤더 🔍 + `/accounting/search`(검색어·기간·구분·요약·결과·정렬) | `82f9d66` |
| 검색 b — 항목·계좌 바텀시트(다중선택) · 더 보기(사용자·금액) · 최근 검색어 · 🔍 헤더 왼쪽 | `7a2a151` |
| 공용 `SearchFilters.tsx` 분리 · 내역 탭 검색창·기간 칩·구분 칩·정렬 토글 | `8611901` |
| 내역 탭 항목·계좌 시트 · 더 보기(분류·통화·사용자·금액 원금) — 드롭다운 4개 제거 | `1ec5c4b` |

### 회계 검색 화면 (`app/(app)/accounting/search/`)
| 항목 | 내용 |
|---|---|
| 진입 | 달력(`/accounting`) 헤더 왼쪽 🔍(`HeaderSearchLink`, 모든 폭, ‹ 옆) |
| 형태 | 모바일 = 전체 화면 fixed z-50(헤더·탭바 덮음, 「검색」·L/$·✕=뒤로) · md 이상 = 일반 페이지(셸 타이틀 「검색」) |
| 검색어 | 내용·구매처·항목명 부분 일치 + 숫자면 원금·USD 금액 포함 · 200ms 디바운스(버튼 없음) · 최근 검색어 5개(localStorage `mfh-acct-search-recent`, Enter·행 탭 때 저장) |
| 필터 | 기간(전체·이번 주 일~토·이번 달·지정) · 구분(전체·수입·지출·이체) · 항목 시트 · 계좌 시트(이체는 출금·입금 중 하나) · 더 보기: 사용자(계좌 `info` 에 우진/진아 포함) · 금액(표시 통화 L/$ 기준) |
| 결과 | 총 n건 · 금액순/날짜순(다시 누르면 방향) · 수입/지출 요약(이체·조정 제외) · 행 = 날짜·CatIcon·내용·금액·카드 → 탭 = 수정 · 200건씩 더 보기 |
| 상태 | URL `?q·p·from·to·g·items·acc·u·min·max`(replaceState) → 수정 후 뒤로 오면 복원 |

### 공용 `app/(app)/accounting/SearchFilters.tsx`
`SearchInput` · `FilterRow` · `ChipRow` · `PeriodFilter` · `SortToggle` · `PickRow` · `MoreToggle` · `AmountRange` · `Sheet` · `ItemSheet` · `AccountSheet` · `rangeOf` · `matchText` · `useToday` · `useRecentQueries`. 라벨 폭 `w-12` + 들여쓰기 `pl-14` 기준.

### 내역 탭 (`TransactionList` V18)
- 위 = 검색창(최근 검색어 공유) → 기간 칩 → 구분 칩(조정 포함) → 항목 › / 계좌 › + 더 보기(분류·통화 L·$·₩·사용자·금액 **원금** 기준).
- 건수 줄: ☐ 거래 내역 n건 · 필터 초기화 · 금액순/날짜순(모바일).
- 딥링크 `?gubun·cat·item·from·to·q·account` 유지(from/to → 기간 「지정」, cat → 더 보기 펼침, item·account → 1개 선택).
- `ledger/page.tsx` 가 `getAccountBalances` 로 `accountInfo`(id·info·kind) 전달.
- 월별 그룹·소계·일괄 수정·삭제·영수증 📎 은 그대로.

## 운용 (git 밖)
- v2dt 와 동일: `fx-rates-0730` 예약 작업 · launchd 카드 문자 수집 · Dropbox dataless 점검.
- 이번 세션은 클라우드 세션(main 직접 커밋·푸시). 빌드 검증 = `npx tsc --noEmit` + `npm run build`.

## 유의 사항
- 커밋은 우진 승인 후, 푸시는 "푸시" 명시 때만. 메인 브랜치 직접 작업.
- 미커밋 잔여물(로컬 Mac, 그대로): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.
- Supabase SQL 은 MFH 프로젝트(ref `ocygdrwdpoytwwbsrdmp`). 폰 작업 중엔 SQL 을 채팅 코드블록으로.
- Tailwind 색은 CSS 변수라 `bg-primary/10` 같은 투명도 표기 불가 → `bg-primary-soft` 등 토큰 사용.

## 다음 과제
0. **전체 디자인 컨셉 개선**(우진 지정, 다음 세션) — 앱 전반(홈 4모듈·회계·포트폴리오)의 시각 언어 통일. 시작 시 현황 진단(팔레트 `lib/palette.ts`·`globals.css` 토큰·타이포 Montserrat/Pretendard·카드/칩/헤더 패턴 화면별 차이) → 컨셉 2~3안(결정 테이블·목업) → 승인 후 단계 적용.
1. 11/3 이후 10월 마감 확인(`fx_closings` 2026-10) · `fx-rates-0730` HNL 저장 여부.
2. 11/13·11/15 카드 명세서와 달력 「카드대금」 대조 → 차이는 「잔액」으로 정리.
3. **10월호(MFH #2610)** — 5-에이전트 팀(`docs/MFH-LETTER-AGENTS.md`), 11월 초 착수.
4. (선택) 자산 추이 그래프 · 영수증 비전 선채움 · `/bible` 이월 과제.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2du.md 를 읽고 시작. 전체 디자인 컨셉 개선 — 먼저 현재 화면별 디자인 현황을 진단하고 컨셉 2~3안을 결정 테이블·목업으로 제안. 각 변경은 승인 후 진행, 커밋·푸시는 내가 말할 때만.
```
