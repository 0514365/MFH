# MFH 회계 — Supabase 장부 이전 + Ficohsa 카드 문자 자동 수집·승인 설계

> 작성 2026-10-14. 결정: **회계 SoT 를 노션 → Supabase 로 이전(a)** 한 뒤, **Mac 메시지(chat.db)의 Ficohsa 카드 거래 문자를 매일 22:00 수집 → 앱 승인대기 → 승인 시 장부 저장(b)**.
> 관련: `docs/MFH-ACCOUNTING-DESIGN.md`(노션 A안, 2026-06 — 본 문서로 대체) · `docs/MFH-ACCOUNTING-REDESIGN.md`(4탭 구조, 유지) · `lib/notion.ts`(이전 후 마이그레이션 전용).

---

## 0. 왜 바꾸나

- 2026-06 노션 A안의 이유(노션=SoT·앱 미완 대비·노션 네이티브 CSV/영수증·후원자 연계)는 앱이 요약·기록·내역·분석·CSV·수정삭제·계좌를 모두 갖추면서 대부분 해소.
- 노션 장부 현황: 수입 387 · 지출 12 · 영수증 첨부 0. 남은 노션 고유 가치 = 직접 셀 편집 정도. 비용 = API 지연·컬럼명 결합·두 시스템 유지.
- 후원자는 이미 Supabase → 장부도 Supabase 면 후원자 연결이 FK 로 단순화되고, 승인대기 인박스(b)와 같은 DB.

## 1. 조사 결과 (Ficohsa 문자)

- `~/Library/Messages/chat.db` sqlite3 직접 읽기 가능. 발신 handle `FICOHSA`, 총 1,113건 중 **카드 거래 1,013건**(2023-12 ~).
- 형식 고정: `FICO: Transaccion TC xxxx*****4956 por HNL 3,400.00 en HDF CATERING, si no la reconoce ...`
  → 정규식 `^FICO: Transaccion TC xxxx\*+(\d{4}) por (HNL|USD) ([\d,]+\.\d{2}) en (.+?), si no la reconoce`
- 카드 끝자리 3종: 1568 · 4956 · 7697. 통화 HNL 대부분, USD 29건.
- 거래 외 문자(프로모션)는 패턴 불일치로 자동 제외.
- ⚠ 2026-02~08 거래 문자 공백(1월 3건 → 9월 95건). 문자 전달 동기화 누락 추정 — 시작 기준일 2026-09-01 이면 영향 없음.

## 2. 단계 a — Supabase 장부 이전

> ✅ **2026-10-14 완료.** patch102 적용 → 이관(항목 27 · 계좌 4 · 거래 399, 후원자 연결 373, 빈 거래 1 제외) → USD 합계(수입 126,097.90 / 지출 12,716.21)·계좌 잔액 4건 노션과 일치. `lib/notion.ts`·`supporters/actions.ts` 삭제.
> 메모: `notion_id` 부분 unique 인덱스(where not null)는 PostgREST `upsert(onConflict)` 와 맞지 않아 스크립트가 "기존 조회 → insert/update" 로 처리한다.

### a-1. 스키마 `supabase/patch102-accounting.sql` (멱등)

| 테이블 | 핵심 컬럼 | 메모 |
|---|---|---|
| `acct_items` | id · user_id · gubun(수입/지출) · name · category(대분류) · description · sort_order · is_active · notion_id | 항목 DB 27행 이관. (gubun,name) unique |
| `acct_accounts` | id · user_id · name · currency(KRW/USD/HNL) · info(계좌정보) · kind(유형) · initial_usd · adjust_usd · is_favorite · is_active · notion_id | 자산 DB 4행 이관 |
| `acct_inout` | id · user_id · gubun · date · item_id→acct_items · name · currency · principal · rate · amount_usd · account_id→acct_accounts(null) · supporter_id→supporters(null) · receipt_path(null) · source(manual/csv/sms) · notion_id(unique, null) · created_at · updated_at | 입출금기록 399행 이관(빈 거래 2 · 구분 기타 1 제외) |

- RLS: patch101 패턴 — SELECT/INSERT/UPDATE/DELETE 모두 `public.is_member(auth.uid())`(부부 2인). INSERT 는 `user_id = auth.uid()` 추가.
- 인덱스: inout(date desc) · inout(item_id) · inout(account_id) · inout(supporter_id) · inout(notion_id) unique.
- 계좌 잔액 = `initial_usd + adjust_usd + Σ수입 amount_usd − Σ지출 amount_usd`(앱에서 계산, 노션 formula 대체).

### a-2. 데이터 계층 `lib/accounting-db.ts` (노션 함수와 **동일 시그니처**)

| 함수 | 기존(notion.ts) | 비고 |
|---|---|---|
| `getAcctOptions` / `getAccountBalances` / `getRecentInout` | 동일 | supabase-server 클라이언트(RLS) |
| `createInoutRecord` / `updateInoutRecord` / `deleteInoutRecord` / `patchInoutFields` / `createAccount` | 동일 | 노션 rate limit 순차 호출 → 배열 insert 가능 |
| `getDonationsByAppId` / `getSupporterDonationTotals` | 동일 | `supporter_id` FK 집계(앱ID 매핑 불필요) |
| 타입 `AcctOption·AcctOptions·InoutInput·InoutRow·InoutPatch·AccountInput·AccountBalance·DonationYearly` | notion.ts | `lib/accounting-types.ts` 로 이동 |

- 16개 파일의 `from '@/lib/notion'` → `from '@/lib/accounting-db'`/`accounting-types` 치환. 화면 로직 변경 없음.
- `accounting/actions.ts`·`supporters/actions.ts`: 노션 호출 교체. `syncSupporter`/`unsyncSupporter`(후원자 노션 미러) 제거 — `SupporterForm.tsx`·`DeleteButton.tsx` 호출부 정리.
- "노션 회계 연동이 필요합니다(NOTION_TOKEN)" 폴백 문구 제거.

### a-3. 마이그레이션 `scripts/accounting-migrate-notion.ts`

- 노션 read(항목·자산·입출금·후원자 앱ID 맵) → service role 로 Supabase upsert(`notion_id` 기준, 재실행 안전).
- 후원자: 노션 후원자 page id → `앱ID` → `supporters.id`. 매핑 실패 건은 리포트에 나열.
- 종료 시 건수 리포트(항목/계좌/수입/지출/후원자연결/제외). 노션은 **삭제하지 않고 읽기전용 백업**으로 보존. `NOTION_TOKEN` 은 이 스크립트에서만 사용.

### a-4. 검증

- `npx tsc --noEmit` → `npm run build` → 배포 → 요약 잔액·내역 건수·후원자 헌금 합계가 노션과 일치하는지 우진 실기 확인.

## 3. 단계 b — 카드 문자 수집 + 승인대기

> ✅ **2026-10-14 구현.** patch103 적용 → 상점 사전 시드 56건(`scripts/ficohsa-seed-rules.ts`) → 첫 수집 125건(2026-09-01~, 추천 104 · 새 상점 21) → `/accounting/inbox` + 기록 탭 배너 + `/api/accounting/inbox-notify`(웹푸시).
> **수집 스케줄은 launchd 가 아니라 Claude 데스크탑 예약 작업 `ficohsa-collect-2200`(매일 22:00)** — launchd 가 띄운 프로세스는 `~/Library/CloudStorage`(Dropbox)·`chat.db` 접근이 TCC 로 거부됨(`Operation not permitted`, 실측). 기존 insight/news/qt 루틴과 같은 방식. Mac 이 꺼져 있으면 Claude 앱 다음 실행 시 수행.
> `sms_key` = `카드끝4-YYYYMMDDHHMMSS-원금` (같은 초에 같은 카드 2건 — 학비 분할 등 — 실측 2쌍 있어 금액 포함). KRW 결제(해외 원화 청구)도 수집, 계좌는 미지정·환율은 앱에서 입력.

### b-1. 스키마 `supabase/patch103-card-inbox.sql`

| 테이블 | 핵심 컬럼 |
|---|---|
| `card_tx_inbox` | id · user_id · sms_key(unique, `카드끝자리-YYYYMMDDHHMMSS`) · sms_at · card_last4 · currency · principal · merchant · raw_text · status(pending/approved/ignored) · suggested_item_id · suggested_name · suggested_account_id · inout_id(승인 후) · created_at |
| `merchant_rules` | id · user_id · merchant(unique) · item_id · name(적요) · account_id · hit_count · last_used_at |

### b-2. 수집 `scripts/ficohsa-collect.ts` + 예약 작업

- chat.db 조회(마지막 수집 `sms_at` 이후) → 정규식 파싱 → `merchant_rules` 조회로 추천 채움 → `card_tx_inbox` upsert(sms_key).
- 계좌 기본값: HNL→`Ficohsa(렘피라)`, USD→`Ficohsa(달러)`(카드별 분리는 규칙으로 덮어쓰기 가능).
- ~~launchd~~ → Claude 데스크탑 예약 작업(22:00). 스크립트 자체는 규칙 기반(AI 분류 없음).
- 시작 기준일 2026-09-01. 그 이전 문자는 옵션 플래그로만 적재.

### b-3. 앱 `/accounting/inbox` (승인대기)

- 네비: 기록 탭 상단에 "승인대기 N" 배너 + 전용 화면. (5번째 탭 추가 여부는 b 단계 결정)
- 행: 일시 · 상점 · 금액(통화) · [항목 콤보(추천 선채움)] · [적요(추천)] · [계좌] · 환율(기본 26.5, 마지막 승인값 기억) · 환산 USD.
- 액션: **승인**(acct_inout insert, source=sms + merchant_rules upsert) · **무시**(status=ignored) · 다중 선택 일괄 승인(추천이 채워진 행만).
- 학습: 승인 시 입력값으로 상점 규칙 갱신 → 같은 상점 다음 거래는 그 값으로 대기.

## 4. 단계 d — 운용 전환(선택)

| 방식 | 조건 |
|---|---|
| 매일 수집 + 앱 승인(기본) | 현재 결정 |
| 완전 자동 저장 | 규칙 적중 + 일정 hit_count 이상인 상점만 자동 승인 — 사전이 쌓인 뒤 검토 |
| iOS 단축어 → 앱 API | Mac 없이 실시간 수집이 필요해질 때 |

## 5. 신용카드 계좌 + 이체 (단계 c · 2026-10-14)

- 카드 현황: **4956·7697 = 신용카드**(한 달 뒤 `Ficohsa(달러)` 계좌에서 상환) · **1568 = `Ficohsa(달러)` 직불카드**(결제 즉시 출금).
- 원칙: 카드 결제 시점 = 지출(지불계좌 = **카드 계좌**, 잔액 마이너스 = 미상환액). 상환 = **이체**(`Ficohsa(달러)` → 카드 계좌), 지출 아님(이중 계산 방지). 집계(요약·분석·후원자)는 수입·지출만.
- 스키마(`patch104-credit-cards.sql`): `acct_accounts.card_last4`(수집기 자동 연결) · 계좌 `Ficohsa 신용카드 4956`/`7697`(HNL, 유형 신용카드) · `acct_inout.gubun` 에 `이체` · `item_id` null 허용 · `to_account_id` · 정합성 check(이체 = 항목 없음 + 출금≠입금). 기존 승인분·대기 추천계좌를 카드 끝자리로 보정.
- 앱: 기록 폼 구분 `수입·지출·이체`(이체 = 출금계좌 → 입금계좌, 항목 숨김) · 내역 필터·표시 · 잔액 = 수입 + / 지출 − / 이체 출금 − 입금 +.
- 수집기: `card_last4` 1순위 → 상점 사전 계좌 → 통화 기본계좌.
- 환차: 렘피라 결제(26.5 환산) 합계와 실제 달러 출금액 차이는 카드 계좌 잔액에 남음 → 월 1회 `환차익`(수입)/`수수료`(지출) 1건으로 0 맞춤.

## 6. 결정 기록

| 날짜 | 결정 |
|---|---|
| 2026-10-14 | 신용카드(4956·7697)는 별도 부채 계좌 + 상환은 이체(c). 1568 직불 = Ficohsa(달러). |
| 2026-10-14 | 장부 저장소 Supabase 이전(a) → 인박스(b) 순. 수집 매일 22:00(Claude 예약 작업, launchd 는 TCC 로 불가). 환율 기본 26.5(마지막 승인값). HNL→Ficohsa(렘피라)/USD→Ficohsa(달러), KRW 는 미지정. 시작 2026-09-01. 노션 장부는 읽기전용 백업 보존. 인박스 진입 = 기록 탭 배너. |
