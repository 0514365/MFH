# MFH 핸드오프 v2do (세션 종료)

> 이전: `v2dn`(3단 셸 a~e · 3.7.0). 이번 세션(2026-10-14): **회계 SoT 노션 → Supabase 이전** + **Ficohsa 카드 문자 자동 수집·승인대기 인박스** + 신용카드 계좌·이체 + 구매처/적요 분리·학습 + 항목 즉석 추가 + 일괄 입력·통합 수정 확장. 설계 정본 = `docs/MFH-CARD-SMS-INBOX-DESIGN.md`(§0~§6). 커밋 `a0d390d`…`b40186d` 10건, 전부 우진 실기 「성공」.

---

## 현재 위치 (한 줄)
**회계 모듈이 Supabase 단일 SoT + 카드 문자 자동화로 전환 완료·배포·실기 성공.** 다음 = 버전 제안(셸 3.8.0 후보에 회계 자동화가 더해져 MINOR 유지 또는 MAJOR 검토 — 우진이 「버전」 꺼낼 때) → 10월호(MFH #2610).

---

## 이번 세션 결과

### 데이터 (Supabase — 우진이 콘솔 실행 완료)
| 패치 | 내용 |
|---|---|
| patch102 | `acct_items`(항목 27) · `acct_accounts`(계좌) · `acct_inout`(거래 399 이관, 노션 합계·잔액 일치). RLS 부부 2인(is_member) |
| patch103 | `card_tx_inbox`(승인대기, `sms_key` unique) · `merchant_rules`(상점 사전: 항목·적요·구매처·계좌 학습) |
| patch104 | 신용카드 계좌 `Ficohsa 신용카드 4956`/`7697`(HNL, 유형 신용카드) · `acct_accounts.card_last4` · 구분 `이체` + `to_account_id` · `item_id` null(이체) |
| patch105 | `acct_inout.vendor`(구매처) — 적요(name)와 분리 |
| patch106 | `merchant_rules.vendor` · `card_tx_inbox.suggested_vendor` |

- 노션 장부는 **읽기전용 백업**으로 보존. `lib/notion.ts`·`supporters/actions.ts`(노션 미러) 삭제. `NOTION_TOKEN` 은 `scripts/accounting-migrate-notion.ts` 에서만.
- 카드: **4956·7697 = 신용카드**(상환은 `Ficohsa(달러)` 에서 **이체**), **3070 = Ficohsa(달러) 직불**(문자 알림 없음), 1568 = 2025-04 까지 쓴 옛 카드.

### 코드
| 블록 | 결과 |
|---|---|
| 데이터 계층 | `lib/accounting-types.ts` V1 · `lib/accounting-db.ts` V4(노션과 동일 시그니처, 이체 잔액, 통합 수정 확장, `createItem`) · `lib/card-inbox-db.ts` V3(대기 조회 = 사전 실시간 우선, 승인=장부 저장+학습, 무시) |
| 수집 | `scripts/ficohsa-collect.ts` V2 — chat.db(sqlite3 -json) → 정규식 → `card_tx_inbox` upsert(sms_key = 카드4-일시-원금). 계좌 = card_last4 → 사전 → 통화 기본. HNL/USD/KRW. `scripts/ficohsa-seed-rules.ts`(시드 56) · `scripts/accounting-migrate-notion.ts`(수동 upsert) |
| 스케줄 | **Claude 데스크탑 예약 작업 `ficohsa-collect-2200`**(매일 22:00). launchd 는 `~/Library/CloudStorage`·chat.db TCC 거부(실측)로 불가 |
| 앱 | `/accounting/inbox`(`InboxView` V6: 구매처 필터·검색·정렬, 다중선택 일괄 입력, 선택 승인/무시, 구매처·적요 추천, KRW 환율, 항목 즉석 추가) · `InboxBanner`(기록 탭) · `ItemAddButton`(항목 추가 모달) · `AccountingForm` V5(이체·구매처) · `TransactionList` V6(이체·구매처·통합 수정 날짜/적요/구매처/환율/후원자) · `TodayList` V2 · `AccountingTitle`/`AccountingNav`(inbox) · `/api/accounting/inbox-notify`(웹푸시, `MFH_APP_URL`+`CRON_SECRET` 있을 때만) |
| 문서 | `docs/MFH-CARD-SMS-INBOX-DESIGN.md`(설계·결정 전부). `MFH-ACCOUNTING-DESIGN.md`(노션 A안)는 역사 문서 |

## 유의 사항
- 승인대기 125건(2026-09-01~) 적재됨 — 우진이 승인 진행 중. 승인 때마다 상점 사전 학습 → 같은 상점의 다른 대기 행에 즉시 반영.
- 카드대금 상환: 기록 탭 **이체** `Ficohsa(달러)` → `Ficohsa 신용카드 NNNN`. 환차는 월 1회 `환차익`/`수수료` 1건으로 카드 계좌 0 맞춤.
- 예약 작업 첫 실행 때 Bash 승인이 뜰 수 있음 → Mac 앞에서 "Run now" 1회 권장. Mac 꺼져 있으면 Claude 앱 다음 실행 시 수행.
- `.env.local` 에 `MFH_APP_URL`·`CRON_SECRET` 없으면 수집 후 푸시 알림은 조용히 생략.
- chat.db 2026-02~08 거래 문자 공백(동기화 누락 추정) — 범위 밖.
- 항목 수정·숨김 UI 없음(추가만). 필요 시 Supabase 콘솔.
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.

## 다음 과제
1. 버전: 우진이 「버전」 꺼낼 때 제안(셸 + 회계 자동화 누적).
2. 회계 후속(선택): 항목 관리(수정·숨김) · 영수증 업로드(`receipt_path`) · 신용카드 자동 승인(hit_count 기준, 설계 §4) · iOS 단축어 실시간 수집.
3. **10월호(MFH #2610)**: 자료 기간 2026-10-05~.
4. (이월) `/bible` 진행 표시·딥링크 · `/bible/study` 무한 스크롤 · 즐겨찾기 DB 동기화 · 인사 카드 kind 토글 UI.
