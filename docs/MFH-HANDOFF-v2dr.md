# MFH 핸드오프 v2dr (세션 종료)

> 이전: `v2dq`(회계 선택 과제·매시 수집, `docs/archive/`). 이번 세션(2026-10-15~16): **통독 재분배 · 공시 환율 자산 평가 · 단축어 판정(불가) · Mac 수집 launchd 10분 전환** + **위플 가계부형 회계 UI 개편 분석(다음 세션 착수)**. 앱 버전 **3.8.0 유지**(누적 변경 = 통독 재분배·공시 환율 평가 → 다음 "버전" 때 MINOR 후보). 커밋 전부 우진 승인·푸시.

---

## 현재 위치 (한 줄)
회계 자동화·평가 체계 완료(카드 문자 10분 수집 · 공시 환율 평가). 다음 = **회계 UI 위플 가계부형 개편**(아래 결정 테이블 확정 후 a단계부터) → 10월호(MFH #2610).

---

## 이번 세션 결과

### 커밋
| 과제 | 커밋 | SQL(우진 콘솔 실행 완료) |
|---|---|---|
| 통독 「남은 기간 재분배」(목표일 유지 / 늦춤) | `889c7be` | patch113 |
| 공시 환율 `fx_rates` · 수집 스크립트 · 계좌 실보유·평가액·평가손익 표시 | `83f19a7` | patch114 |
| 단축어 최종 판정(작동 안 함) · Mac 수집 launchd 전환 문서 | `36ab6e7` | — |
| launchd 10분 간격 문서 | `f96aecb` | — |
| 이 핸드오프 | (미커밋 — 우진 승인 시) | — |

### 기능 요약
| 영역 | 내용 |
|---|---|
| 통독 재분배 | `/bible` 「밀린 분량」 옆 버튼(밀림 있을 때만) → 두 안 미리보기 → 저장. 미완료 일차의 장(이 계획에서 이미 읽은 장 `bible_chapter_reads` 제외)을 오늘(오늘 완료했으면 내일)부터 같은 배분 방식으로 재분배. 완료 일차·기록 보존. 계산 `lib/bible/plan.ts rebalanceSchedule`, 저장 rpc `rebalance_reading_plan`(SECURITY INVOKER, 미완료 삭제→insert→일차 번호 재부여 한 트랜잭션). UI `app/(app)/bible/RebalanceButton.tsx`. 실기 「성공」 |
| 공시 환율 | `fx_rates`(rate_date·currency HNL/KRW·rate=1USD당·buy/sell·source bch/koreaexim/manual, 멤버 RLS). `lib/fx.ts`(수출입은행 API `oapi.koreaexim.go.kr` 매매기준율, 비영업일 7일 역탐색 · `latestFxRates`). `scripts/fx-collect.ts`(`--hnl/--hnl-sell/--hnl-date/--hnl-url`, `--krw` 수동, 키 있으면 KRW 자동, 범위 검증) |
| 자산 평가 | `getAccountBalances` → `holdings`(계좌 통화 기준 통화별 실보유: 같은 통화=원금, 그 외·USD 계좌=금액USD) · `valueUsd`(÷공시 환율, 없으면 null→장부가) · `balanceLocal`=실보유. `BalanceGroups` 평가액 우선 + `장부 $x` 병기 + 하단 적용 환율·평가손익(미실현). 자산/부채/순자산 평가액 기준. 카드대금 상환 도우미는 장부가 유지 |

### 실데이터 메모(10/15)
- HNL 공시 10/6 매입 26.8920 / 매도 27.0265(La Prensa, BCH 인용) 저장. KRW 공시 **없음**(키 대기) → KRW 계좌는 장부가 표시.
- 카드 7697 장부 −$146.14 vs 평가 −$190.16(환율 26.5/27 혼재). 우리은행(선교) ₩2,077,338 장부 $2,652.69 — KRW 공시 들어오면 약 $1,170 하향 예상(입금 환율 1,300~1,500 혼재 + 1,350 조정).
- 통독 실데이터: 성경 1독 8일·신약 1독 12일 밀림이었음(재분배 실행 여부는 우진).

## 운용 변경 (git 밖)
- **Mac 카드 문자 수집 = launchd `com.mfh.ficohsa-collect`** — `~/Library/LaunchAgents/com.mfh.ficohsa-collect.plist`, **07:00~22:50 10분마다**(96회/일), `/usr/local/bin/node node_modules/tsx/dist/cli.mjs scripts/ficohsa-collect.ts`, 로그 `~/Library/Logs/mfh-ficohsa-collect.log`. `/usr/local/bin/node` 에 **전체 디스크 접근 권한** 부여(우진) → TCC 통과(1회 ≈ CPU 0.4초·140MB 순간). Claude 예약 작업 `ficohsa-collect-2200` 은 **중지**(삭제 아님).
- **예약 작업 `fx-rates-0730`**(「공시 환율 수집 07:30」, 매일): HNL = Claude WebSearch(BCH 인용 언론, 공시일·연도 확인, 7일 내 없으면 건너뜀) → `fx-collect.ts`. KRW 는 키 있으면 자동. 첫 실행 권한 확인 위해 **Run now 1회 권장**(미확인).
- **iPhone 단축어 "MFH 카드 수집"**: 실결제 `source=shortcut` 0건 → **작동 안 함 확정**(영문 발신자 FICOHSA 를 보낸 사람 조건으로 못 씀). 우진이 자동화 끄기. API·토큰·문서는 보존.
- **수출입은행 API 키**: 공공데이터포털(data.go.kr/data/3068846) 「활용신청」 무료·자동승인 — 우진 발급 후 `.env.local` 에 `KOREAEXIM_API_KEY=` (Vercel 불필요: 수집은 Mac, 화면은 DB 읽기).

## 다음 세션 주 과제 — 회계 UI 위플 가계부형 개편

### 위플 가계부 분석(App Store 소개 + 우진 스크린샷)
- 탭: 달력 · 예산 · 통계 · 자산 · 설정 + 떠 있는 **＋ 버튼**(어디서나 입력).
- **달력(홈)**: 상단 그달 수입 / 지출 / 수입−지출, 지출 옆 현금·카드 분리 → 월 달력 칸마다 그날 지출 합계 → 선택일 내역(카테고리 원형 아이콘 · 이름 · 금액 · 카드 표시).
- **통계**: ‹ 월 › 이동 · 지출/수입 토글 → "10월에 쓴 돈" 큰 숫자 + 도넛(가운데 "가장 큰 지출 교육 59%") → 띠(현금 · 카드 사용 · 카드대금 납부 · 저축) → 카테고리 % 막대 + 금액.
- 자산: 유형별 · 할부/구독(다음 결제일·연간 합계). 기타: 반복, 문자 자동 입력, 리포트(돈의 흐름), 환불 = 음수.
- 출처: https://apps.apple.com/KR/app/id467936485 (6.1.6, 10/7)

### 현재 MFH 회계와의 차이
| 위플 | 현재 MFH | 차이 |
|---|---|---|
| 달력 홈 | 요약(이번달 + 잔액) | 달력 화면 없음 |
| ＋ 버튼 | 「기록」 탭 | 한 단계 깊음 |
| 통계 | 분석(추이·도넛·후원자) | 현금/카드 띠·"가장 큰 지출" 강조 없음 |
| 자산 | 요약 안 잔액 그룹(+공시 평가) | 별도 탭 아님 |
| 예산 | 없음 | **이번 개편에서 제외(우진 결정)** |
| L 단일 통화 | USD 장부 + HNL/KRW 원금 | 표시 통화 결정 필요 |

### 결정 테이블(다음 세션 시작 시 확정 — 예산 제외는 확정)
| # | 결정 | 선택지 | 추천 |
|---|---|---|---|
| A | 탭 구성 | ① **달력 · 통계 · 자산 · 내역** + ＋버튼(기록 탭 제거, 승인대기 배지는 ＋ 옆) ② 현 4탭 유지 + 화면만 위플풍 | ① |
| B | 금액 표시 통화 | ① **L 기본 + USD 토글**(HNL 외는 공시 환율 환산) ② USD 기본 | ① |
| C | 색 | ① 레이아웃만 위플, **MFH 브랜드색**(카테고리만 파스텔) ② 위플 색 | ① |
| D | 예산 | — | **제외(확정)** |
| E | 단계 | a 달력 홈 + ＋버튼 + 탭 재구성 → b 통계 리디자인 → c 자산 탭 | 단계마다 실기 확인 |
- 관련 파일: `app/(app)/accounting/`(AccountingNav · page · AccountingSummary · BalanceGroups · TodayList · TransactionList · report/ReportView · charts · entry · ledger · inbox), `lib/accounting-db.ts`, `lib/accounting-types.ts`.

## 유의 사항
- 커밋은 우진 승인 후, 푸시는 "푸시"/"커밋 푸시" 명시 때만. 메인 브랜치 직접 작업.
- Supabase SQL 은 **MFH 프로젝트(ref `ocygdrwdpoytwwbsrdmp`)** 에서 실행 — 이번에 manna 프로젝트에서 실행해 `is_member` 없음 오류 1회(롤백돼 영향 없음). 아이패드·폰 작업 중엔 SQL 을 채팅 코드블록으로.
- launchd 수집은 Mac 켜짐·로그인 상태에서만. 장기 미사용 후엔 `npx tsx scripts/ficohsa-collect.ts --days 14`.
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`, `out/`.

## 다음 과제
1. **회계 UI 위플형 개편**(위 결정 테이블 A·B·C·E 확정 → a단계).
2. 공시 환율 화면 실기 확인(잔액 하단 환율·평가손익 줄) — 미보고.
3. 수출입은행 키 발급 → `.env.local` → KRW 평가 반영. `fx-rates-0730` Run now 1회.
4. **10월호(MFH #2610)**: 자료 기간 2026-10-05~. 5-에이전트 팀(`docs/MFH-LETTER-AGENTS.md`).
5. (선택) 영수증 Claude 비전 선채움 · (이월) `/bible` 진행 표시·딥링크 · `/bible/study` 무한 스크롤 · 즐겨찾기 DB 동기화 · 인사 카드 kind 토글 UI · (보류) 예산 기능.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dr.md 를 읽고 시작. 회계 UI 위플 가계부형 개편(예산 제외)부터 — 결정 테이블 A·B·C·E 확인 후 a단계(달력 홈 + ＋버튼 + 탭 재구성) 진행. 각 단계 결정 테이블로 확인 후 진행, 커밋·푸시는 내가 말할 때만.
```
