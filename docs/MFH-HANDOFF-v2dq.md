# MFH 핸드오프 v2dq (세션 종료)

> 이전: `v2dp`(회계 운용 체계 완성, `docs/archive/`). 이번 세션(2026-10-15): **회계 선택 과제 4건(④→②→①→③) 완료 + 승인대기 입구·배지 + 카드 문자 매시 수집 전환**. 앱 버전 **3.7.0 → 3.8.0**(MINOR). 커밋 `e0c7a2e`…(이 핸드오프 커밋) 전부 우진 실기 「성공」·푸시.

---

## 현재 위치 (한 줄)
**회계 자동화 마무리**(항목 관리 · 카드 자동 승인 · 영수증 · 매시 수집 + 푸시 · 홈 승인대기 입구 · 아이콘 뱃지). 다음 = **다음 실결제 때 단축어 최종 판정**(소) → **10월호(MFH #2610)**.

---

## 이번 세션 결과

### 커밋
| 과제 | 커밋 | SQL(우진 콘솔 실행 완료) |
|---|---|---|
| ④ 항목 관리(이름·대분류 수정 · ▲▼ 순서 · 숨김/보이기) | `e0c7a2e` | — |
| ② 카드 자동 승인(상점 사전 토글 · 수집기 자동 저장 · 되돌리기) | `ff87ec9` | patch110 |
| ① 영수증(폼 첨부 · 내역 📎 뷰어 · 교체/삭제 · Storage 정리) | `4269ccb` | patch111 |
| ③-a 수집 공용 모듈 `lib/ficohsa-sms.ts` · 최근 3일 재확인 · 출처 간 ±5분 중복 | `4bf09ab` | patch112 |
| ③-b 단축어 API `/api/accounting/sms-ingest` + `docs/MFH-SMS-SHORTCUT.md` | `0146868` | — |
| 승인대기 홈 입구 · 타일/기록 탭 배지 · 아이콘 뱃지 합산 | `8fe050e` | — |
| 핸드오프 · 버전 3.8.0 · 단축어 현황 문서 | (이 커밋) | — |

### 기능 요약
| 영역 | 내용 |
|---|---|
| 항목 관리 | `ItemManageButton`(기록 폼 ⚙ · 승인대기 "항목 관리"). 숨김 = `is_active=false` — 옵션엔 포함(`AcctOption.active`)해 과거 거래 이름 유지, 입력 콤보만 `activeOnly()` 로 제외 |
| 자동 승인 | `merchant_rules.auto_approve` · `card_tx_inbox.auto`. 조건 = 상점 켬 + 항목 보임 + 계좌 + HNL/USD + 금액 ≤ 그 상점 최근 승인 10건 평균×3. HNL 환율 = 마지막 SMS 승인 환율. 승인대기 "카드 자동 승인(최근 7일)" + "상점 사전" 모달(5회↑ 추천) |
| 영수증 | 비공개 `receipts` 버킷(멤버 RLS) · 경로 `YYYY/MM/<uuid>.webp` · 1600px 축소 직접 업로드(`lib/receipt.ts`) · 서명 URL 1시간. 1건 1장(`acct_inout.receipt_path`) |
| 수집 | `ingestSms()` 공용: 파싱·추천·중복(같은 출처 = sms_key, mac↔shortcut = 카드·금액·상점 ±5분 1:1)·자동 승인. `card_tx_inbox.source` = mac/shortcut |
| 푸시·뱃지 | `lib/finance-push.ts`(재정 관리자 발송) · `lib/badge-server.ts` — **아이콘 뱃지 = 할 일 마감 도래 + 회계 승인대기(카드+반복)** 를 사용자별로, 할 일 크론·회계 푸시 모두 같은 합계. 클라이언트 `lib/badge.ts` 동일 합계, 승인/무시/되돌리기 후 `requestBadgeRefresh()` |
| 홈 | 헤더 아래 **"[N] 회계 승인대기 · 카드 a · 반복 b →"** 배너(0건 숨김) · Accounting 타일 "대기 N" · 회계 기록 탭 숫자 뱃지 |

## 운용 변경 (git 밖)
- **예약 작업 `ficohsa-collect-2200`** → 제목 "Ficohsa 카드 문자 수집(매시 07~22)", cron `0 7-22 * * *`, 프롬프트 갱신. 첫 매시 실행(17:09) 실측: 15:54 결제 수집 → 푸시·뱃지·홈 배너 「성공」.
- **`.env.local`**: `MFH_APP_URL=https://mfh-snowy.vercel.app` + `CRON_SECRET`(새로 생성, Vercel 값도 교체·재배포 — 할 일 푸시 크론도 같은 값 사용). 이전엔 둘 다 없어 Mac 수집 푸시가 한 번도 안 갔었음.
- **Vercel 환경변수 `SMS_INGEST_TOKEN`** 추가(단축어용). 실서버 dry 테스트 200.

## iPhone 단축어 현황 (판정 대기)
- 자동화 "MFH 카드 수집"(메시지 수신 · 보낸 사람 = 번호 없는 'FICOHSA' 연락처 · 내용 `FICO: Transaccion` → 날짜 포맷 ISO 8601 → URL 콘텐츠 가져오기 POST JSON `{text, received_at}`).
- 실결제(15:54)에 **실행 안 됨**. 대조 테스트(보낸 사람 = 진아, 같은 형식 문자) → **정상 실행**. 유력 원인 = 영문 발신자 `FICOHSA` 가 연락처와 연결되지 않는 iOS 제약(전화번호 칸 붙여넣기도 연결 안 됨 확인). 단, 같은 시기 날짜 블록에 `현재날짜` 를 글자로 넣은 오류도 있었음(편집기 실행은 서버 도달 → 원인 아닐 가능성 높음).
- **다음 실결제 때 판정**: `card_tx_inbox.source` 가 `shortcut` 이면 단축어 동작(매시 수집은 백업), `mac` 이면 보낸 사람 원인 확정 → 자동화 끔. 확인 스크립트 예: 오늘 생성 행의 `source` 조회(서비스 롤, 읽기 전용).

## 유의 사항
- 커밋은 우진 승인 후, 푸시는 "푸시"/"커밋 푸시" 명시 때만. 메인 브랜치 직접 작업.
- 매시 수집은 Mac 이 켜져 있고 메시지가 동기화될 때만 동작. 밤(22시 이후) 결제는 다음 날 07:00 수집. Mac 장기 미사용 후엔 `npx tsx scripts/ficohsa-collect.ts --days 14`.
- 예약 작업은 실행마다 Claude 세션 1회(하루 16회) — 사용량이 부담되면 주기 조정.
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`, `out/`.

## 다음 과제
1. **단축어 최종 판정**(위) — 다음 Ficohsa 결제 후 "결제함" → source 확인.
2. **10월호(MFH #2610)**: 자료 기간 2026-10-05~. 5-에이전트 팀(`docs/MFH-LETTER-AGENTS.md`).
3. (선택) ① b단계: 영수증 Claude 비전으로 금액·상점·날짜 선채움.
4. (이월) `/bible` 진행 표시·딥링크 · `/bible/study` 무한 스크롤 · 즐겨찾기 DB 동기화 · 인사 카드 kind 토글 UI.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dq.md 를 읽고 시작. 먼저 단축어 판정(최근 Ficohsa 결제의 card_tx_inbox.source 확인)부터 하고, 이어서 10월호(MFH #2610) 선교편지를 5-에이전트 팀으로 진행. 각 단계 결정 테이블로 확인 후 진행, 커밋·푸시는 내가 말할 때만.
```
